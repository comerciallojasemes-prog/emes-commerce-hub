import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Bonificacao {
  id: string;
  marca: string;
  tipo: string;
  valor: number | null;
  nota_fiscal: string | null;
  campanha: string | null;
  status: string | null;
  created_at: string | null;
}

export default function Bonificacoes() {
  const { perfil } = useAuth();
  const isAdmin = perfil?.perfil === "Admin";
  const [bonificacoes, setBonificacoes] = useState<Bonificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bonificacao | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [filterMarca, setFilterMarca] = useState("");

  // Form
  const [marca, setMarca] = useState("");
  const [tipo, setTipo] = useState("");
  const [valor, setValor] = useState("");
  const [notaFiscal, setNotaFiscal] = useState("");
  const [campanha, setCampanha] = useState("");
  const [status, setStatus] = useState("PENDENTE");

  const fetchBonificacoes = async () => {
    const { data, error } = await supabase
      .from("bonificacoes")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setBonificacoes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBonificacoes();
  }, []);

  const resetForm = () => {
    setMarca("");
    setTipo("");
    setValor("");
    setNotaFiscal("");
    setCampanha("");
    setStatus("PENDENTE");
    setEditing(null);
  };

  const openEdit = (b: Bonificacao) => {
    setEditing(b);
    setMarca(b.marca);
    setTipo(b.tipo);
    setValor(b.valor?.toString() || "");
    setNotaFiscal(b.nota_fiscal || "");
    setCampanha(b.campanha || "");
    setStatus(b.status || "PENDENTE");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!marca || !tipo) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    const payload = {
      marca,
      tipo,
      valor: valor ? parseFloat(valor) : null,
      nota_fiscal: notaFiscal || null,
      campanha: campanha || null,
      status,
    };

    if (editing) {
      const { error } = await supabase.from("bonificacoes").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar."); return; }
      toast.success("Bonificação atualizada!");
    } else {
      const { error } = await supabase.from("bonificacoes").insert(payload);
      if (error) { toast.error("Erro ao criar."); return; }
      toast.success("Bonificação criada!");
    }
    setDialogOpen(false);
    resetForm();
    fetchBonificacoes();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("bonificacoes").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir."); return; }
    toast.success("Bonificação excluída!");
    fetchBonificacoes();
  };

  const filtered = bonificacoes.filter((b) => {
    if (filterStatus !== "TODOS" && b.status !== filterStatus) return false;
    if (filterMarca && !b.marca.toLowerCase().includes(filterMarca.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (s: string | null) => {
    switch (s) {
      case "PENDENTE":
        return <Badge className="text-foreground" style={{ backgroundColor: "#F5C800" }}>🟡 PENDENTE</Badge>;
      case "EM ANDAMENTO":
        return <Badge className="bg-blue-500 text-white">🔵 EM ANDAMENTO</Badge>;
      case "RECEBIDA":
        return <Badge className="bg-green-500 text-white">🟢 RECEBIDA</Badge>;
      default:
        return <Badge variant="secondary">{s}</Badge>;
    }
  };

  if (loading) return <p className="text-muted-foreground p-4">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bonificações</h1>
          <p className="text-muted-foreground text-sm mt-1">Controle de bonificações de marcas</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus size={16} className="mr-2" /> Nova Bonificação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Bonificação" : "Nova Bonificação"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium">Marca *</label>
                  <Input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Nome da marca" />
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo *</label>
                  <Input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Tipo de bonificação" />
                </div>
                <div>
                  <label className="text-sm font-medium">Valor (R$)</label>
                  <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
                </div>
                <div>
                  <label className="text-sm font-medium">Campanha</label>
                  <Input value={campanha} onChange={(e) => setCampanha(e.target.value)} placeholder="Nome da campanha" />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDENTE">PENDENTE</SelectItem>
                      <SelectItem value="EM ANDAMENTO">EM ANDAMENTO</SelectItem>
                      <SelectItem value="RECEBIDA">RECEBIDA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground">
                  {editing ? "Salvar Alterações" : "Criar Bonificação"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os Status</SelectItem>
            <SelectItem value="PENDENTE">PENDENTE</SelectItem>
            <SelectItem value="EM ANDAMENTO">EM ANDAMENTO</SelectItem>
            <SelectItem value="RECEBIDA">RECEBIDA</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Filtrar por marca..."
          value={filterMarca}
          onChange={(e) => setFilterMarca(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Table */}
      <div className="bg-background rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marca</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor (R$)</TableHead>
              <TableHead>Campanha</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.marca}</TableCell>
                <TableCell>{b.tipo}</TableCell>
                <TableCell>{b.valor != null ? `R$ ${b.valor.toFixed(2)}` : "—"}</TableCell>
                <TableCell>{b.campanha || "—"}</TableCell>
                <TableCell>{statusBadge(b.status)}</TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                        <Pencil size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} className="text-destructive hover:text-destructive">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">
                  Nenhuma bonificação encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
