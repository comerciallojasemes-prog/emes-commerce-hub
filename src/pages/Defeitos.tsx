import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const LOJAS = ["Loja 4", "Loja 5", "Loja 6", "Loja 7", "Loja 8", "Loja 9", "Loja 10", "Loja 11", "Loja 12", "Loja 13", "Loja 14 (em breve)"];

interface Defeito {
  id: string;
  loja: string;
  nome_responsavel: string;
  tipo: string;
  tipo_produto: string;
  status: string;
  data_avaliacao: string;
  referencia_produto: string;
  codigo_produto: string | null;
  motivo_defeito: string;
  data_compra: string;
  responsavel_envio: string;
  observacao_comercial: string | null;
  nome_cliente: string | null;
  ficha_cliente: string | null;
  telefone: string | null;
  numero_venda: string | null;
  data_venda: string | null;
  avaliado_por: string | null;
  data_avaliacao_comercial: string | null;
  created_at: string;
  updated_at: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "AGUARDANDO ANÁLISE": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">🟡 AGUARDANDO ANÁLISE</Badge>;
    case "AUTORIZADO": return <Badge className="bg-green-500 hover:bg-green-600 text-white">🟢 AUTORIZADO</Badge>;
    case "NÃO AUTORIZADO": return <Badge className="bg-red-500 hover:bg-red-600 text-white">🔴 NÃO AUTORIZADO</Badge>;
    case "ENVIADO AO FORNECEDOR": return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">🔵 ENVIADO AO FORNECEDOR</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function Defeitos() {
  const { perfil } = useAuth();
  const [defeitos, setDefeitos] = useState<Defeito[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"CLIENTE" | "LOJA">("CLIENTE");

  // Form state
  const [formLoja, setFormLoja] = useState("");
  const [formNomeResponsavel, setFormNomeResponsavel] = useState("");
  const [formTipoProduto, setFormTipoProduto] = useState("");
  const [formDataAvaliacao, setFormDataAvaliacao] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formReferencia, setFormReferencia] = useState("");
  const [formCodigo, setFormCodigo] = useState("");
  const [formMotivo, setFormMotivo] = useState("");
  const [formDataCompra, setFormDataCompra] = useState("");
  const [formResponsavelEnvio, setFormResponsavelEnvio] = useState("");
  const [formObservacao, setFormObservacao] = useState("");
  // Cliente-only fields
  const [formNomeCliente, setFormNomeCliente] = useState("");
  const [formFichaCliente, setFormFichaCliente] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formNumeroVenda, setFormNumeroVenda] = useState("");
  const [formDataVenda, setFormDataVenda] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (perfil?.loja) setFormLoja(perfil.loja);
  }, [perfil]);

  const fetchDefeitos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("defeitos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar defeitos");
    } else {
      setDefeitos((data as Defeito[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDefeitos(); }, []);

  const resetForm = () => {
    setFormNomeResponsavel("");
    setFormTipoProduto("");
    setFormDataAvaliacao(format(new Date(), "yyyy-MM-dd"));
    setFormReferencia("");
    setFormCodigo("");
    setFormMotivo("");
    setFormDataCompra("");
    setFormResponsavelEnvio("");
    setFormObservacao("");
    setFormNomeCliente("");
    setFormFichaCliente("");
    setFormTelefone("");
    setFormNumeroVenda("");
    setFormDataVenda("");
    if (perfil?.loja) setFormLoja(perfil.loja);
  };

  const handleSubmit = async () => {
    if (!formLoja || !formNomeResponsavel || !formTipoProduto || !formDataAvaliacao || !formReferencia || !formMotivo || !formDataCompra || !formResponsavelEnvio) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (activeTab === "CLIENTE" && (!formNomeCliente || !formFichaCliente || !formTelefone || !formNumeroVenda || !formDataVenda)) {
      toast.error("Preencha todos os campos obrigatórios do cliente");
      return;
    }

    setSubmitting(true);
    const payload: any = {
      loja: formLoja,
      nome_responsavel: formNomeResponsavel,
      tipo: activeTab,
      tipo_produto: formTipoProduto,
      data_avaliacao: formDataAvaliacao,
      referencia_produto: formReferencia,
      codigo_produto: formCodigo || null,
      motivo_defeito: formMotivo,
      data_compra: formDataCompra,
      responsavel_envio: formResponsavelEnvio,
      observacao_comercial: formObservacao || null,
    };

    if (activeTab === "CLIENTE") {
      payload.nome_cliente = formNomeCliente;
      payload.ficha_cliente = formFichaCliente;
      payload.telefone = formTelefone;
      payload.numero_venda = formNumeroVenda;
      payload.data_venda = formDataVenda;
    }

    const { error } = await supabase.from("defeitos").insert(payload);
    if (error) {
      toast.error("Erro ao registrar defeito: " + error.message);
    } else {
      toast.success("Defeito registrado com sucesso!");
      setShowForm(false);
      resetForm();
      fetchDefeitos();
    }
    setSubmitting(false);
  };

  const filteredDefeitos = defeitos.filter(d => d.tipo === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Defeitos</h1>
          <p className="text-muted-foreground text-sm mt-1">Registre e acompanhe defeitos de produtos</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Registrar Defeito
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "CLIENTE" | "LOJA")}>
        <TabsList>
          <TabsTrigger value="CLIENTE">Defeito Cliente</TabsTrigger>
          <TabsTrigger value="LOJA">Defeito Loja</TabsTrigger>
        </TabsList>

        <TabsContent value="CLIENTE">
          <DefeitosTable defeitos={filteredDefeitos} loading={loading} tipo="CLIENTE" />
        </TabsContent>
        <TabsContent value="LOJA">
          <DefeitosTable defeitos={filteredDefeitos} loading={loading} tipo="LOJA" />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Defeito — {activeTab === "CLIENTE" ? "Cliente" : "Loja"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Common fields */}
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
              <Label>Nome do responsável *</Label>
              <Input value={formNomeResponsavel} onChange={e => setFormNomeResponsavel(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Tipo de produto *</Label>
              <Input value={formTipoProduto} onChange={e => setFormTipoProduto(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Data da avaliação *</Label>
              <Input type="date" value={formDataAvaliacao} onChange={e => setFormDataAvaliacao(e.target.value)} />
            </div>

            {/* Cliente-only fields */}
            {activeTab === "CLIENTE" && (
              <>
                <div className="space-y-2">
                  <Label>Nome completo do cliente *</Label>
                  <Input value={formNomeCliente} onChange={e => setFormNomeCliente(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Ficha do cliente *</Label>
                  <Input value={formFichaCliente} onChange={e => setFormFichaCliente(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input value={formTelefone} onChange={e => setFormTelefone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Número da venda *</Label>
                  <Input value={formNumeroVenda} onChange={e => setFormNumeroVenda(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Data da venda *</Label>
                  <Input type="date" value={formDataVenda} onChange={e => setFormDataVenda(e.target.value)} />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Referência do produto *</Label>
              <Input value={formReferencia} onChange={e => setFormReferencia(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Código do produto</Label>
              <Input value={formCodigo} onChange={e => setFormCodigo(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Motivo do defeito *</Label>
              <Textarea value={formMotivo} onChange={e => setFormMotivo(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Data da compra *</Label>
              <Input type="date" value={formDataCompra} onChange={e => setFormDataCompra(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Responsável pelo envio *</Label>
              <Input value={formResponsavelEnvio} onChange={e => setFormResponsavelEnvio(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={formObservacao} onChange={e => setFormObservacao(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Enviando..." : "Registrar Defeito"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DefeitosTable({ defeitos, loading, tipo }: { defeitos: Defeito[]; loading: boolean; tipo: string }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent>
      </Card>
    );
  }

  if (defeitos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Nenhum defeito {tipo === "CLIENTE" ? "de cliente" : "de loja"} registrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loja</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Tipo Produto</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Data Avaliação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defeitos.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.loja}</TableCell>
                  <TableCell>{d.nome_responsavel}</TableCell>
                  <TableCell>{d.tipo_produto}</TableCell>
                  <TableCell>{d.referencia_produto}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{d.motivo_defeito}</TableCell>
                  <TableCell>{format(new Date(d.data_avaliacao), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{statusBadge(d.status)}</TableCell>
                  <TableCell>{format(new Date(d.created_at), "dd/MM/yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
