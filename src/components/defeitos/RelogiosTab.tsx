import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, AlertTriangle, Edit, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

const LOJAS = ["Loja 4", "Loja 5", "Loja 6", "Loja 7", "Loja 8", "Loja 9", "Loja 10", "Loja 11", "Loja 12", "Loja 13", "Loja 14 (em breve)"];

const STATUS_OPTIONS = [
  "AGUARDANDO ENVIO",
  "ENVIADO À AUTORIZADA",
  "RETORNOU À LOJA",
  "FINALIZADO/ENTREGUE AO CLIENTE",
];

interface Relogio {
  id: string;
  loja: string;
  ficha: string;
  nome_cliente: string;
  telefone: string;
  referencia: string;
  marca: string;
  defeito: string;
  entrada_na_loja: string;
  enviado_autorizada: string | null;
  retornou_loja: string | null;
  finalizado: string | null;
  operador: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const statusBadgeRelogio = (status: string) => {
  switch (status) {
    case "AGUARDANDO ENVIO":
      return <Badge className="bg-gray-400 hover:bg-gray-500 text-white">⚪ AGUARDANDO ENVIO</Badge>;
    case "ENVIADO À AUTORIZADA":
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">🔵 ENVIADO À AUTORIZADA</Badge>;
    case "RETORNOU À LOJA":
      return <Badge className="bg-[#F5C800] hover:bg-[#e0b800] text-black">🟡 RETORNOU À LOJA</Badge>;
    case "FINALIZADO/ENTREGUE AO CLIENTE":
      return <Badge className="bg-green-500 hover:bg-green-600 text-white">🟢 FINALIZADO</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const DiasCell = ({ entradaNaLoja }: { entradaNaLoja: string }) => {
  const dias = differenceInDays(new Date(), new Date(entradaNaLoja));
  if (dias >= 30) {
    return <span className="font-bold text-red-600">🚨 {dias}d</span>;
  }
  if (dias >= 20) {
    return <span className="font-bold text-yellow-600">⚠️ {dias}d</span>;
  }
  return <span className="font-medium text-green-600">{dias}d</span>;
};

export default function RelogiosTab() {
  const { perfil } = useAuth();
  const [relogios, setRelogios] = useState<Relogio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterLoja, setFilterLoja] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");

  // Form
  const [formLoja, setFormLoja] = useState("");
  const [formFicha, setFormFicha] = useState("");
  const [formNomeCliente, setFormNomeCliente] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formReferencia, setFormReferencia] = useState("");
  const [formMarca, setFormMarca] = useState("");
  const [formDefeito, setFormDefeito] = useState("");
  const [formEntrada, setFormEntrada] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formEnviado, setFormEnviado] = useState("");
  const [formRetornou, setFormRetornou] = useState("");
  const [formFinalizado, setFormFinalizado] = useState("");
  const [formOperador, setFormOperador] = useState("");
  const [formStatus, setFormStatus] = useState("AGUARDANDO ENVIO");

  const isAdminOrComercial = perfil?.perfil === "Admin" || perfil?.perfil === "Comercial";
  const isLojas = perfil?.perfil === "Lojas";

  useEffect(() => {
    if (perfil?.loja) setFormLoja(perfil.loja);
  }, [perfil]);

  const fetchRelogios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("defeitos_relogios" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar relógios");
    } else {
      setRelogios((data as any as Relogio[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRelogios(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormFicha("");
    setFormNomeCliente("");
    setFormTelefone("");
    setFormReferencia("");
    setFormMarca("");
    setFormDefeito("");
    setFormEntrada(format(new Date(), "yyyy-MM-dd"));
    setFormEnviado("");
    setFormRetornou("");
    setFormFinalizado("");
    setFormOperador("");
    setFormStatus("AGUARDANDO ENVIO");
    if (perfil?.loja) setFormLoja(perfil.loja);
  };

  const openEdit = (r: Relogio) => {
    setEditingId(r.id);
    setFormLoja(r.loja);
    setFormFicha(r.ficha);
    setFormNomeCliente(r.nome_cliente);
    setFormTelefone(r.telefone);
    setFormReferencia(r.referencia);
    setFormMarca(r.marca);
    setFormDefeito(r.defeito);
    setFormEntrada(r.entrada_na_loja);
    setFormEnviado(r.enviado_autorizada || "");
    setFormRetornou(r.retornou_loja || "");
    setFormFinalizado(r.finalizado || "");
    setFormOperador(r.operador || "");
    setFormStatus(r.status);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formLoja || !formFicha || !formNomeCliente || !formTelefone || !formReferencia || !formMarca || !formDefeito || !formEntrada) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSubmitting(true);
    const payload: any = {
      loja: formLoja,
      ficha: formFicha,
      nome_cliente: formNomeCliente,
      telefone: formTelefone,
      referencia: formReferencia,
      marca: formMarca,
      defeito: formDefeito,
      entrada_na_loja: formEntrada,
      enviado_autorizada: formEnviado || null,
      retornou_loja: formRetornou || null,
      finalizado: formFinalizado || null,
      operador: formOperador || null,
      status: formStatus,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("defeitos_relogios" as any).update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("defeitos_relogios" as any).insert(payload));
    }

    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success(editingId ? "Registro atualizado!" : "Relógio registrado!");
      setShowForm(false);
      resetForm();
      fetchRelogios();
    }
    setSubmitting(false);
  };

  const filtered = useMemo(() => {
    return relogios.filter(r => {
      if (filterLoja !== "all" && r.loja !== filterLoja) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterDateStart && r.entrada_na_loja < filterDateStart) return false;
      if (filterDateEnd && r.entrada_na_loja > filterDateEnd) return false;
      return true;
    });
  }, [relogios, filterLoja, filterStatus, filterDateStart, filterDateEnd]);

