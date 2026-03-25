import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, List, Plus, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TIPOS = ["ROTA", "INÍCIO DE PROMOÇÃO", "NOVA CAMPANHA", "ATENDIMENTO A REPRESENTANTE", "OUTRO"] as const;

interface AgendaItem {
  id: string;
  tipo: string;
  observacoes: string | null;
  data: string;
  responsavel: string;
  created_at: string | null;
}

type FormData = { tipo: string; observacoes: string; data: string; responsavel: string };

const emptyForm: FormData = { tipo: "", observacoes: "", data: "", responsavel: "" };

export default function Agenda() {
  const { perfil } = useAuth();
  const isAdmin = perfil?.perfil === "Admin";
  const queryClient = useQueryClient();

  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  // Event detail modal
  const [detailItem, setDetailItem] = useState<AgendaItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["agenda"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agenda").select("*").order("data", { ascending: true });
      if (error) throw error;
      return data as AgendaItem[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (formData: FormData & { id?: string }) => {
      const payload = { tipo: formData.tipo, observacoes: formData.observacoes || null, data: formData.data, responsavel: formData.responsavel };
      if (formData.id) {
        const { error } = await supabase.from("agenda").update(payload).eq("id", formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("agenda").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
      setDialogOpen(false);
      setEditingItem(null);
      setForm(emptyForm);
      toast.success("Evento salvo com sucesso");
    },
    onError: () => toast.error("Erro ao salvar evento"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agenda").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
      setDetailOpen(false);
      setDetailItem(null);
      toast.success("Evento excluído");
    },
    onError: () => toast.error("Erro ao excluir evento"),
  });

  const openNew = () => { setEditingItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item: AgendaItem) => {
    setEditingItem(item);
    setForm({ tipo: item.tipo, observacoes: item.observacoes || "", data: item.data, responsavel: item.responsavel });
    setDetailOpen(false);
    setDialogOpen(true);
  };

  const openDetail = (item: AgendaItem) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const handleSubmit = () => {
    if (!form.tipo || !form.data || !form.responsavel) { toast.error("Preencha os campos obrigatórios"); return; }
    upsert.mutate({ ...form, id: editingItem?.id });
  };

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();

  const getEventsForDay = (day: Date) => items.filter((i) => isSameDay(parseISO(i.data), day));

  const tipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case "ROTA": return "bg-accent text-accent-foreground";
      case "ATENDIMENTO A REPRESENTANTE": return "bg-blue-100 text-blue-800";
      case "INÍCIO DE PROMOÇÃO": return "bg-green-100 text-green-800";
      case "NOVA CAMPANHA": return "bg-purple-100 text-purple-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView("calendar")} className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${view === "calendar" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}>
              <CalendarDays className="h-4 w-4" /> Calendário
            </button>
            <button onClick={() => setView("list")} className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}>
              <List className="h-4 w-4" /> Lista
            </button>
          </div>
          {isAdmin && (
            <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Evento</Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : view === "calendar" ? (
        <div className="bg-card rounded-lg border border-border">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 rounded hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="text-lg font-semibold capitalize">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 rounded hover:bg-muted"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground border-b border-border">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} className="min-h-[80px] border-b border-r border-border" />)}
            {days.map((day) => {
              const events = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className={`min-h-[80px] border-b border-r border-border p-1 ${isToday ? "bg-accent/10" : ""}`}>
                  <span className={`text-xs font-medium ${isToday ? "bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center" : "text-foreground"}`}>
                    {format(day, "d")}
                  </span>
                  <div className="space-y-0.5 mt-0.5">
                    {events.slice(0, 2).map((ev) => (
                      <div key={ev.id} onClick={() => openDetail(ev)} className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer ${tipoBadgeColor(ev.tipo)}`}>
                        {ev.tipo}
                      </div>
                    ))}
                    {events.length > 2 && <div className="text-[10px] text-muted-foreground px-1 cursor-pointer" onClick={() => openDetail(events[2])}>+{events.length - 2} mais</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead>Responsável</TableHead>
                {isAdmin && <TableHead className="w-20">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground py-8">Nenhum evento cadastrado</TableCell></TableRow>
              ) : items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">{format(parseISO(item.data), "dd/MM/yyyy")}</TableCell>
                  <TableCell><Badge className={tipoBadgeColor(item.tipo)} variant="secondary">{item.tipo}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate">{item.observacoes}</TableCell>
                  <TableCell>{item.responsavel}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(item)} className="p-1 rounded hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => remove.mutate(item.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Event Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p className="font-medium"><Badge className={tipoBadgeColor(detailItem.tipo)} variant="secondary">{detailItem.tipo}</Badge></p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data</Label>
                  <p className="font-medium">{format(parseISO(detailItem.data), "dd/MM/yyyy")}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Responsável</Label>
                <p className="font-medium">{detailItem.responsavel}</p>
              </div>
              {detailItem.observacoes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Observações</Label>
                  <p className="text-sm">{detailItem.observacoes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {isAdmin && detailItem && (
              <div className="flex gap-2 w-full">
                <Button variant="outline" size="sm" onClick={() => openEdit(detailItem)}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => { remove.mutate(detailItem.id); }}>
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? "Editar Evento" : "Novo Evento"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Responsável *</Label>
              <Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
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
