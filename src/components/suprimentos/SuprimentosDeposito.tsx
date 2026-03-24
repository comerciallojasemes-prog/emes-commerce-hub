import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Download, Search } from "lucide-react";
import { toast } from "sonner";

interface ItemDeposito {
  id: string;
  produto: string;
  tamanho: string | null;
  quantidade: number;
  estoque_minimo: number;
  observacao: string | null;
}

function StatusBadge({ quantidade }: { quantidade: number }) {
  if (quantidade <= 5) return <Badge className="bg-[hsl(0,84%,60%)] text-white border-0">🔴 Crítico</Badge>;
  if (quantidade <= 15) return <Badge className="bg-[hsl(48,100%,55%)] text-[hsl(0,0%,4%)] border-0">🟡 Atenção</Badge>;
  return <Badge className="bg-[hsl(142,71%,45%)] text-white border-0">🟢 OK</Badge>;
}

export default function SuprimentosDeposito() {
  const { perfil } = useAuth();
  const isAdmin = perfil?.perfil === "Admin";
  const [itens, setItens] = useState<ItemDeposito[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ItemDeposito | null>(null);

  const [form, setForm] = useState({ produto: "", tamanho: "", quantidade: "0", estoque_minimo: "10", observacao: "" });

  const fetchItens = async () => {
    const { data } = await supabase.from("suprimentos_deposito").select("*").order("produto");
    if (data) setItens(data);
    setLoading(false);
  };

  useEffect(() => { fetchItens(); }, []);

  const openNew = () => {
    setEditItem(null);
    setForm({ produto: "", tamanho: "", quantidade: "0", estoque_minimo: "10", observacao: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: ItemDeposito) => {
    setEditItem(item);
    setForm({
      produto: item.produto,
      tamanho: item.tamanho || "",
      quantidade: String(item.quantidade),
      estoque_minimo: String(item.estoque_minimo),
      observacao: item.observacao || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      produto: form.produto,
      tamanho: form.tamanho || null,
      quantidade: parseInt(form.quantidade) || 0,
      estoque_minimo: parseInt(form.estoque_minimo) || 10,
      observacao: form.observacao || null,
    };

    if (editItem) {
      const { error } = await supabase.from("suprimentos_deposito").update(payload).eq("id", editItem.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Item atualizado");
    } else {
      const { error } = await supabase.from("suprimentos_deposito").insert(payload);
      if (error) { toast.error("Erro ao adicionar"); return; }
      toast.success("Item adicionado");
    }
    setDialogOpen(false);
    fetchItens();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este item?")) return;
    await supabase.from("suprimentos_deposito").delete().eq("id", id);
    toast.success("Item excluído");
    fetchItens();
  };

  const exportCSV = () => {
    const header = "Produto,Tamanho,Quantidade,Estoque Mínimo,Observação,Status\n";
    const rows = filteredItens.map(i => {
      const status = i.quantidade <= 5 ? "Crítico" : i.quantidade <= 15 ? "Atenção" : "OK";
      return `"${i.produto}","${i.tamanho || "-"}",${i.quantidade},${i.estoque_minimo},"${i.observacao || "-"}","${status}"`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "suprimentos_deposito.csv";
    a.click();
  };

  const filteredItens = itens.filter(i => i.produto.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suprimentos — Depósito Central</h1>
          <p className="text-muted-foreground text-sm mt-1">Controle de estoque do depósito</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button onClick={openNew} size="sm"><Plus size={16} /> Adicionar Item</Button>
          )}
          <Button onClick={exportCSV} variant="outline" size="sm"><Download size={16} /> Exportar CSV</Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Qtde em Estoque</TableHead>
                <TableHead>Estoque Mínimo</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead>Status</TableHead>
                {(isAdmin || perfil?.perfil === "Comercial") && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItens.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum item encontrado.</TableCell></TableRow>
              ) : filteredItens.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.produto}</TableCell>
                  <TableCell>{item.tamanho || "—"}</TableCell>
                  <TableCell className="font-semibold">{item.quantidade}</TableCell>
                  <TableCell>{item.estoque_minimo}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{item.observacao || "—"}</TableCell>
                  <TableCell><StatusBadge quantidade={item.quantidade} /></TableCell>
                  {(isAdmin || perfil?.perfil === "Comercial") && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil size={14} /></Button>
                        {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></Button>}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar Item" : "Novo Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Produto</Label><Input value={form.produto} onChange={e => setForm({ ...form, produto: e.target.value })} disabled={!!editItem && perfil?.perfil === "Comercial"} /></div>
            <div><Label>Tamanho</Label><Input value={form.tamanho} onChange={e => setForm({ ...form, tamanho: e.target.value })} disabled={!!editItem && perfil?.perfil === "Comercial"} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Quantidade</Label><Input type="number" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} /></div>
              <div><Label>Estoque Mínimo</Label><Input type="number" value={form.estoque_minimo} onChange={e => setForm({ ...form, estoque_minimo: e.target.value })} disabled={perfil?.perfil === "Comercial"} /></div>
            </div>
            <div><Label>Observação</Label><Input value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
