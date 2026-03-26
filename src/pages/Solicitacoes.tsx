import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download, Package, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Solicitacao {
  id: string;
  loja: string;
  item: string;
  tamanho: string | null;
  quantidade: number;
  quantidade_enviada: number | null;
  observacao: string | null;
  responsavel: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PENDENTE": return <Badge className="bg-[hsl(48,100%,55%)] text-[hsl(0,0%,4%)] border-0">🟡 PENDENTE</Badge>;
    case "SEPARADO": return <Badge className="bg-[hsl(217,91%,60%)] text-white border-0">🔵 SEPARADO</Badge>;
    case "ENVIADO": return <Badge className="bg-[hsl(142,71%,45%)] text-white border-0">🟢 ENVIADO</Badge>;
    case "CONFIRMADO": return <Badge className="bg-[hsl(142,71%,45%)] text-white border-0">✅ CONFIRMADO</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function Solicitacoes() {
  const { perfil } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroLoja, setFiltroLoja] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroData, setFiltroData] = useState("");
  const [verPorLoja, setVerPorLoja] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  // Enviar modal state
  const [enviarModalOpen, setEnviarModalOpen] = useState(false);
  const [enviarIds, setEnviarIds] = useState<string[]>([]);
  const [enviarQuantidades, setEnviarQuantidades] = useState<Record<string, number>>({});

  const fetchSolicitacoes = async () => {
    const { data } = await supabase.from("solicitacoes").select("*").order("created_at", { ascending: false });
    if (data) setSolicitacoes(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchSolicitacoes();
    const channel = supabase
      .channel("solicitacoes-comercial")
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitacoes" }, () => fetchSolicitacoes())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const lojas = useMemo(() => [...new Set(solicitacoes.map(s => s.loja))].sort(), [solicitacoes]);

  const filtered = useMemo(() => {
    return solicitacoes.filter(s => {
      if (filtroLoja !== "todas" && s.loja !== filtroLoja) return false;
      if (filtroStatus !== "todos" && s.status !== filtroStatus) return false;
      if (filtroData && !s.created_at.startsWith(filtroData)) return false;
      return true;
    });
  }, [solicitacoes, filtroLoja, filtroStatus, filtroData]);

  const grouped = useMemo(() => {
    const map = new Map<string, Solicitacao[]>();
    filtered.forEach(s => {
      const arr = map.get(s.loja) || [];
      arr.push(s);
      map.set(s.loja, arr);
    });
    return map;
  }, [filtered]);

  const openEnviarModal = (ids: string[]) => {
    const qtds: Record<string, number> = {};
    ids.forEach(id => {
      const sol = solicitacoes.find(s => s.id === id);
      if (sol) qtds[id] = sol.quantidade;
    });
    setEnviarIds(ids);
    setEnviarQuantidades(qtds);
    setEnviarModalOpen(true);
  };

  const confirmEnviar = async () => {
    for (const id of enviarIds) {
      const sol = solicitacoes.find(s => s.id === id);
      if (!sol) continue;
      const qtdEnviada = enviarQuantidades[id] ?? sol.quantidade;

      const { error } = await supabase.from("solicitacoes").update({
        status: "ENVIADO",
        quantidade_enviada: qtdEnviada,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) { toast.error(`Erro ao atualizar: ${error.message}`); return; }

      // Subtract from deposito
      const { data: depositoItems } = await supabase
        .from("suprimentos_deposito")
        .select("*")
        .eq("produto", sol.item)
        .eq("tamanho", sol.tamanho || "");

      let match = depositoItems?.[0];
      if (!match && !sol.tamanho) {
        const { data: nullMatch } = await supabase
          .from("suprimentos_deposito")
          .select("*")
          .eq("produto", sol.item)
          .is("tamanho", null);
        match = nullMatch?.[0];
      }

      if (match) {
        const newQtd = Math.max(0, (match as any).quantidade - qtdEnviada);
        await supabase.from("suprimentos_deposito").update({ quantidade: newQtd }).eq("id", (match as any).id);
      }
    }
    toast.success("Status atualizado para ENVIADO");
    setSelecionados(new Set());
    setEnviarModalOpen(false);
    fetchSolicitacoes();
  };

  const updateStatus = async (ids: string[], newStatus: string) => {
    if (newStatus === "ENVIADO") {
      openEnviarModal(ids);
      return;
    }
    for (const id of ids) {
      const { error } = await supabase.from("solicitacoes").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) { toast.error(`Erro ao atualizar: ${error.message}`); return; }
    }
    toast.success("Status atualizado");
    setSelecionados(new Set());
    fetchSolicitacoes();
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selecionados);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelecionados(next);
  };

  const exportPDF = () => {
    const pendentes = solicitacoes.filter(s => s.status === "PENDENTE" || s.status === "SEPARADO");
    const groupedPend = new Map<string, Solicitacao[]>();
    pendentes.forEach(s => {
      const arr = groupedPend.get(s.loja) || [];
      arr.push(s);
      groupedPend.set(s.loja, arr);
    });

    let content = "LISTA DE SEPARAÇÃO\n";
    content += `Data: ${format(new Date(), "dd/MM/yyyy")}\n`;
    content += "=".repeat(60) + "\n\n";

    groupedPend.forEach((items, loja) => {
      content += `LOJA: ${loja}\n`;
      content += "-".repeat(40) + "\n";
      items.forEach(s => {
        content += `  • ${s.item}${s.tamanho ? ` (${s.tamanho})` : ""} — Qtde: ${s.quantidade}${s.observacao ? ` — Obs: ${s.observacao}` : ""}\n`;
      });
      content += "\n";
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lista_separacao_${format(new Date(), "yyyyMMdd")}.txt`;
    a.click();
  };

  const renderTable = (items: Solicitacao[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={items.length > 0 && items.every(i => selecionados.has(i.id))}
              onCheckedChange={(checked) => {
                const next = new Set(selecionados);
                items.forEach(i => checked ? next.add(i.id) : next.delete(i.id));
                setSelecionados(next);
              }}
            />
          </TableHead>
          <TableHead>Loja</TableHead>
          <TableHead>Item</TableHead>
          <TableHead>Tamanho</TableHead>
          <TableHead>Qtde</TableHead>
          <TableHead>Qtde Enviada</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma solicitação encontrada.</TableCell></TableRow>
        ) : items.map(sol => (
          <TableRow key={sol.id}>
            <TableCell><Checkbox checked={selecionados.has(sol.id)} onCheckedChange={() => toggleSelect(sol.id)} /></TableCell>
            <TableCell className="font-medium">{sol.loja}</TableCell>
            <TableCell>{sol.item}</TableCell>
            <TableCell>{sol.tamanho || "—"}</TableCell>
            <TableCell>{sol.quantidade}</TableCell>
            <TableCell>{sol.quantidade_enviada ?? "—"}</TableCell>
            <TableCell className="text-sm">{format(new Date(sol.created_at), "dd/MM/yyyy")}</TableCell>
            <TableCell><StatusBadge status={sol.status || "PENDENTE"} /></TableCell>
            <TableCell>
              <div className="flex items-center gap-1 flex-wrap">
                {sol.status === "PENDENTE" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus([sol.id], "SEPARADO")}>Separar</Button>
                )}
                {sol.status === "SEPARADO" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus([sol.id], "ENVIADO")}>Enviar</Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Solicitações</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie as solicitações de materiais das lojas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant={verPorLoja ? "default" : "outline"} size="sm" onClick={() => setVerPorLoja(!verPorLoja)}>
            <Eye size={16} /> Ver por Loja
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <Download size={16} /> Exportar Lista de Separação
          </Button>
          {selecionados.size > 0 && (
            <>
              <Button size="sm" onClick={() => updateStatus([...selecionados], "SEPARADO")}>Marcar Selecionados: Separado</Button>
              <Button size="sm" onClick={() => updateStatus([...selecionados], "ENVIADO")}>Marcar Selecionados: Enviado</Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-48">
          <Select value={filtroLoja} onValueChange={setFiltroLoja}>
            <SelectTrigger><SelectValue placeholder="Loja" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Lojas</SelectItem>
              {lojas.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="PENDENTE">Pendente</SelectItem>
              <SelectItem value="SEPARADO">Separado</SelectItem>
              <SelectItem value="ENVIADO">Enviado</SelectItem>
              <SelectItem value="CONFIRMADO">Confirmado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} className="w-44" />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : verPorLoja ? (
        <div className="space-y-6">
          {[...grouped.entries()].map(([loja, items]) => (
            <Card key={loja}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package size={18} /> {loja}</CardTitle>
              </CardHeader>
              <CardContent>{renderTable(items)}</CardContent>
            </Card>
          ))}
          {grouped.size === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma solicitação encontrada.</p>}
        </div>
      ) : (
        <div className="rounded-lg border bg-card">{renderTable(filtered)}</div>
      )}

      {/* Modal de confirmação de envio */}
      <Dialog open={enviarModalOpen} onOpenChange={setEnviarModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Envio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Confirme a quantidade a enviar para cada item:</p>
            {enviarIds.map(id => {
              const sol = solicitacoes.find(s => s.id === id);
              if (!sol) return null;
              return (
                <div key={id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{sol.item}{sol.tamanho ? ` (${sol.tamanho})` : ""}</p>
                    <p className="text-xs text-muted-foreground">{sol.loja} — Solicitado: {sol.quantidade}</p>
                  </div>
                  <div className="w-28">
                    <Label className="text-xs">Qtde a enviar</Label>
                    <Input
                      type="number"
                      min={1}
                      max={sol.quantidade}
                      value={enviarQuantidades[id] ?? sol.quantidade}
                      onChange={e => setEnviarQuantidades(prev => ({ ...prev, [id]: parseInt(e.target.value) || 0 }))}
                      className="h-8"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnviarModalOpen(false)}>Cancelar</Button>
            <Button onClick={confirmEnviar}>Confirmar Envio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
