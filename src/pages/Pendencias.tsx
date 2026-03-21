import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CONTATOS = ["Whatsapp", "E-mail", "Telefone", "—"] as const;
const STATUS_OPTIONS = ["ABERTA", "EM ANDAMENTO", "RESOLVIDA"] as const;

interface PendenciaItem {
  id: string;
  marca: string;
  observacao: string;
  data: string;
  contato: string | null;
  responsavel: string;
  status: string | null;
  created_at: string | null;
}

type FormData = { marca: string; observacao: string; data: string; contato: string; responsavel: string; status: string };

const emptyForm: FormData = { marca: "", observacao: "", data: "", contato: "", responsavel: "", status: "ABERTA" };

const statusBadge = (status: string | null) => {
  switch (status) {
    case "ABERTA": return "bg-[hsl(48,100%,55%)] text-[hsl(0,0%,4%)] hover:bg-[hsl(48,100%,55%)]";
    case "EM ANDAMENTO": return "bg-blue-500 text-white hover:bg-blue-500";
    case "RESOLVIDA": return "bg-[hsl(142,71%,45%)] text-white hover:bg-[hsl(142,71%,45%)]";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function Pendencias() {
  const { perfil } = useAuth();
  const isAdmin = perfil?.perfil === "Admin";
  const canWrite = perfil?.perfil === "Admin" || perfil?.perfil === "Comercial";
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PendenciaItem | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [filterStatus, setFilterStatus] = useState<string>("TODOS");
  const [filterResponsavel, setFilterResponsavel] = useState<string>("TODOS");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["pendencias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pendencias").select("*").order("data", { ascending: false });
      if (error) throw error;
      return data as PendenciaItem[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (formData: FormData & { id?: string }) => {
      const payload = { marca: formData.marca, observacao: formData.observacao, data: formData.data, contato: formData.contato || null, responsavel: formData.responsavel, status: formData.status };
      if (formData.id) {
        const { error } = await supabase.from("pendencias").update(payload).eq("id", formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pendencias").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendencias"] });
      setDialogOpen(false);
      setEditingItem(null);
      setForm(emptyForm);
      toast.success("Pendência salva com sucesso");
    },
    onError: () => toast.error("Erro ao salvar pendência"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pendencias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendencias"] });
      toast.success("Pendência excluída");
    },
    onError: () => toast.error("Erro ao excluir pendência"),
  });

  const openNew = () => { setEditingItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item: PendenciaItem) => {
    setEditingItem(item);
    setForm({ marca: item.marca, observacao: item.observacao, data: item.data, contato: item.contato || "", responsavel: item.responsavel, status: item.status || "ABERTA" });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.marca || !form.observacao || !form.data || !form.responsavel) { toast.error("Preencha os campos obrigatórios"); return; }
    upsert.mutate({ ...form, id: editingItem?.id });
  };

  // Filters
  const responsaveis = [...new Set(items.map((i) => i.responsavel))].sort();
  const filtered = items.filter((i) => {
    if (filterStatus !== "TODOS" && i.status !== filterStatus) return false;
    if (filterResponsavel !== "TODOS" && i.responsavel !== filterResponsavel) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">Pendências</h1>
        {canWrite && (
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Pendência</Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="w-48">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os status</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
            <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              {responsaveis.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                {canWrite && <TableHead className="w-20">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={canWrite ? 7 : 6} className="text-center text-muted-foreground py-8">Nenhuma pendência encontrada</TableCell></TableRow>
              ) : filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">{format(parseISO(item.data), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="font-medium">{item.marca}</TableCell>
                  <TableCell className="max-w-xs"><div className="line-clamp-2 text-sm">{item.observacao}</div></TableCell>
                  <TableCell>{item.contato}</TableCell>
                  <TableCell>{item.responsavel}</TableCell>
                  <TableCell><Badge className={statusBadge(item.status)}>{item.status}</Badge></TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(item)} className="p-1 rounded hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                        {isAdmin && <button onClick={() => remove.mutate(item.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingItem ? "Editar Pendência" : "Nova Pendência"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Marca *</Label>
              <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Observação *</Label>
              <Textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contato</Label>
                <Select value={form.contato} onValueChange={(v) => setForm({ ...form, contato: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{CONTATOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={upsert.isPending}>{upsert.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
