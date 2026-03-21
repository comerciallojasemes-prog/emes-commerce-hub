import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Alerta {
  id: string;
  mensagem: string;
  data: string;
  responsavel: string;
  status: string;
  created_at: string | null;
}

export default function Alertas() {
  const { perfil } = useAuth();
  const isAdmin = perfil?.perfil === "Admin";
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlerta, setEditingAlerta] = useState<Alerta | null>(null);

  const [mensagem, setMensagem] = useState("");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [responsavel, setResponsavel] = useState("");
  const [status, setStatus] = useState("Ativo");

  const fetchAlertas = async () => {
    const { data, error } = await supabase
      .from("alertas")
      .select("*")
      .order("data", { ascending: false });
    if (!error && data) setAlertas(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAlertas();
  }, []);

  const resetForm = () => {
    setMensagem("");
    setData(format(new Date(), "yyyy-MM-dd"));
    setResponsavel("");
    setStatus("Ativo");
    setEditingAlerta(null);
  };

  const openEdit = (a: Alerta) => {
    setEditingAlerta(a);
    setMensagem(a.mensagem);
    setData(a.data);
    setResponsavel(a.responsavel);
    setStatus(a.status);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!mensagem || !data || !responsavel) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (editingAlerta) {
      const { error } = await supabase
        .from("alertas")
        .update({ mensagem, data, responsavel, status })
        .eq("id", editingAlerta.id);
      if (error) { toast.error("Erro ao atualizar alerta."); return; }
      toast.success("Alerta atualizado!");
    } else {
      const { error } = await supabase
        .from("alertas")
        .insert({ mensagem, data, responsavel, status });
      if (error) { toast.error("Erro ao criar alerta."); return; }
      toast.success("Alerta criado!");
    }
    setDialogOpen(false);
    resetForm();
    fetchAlertas();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("alertas").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir alerta."); return; }
    toast.success("Alerta excluído!");
    fetchAlertas();
  };

  const toggleStatus = async (a: Alerta) => {
    const newStatus = a.status === "Ativo" ? "Inativo" : "Ativo";
    const { error } = await supabase
      .from("alertas")
      .update({ status: newStatus })
      .eq("id", a.id);
    if (error) { toast.error("Erro ao alterar status."); return; }
    toast.success(`Alerta ${newStatus === "Ativo" ? "ativado" : "desativado"}!`);
    fetchAlertas();
  };

  const alertasAtivos = alertas.filter((a) => a.status === "Ativo");

  if (loading) return <p className="text-muted-foreground p-4">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alertas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie alertas do portal</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus size={16} className="mr-2" /> Novo Alerta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAlerta ? "Editar Alerta" : "Novo Alerta"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium">Mensagem *</label>
                  <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Mensagem do alerta" />
                </div>
                <div>
                  <label className="text-sm font-medium">Data *</label>
                  <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Responsável *</label>
                  <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Nome do responsável" />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground">
                  {editingAlerta ? "Salvar Alterações" : "Criar Alerta"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Active alerts cards */}
      {alertasAtivos.length > 0 && (
        <div className="space-y-3">
          {alertasAtivos.map((a) => (
            <div
              key={a.id}
              className="rounded-lg p-4 flex items-start gap-3"
              style={{ backgroundColor: "#F5C800" }}
            >
              <AlertTriangle size={20} className="text-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">{a.mensagem}</p>
                <p className="text-sm text-foreground/70 mt-1">
                  {a.responsavel} — {format(new Date(a.data + "T00:00:00"), "dd/MM/yyyy")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History table */}
      <div className="bg-background rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mensagem</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {alertas.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="max-w-xs">{a.mensagem}</TableCell>
                <TableCell>{format(new Date(a.data + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                <TableCell>{a.responsavel}</TableCell>
                <TableCell>
                  <Badge
                    variant={a.status === "Ativo" ? "default" : "secondary"}
                    className={a.status === "Ativo" ? "bg-green-500 text-white" : "bg-gray-800 text-white"}
                  >
                    {a.status === "Ativo" ? "🟢" : "⚫"} {a.status}
                  </Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleStatus(a)} title={a.status === "Ativo" ? "Desativar" : "Ativar"}>
                        {a.status === "Ativo" ? "⚫" : "🟢"}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                        <Pencil size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)} className="text-destructive hover:text-destructive">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {alertas.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground py-8">
                  Nenhum alerta encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