  const alertCount = useMemo(() => {
    return relogios.filter(r => {
      if (r.status === "FINALIZADO/ENTREGUE AO CLIENTE") return false;
      const dias = differenceInDays(new Date(), new Date(r.entrada_na_loja));
      return dias >= 20;
    }).length;
  }, [relogios]);

  return (
    <div className="space-y-4">
      {/* Alert card */}
      {alertCount > 0 && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/30">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-bold text-red-700 dark:text-red-400">
                🚨 {alertCount} relógio{alertCount > 1 ? "s" : ""} com 20 dias ou mais sem retorno!
              </p>
              <p className="text-sm text-red-600 dark:text-red-400/80">Verifique os registros pendentes abaixo.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action button */}
      {isLojas && (
        <div className="flex justify-end">
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Registrar Relógio
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Select value={filterLoja} onValueChange={setFilterLoja}>
          <SelectTrigger><SelectValue placeholder="Loja" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Lojas</SelectItem>
            {LOJAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} />
        <Input type="date" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} />
        <Button variant="outline" onClick={() => { setFilterLoja("all"); setFilterStatus("all"); setFilterDateStart(""); setFilterDateEnd(""); }}>Limpar</Button>
      </div>

      {/* Table */}
      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Nenhum registro de relógio encontrado.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loja</TableHead>
                    <TableHead>Ficha</TableHead>
                    <TableHead>Nome do Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Defeito</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Env. Autorizada</TableHead>
                    <TableHead>Retornou</TableHead>
                    <TableHead>Finalizado</TableHead>
                    <TableHead>Operador</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dias</TableHead>
                    {isLojas && <TableHead>Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium whitespace-nowrap">{r.loja}</TableCell>
                      <TableCell>{r.ficha}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.nome_cliente}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.telefone}</TableCell>
                      <TableCell>{r.referencia}</TableCell>
                      <TableCell>{r.marca}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{r.defeito}</TableCell>
                      <TableCell className="whitespace-nowrap">{format(new Date(r.entrada_na_loja), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.enviado_autorizada ? format(new Date(r.enviado_autorizada), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.retornou_loja ? format(new Date(r.retornou_loja), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.finalizado ? format(new Date(r.finalizado), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell>{r.operador || "—"}</TableCell>
                      <TableCell>{statusBadgeRelogio(r.status)}</TableCell>
                      <TableCell><DiasCell entradaNaLoja={r.entrada_na_loja} /></TableCell>
                      {isLojas && (
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Relógio" : "Registrar Relógio"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Loja *</Label>
              <Select value={formLoja} onValueChange={setFormLoja}>
                <SelectTrigger><SelectValue placeholder="Selecione a loja" /></SelectTrigger>
                <SelectContent>
                  {LOJAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ficha do cliente *</Label>
              <Input value={formFicha} onChange={e => setFormFicha(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Nome do cliente *</Label>
              <Input value={formNomeCliente} onChange={e => setFormNomeCliente(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input value={formTelefone} onChange={e => setFormTelefone(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Referência do produto *</Label>
              <Input value={formReferencia} onChange={e => setFormReferencia(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Marca *</Label>
              <Input value={formMarca} onChange={e => setFormMarca(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Defeito *</Label>
              <Textarea value={formDefeito} onChange={e => setFormDefeito(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Entrada na loja *</Label>
              <Input type="date" value={formEntrada} onChange={e => setFormEntrada(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Enviado à autorizada</Label>
              <Input type="date" value={formEnviado} onChange={e => setFormEnviado(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Retornou à loja</Label>
              <Input type="date" value={formRetornou} onChange={e => setFormRetornou(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Finalizado</Label>
              <Input type="date" value={formFinalizado} onChange={e => setFormFinalizado(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Operador</Label>
              <Input value={formOperador} onChange={e => setFormOperador(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : editingId ? "Salvar Alterações" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
