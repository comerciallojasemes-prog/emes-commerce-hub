import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, CheckCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EstoqueLoja {
  id: string;
  loja: string;
  produto: string;
  tamanho: string | null;
  quantidade: number;
}

interface ItemDeposito {
  id: string;
  produto: string;
  tamanho: string | null;
  quantidade: number;
}

interface Solicitacao {
  id: string;
  loja: string;
  item: string;
  tamanho: string | null;
  quantidade: number;
  observacao: string | null;
  status: string;
  created_at: string;
}

function StatusBadge({ quantidade }: { quantidade: number }) {
  if (quantidade <= 5) return <Badge className="bg-[hsl(0,84%,60%)] text-white border-0">🔴 Crítico</Badge>;
  if (quantidade <= 15) return <Badge className="bg-[hsl(48,100%,55%)] text-[hsl(0,0%,4%)] border-0">🟡 Atenção</Badge>;
  return <Badge className="bg-[hsl(142,71%,45%)] text-white border-0">🟢 OK</Badge>;
}

function SolicitacaoBadge({ status }: { status: string }) {
  switch (status) {
    case "PENDENTE": return <Badge className="bg-[hsl(48,100%,55%)] text-[hsl(0,0%,4%)] border-0">🟡 PENDENTE</Badge>;
    case "SEPARADO": return <Badge className="bg-[hsl(217,91%,60%)] text-white border-0">🔵 SEPARADO</Badge>;
    case "ENVIADO": return <Badge className="bg-[hsl(142,71%,45%)] text-white border-0">🟢 ENVIADO</Badge>;
    case "CONFIRMADO": return <Badge className="bg-[hsl(142,71%,45%)] text-white border-0">✅ CONFIRMADO</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function SuprimentosLoja() {
  const { perfil } = useAuth();
  const loja = perfil?.loja || "";

  const [estoque, setEstoque] = useState<EstoqueLoja[]>([]);
  const [itensDeposito, setItensDeposito] = useState<ItemDeposito[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedTamanho, setSelectedTamanho] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [solicitacaoLoja, setSolicitacaoLoja] = useState(loja);
  const [responsavel, setResponsavel] = useState("");

  const LOJAS = ["Loja 4", "Loja 5", "Loja 6", "Loja 7", "Loja 8", "Loja 9", "Loja 10", "Loja 11", "Loja 12", "Loja 13", "Loja 14"];

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQtd, setEditQtd] = useState("");

  const fetchAll = async () => {
    const [estoqueRes, depositoRes, solRes] = await Promise.all([
      supabase.from("suprimentos_lojas").select("*").eq("loja", loja).order("produto"),
      supabase.from("suprimentos_deposito").select("id, produto, tamanho, quantidade").order("produto"),
      supabase.from("solicitacoes").select("*").eq("loja", loja).order("created_at", { ascending: false }),
    ]);
    if (estoqueRes.data) setEstoque(estoqueRes.data);
    if (depositoRes.data) setItensDeposito(depositoRes.data);
    if (solRes.data) setSolicitacoes(solRes.data);
    setLoading(false);
  };

  useEffect(() => {
    if (!loja) return;
    fetchAll();

    const channel = supabase
      .channel("solicitacoes-loja")
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitacoes", filter: `loja=eq.${loja}` }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loja]);

  // Build unique item options (produto + tamanho)
  const itemOptions = itensDeposito.map(i => ({
    label: i.tamanho ? `${i.produto} — ${i.tamanho}` : i.produto,
    value: `${i.produto}||${i.tamanho || ""}`,
    produto: i.produto,
    tamanho: i.tamanho,
  }));

  const handleItemSelect = (val: string) => {
    setSelectedItem(val);
    const [, tam] = val.split("||");
    setSelectedTamanho(tam || "");
  };

  const handleEnviarSolicitacao = async () => {
    if (!selectedItem || !quantidade) { toast.error("Preencha item e quantidade"); return; }
    const [prod, tam] = selectedItem.split("||");
    const { error } = await supabase.from("solicitacoes").insert({
      loja,
      item: prod,
      tamanho: tam || null,
      quantidade: parseInt(quantidade),
      observacao: observacao || null,
      status: "PENDENTE",
    });
    if (error) { toast.error("Erro ao enviar solicitação"); return; }
    toast.success("Solicitação enviada!");
    setSelectedItem("");
    setSelectedTamanho("");
    setQuantidade("");
    setObservacao("");
    fetchAll();
  };

  const handleConfirmarRecebimento = async (sol: Solicitacao) => {
    // Update status to CONFIRMADO
    const { error: updateError } = await supabase.from("solicitacoes").update({ status: "CONFIRMADO", updated_at: new Date().toISOString() }).eq("id", sol.id);
    if (updateError) { toast.error("Erro ao confirmar"); return; }

    // Add to loja stock
    const existing = estoque.find(e => e.produto === sol.item && (e.tamanho || "") === (sol.tamanho || ""));
    if (existing) {
      await supabase.from("suprimentos_lojas").update({ quantidade: existing.quantidade + sol.quantidade, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("suprimentos_lojas").insert({ loja, produto: sol.item, tamanho: sol.tamanho, quantidade: sol.quantidade });
    }
    toast.success("Recebimento confirmado!");
    fetchAll();
  };

  const handleSaveQtd = async (item: EstoqueLoja) => {
    await supabase.from("suprimentos_lojas").update({ quantidade: parseInt(editQtd) || 0, updated_at: new Date().toISOString() }).eq("id", item.id);
    setEditingId(null);
    toast.success("Quantidade atualizada");
    fetchAll();
  };

  if (loading) return <p className="text-muted-foreground text-sm">Carregando...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Suprimentos — {loja}</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie o estoque da sua loja e solicite materiais</p>
      </div>

      {/* Seção 1 — Meu Estoque */}
      <Card>
        <CardHeader><CardTitle>📦 Meu Estoque</CardTitle></CardHeader>
        <CardContent>
          {estoque.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Nenhum item no estoque da loja.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estoque.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.produto}</TableCell>
                    <TableCell>{item.tamanho || "—"}</TableCell>
                    <TableCell>
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <Input type="number" value={editQtd} onChange={e => setEditQtd(e.target.value)} className="w-20 h-8" />
                          <Button size="sm" onClick={() => handleSaveQtd(item)}>OK</Button>
                        </div>
                      ) : (
                        <span className="font-semibold">{item.quantidade}</span>
                      )}
                    </TableCell>
                    <TableCell><StatusBadge quantidade={item.quantidade} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => { setEditingId(item.id); setEditQtd(String(item.quantidade)); }}>
                        <Pencil size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Seção 2 — Solicitar Material */}
      <Card>
        <CardHeader><CardTitle>📋 Solicitar Material ao Depósito</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Item</Label>
              <Select value={selectedItem} onValueChange={handleItemSelect}>
                <SelectTrigger><SelectValue placeholder="Selecione um item" /></SelectTrigger>
                <SelectContent>
                  {itemOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tamanho</Label>
              <Input value={selectedTamanho} disabled placeholder="Preenchido automaticamente" />
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Input value={observacao} onChange={e => setObservacao(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4" onClick={handleEnviarSolicitacao}><Send size={16} /> Enviar Solicitação</Button>
        </CardContent>
      </Card>

      {/* Seção 3 — Minhas Solicitações */}
      <Card>
        <CardHeader><CardTitle>📑 Minhas Solicitações</CardTitle></CardHeader>
        <CardContent>
          {solicitacoes.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Nenhuma solicitação ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Qtde</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitacoes.map(sol => (
                  <TableRow key={sol.id}>
                    <TableCell className="font-medium">{sol.item}</TableCell>
                    <TableCell>{sol.tamanho || "—"}</TableCell>
                    <TableCell>{sol.quantidade}</TableCell>
                    <TableCell className="text-sm">{format(new Date(sol.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell><SolicitacaoBadge status={sol.status || "PENDENTE"} /></TableCell>
                    <TableCell>
                      {sol.status === "ENVIADO" && (
                        <Button size="sm" variant="outline" onClick={() => handleConfirmarRecebimento(sol)}>
                          <CheckCircle size={14} /> Confirmar Recebimento
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
