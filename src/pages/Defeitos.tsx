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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Plus, AlertTriangle, Printer, Eye, CheckCircle, XCircle, Package, BarChart3, Upload, Download, X, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const LOJAS = ["Loja 4", "Loja 5", "Loja 6", "Loja 7", "Loja 8", "Loja 9", "Loja 10", "Loja 11", "Loja 12", "Loja 13", "Loja 14 (em breve)"];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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

interface DefeitoArquivo {
  id: string;
  defeito_id: string;
  nome_arquivo: string;
  url: string;
  tipo_arquivo: string | null;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "AGUARDANDO ANÁLISE": return <Badge className="bg-[#F5C800] hover:bg-[#e0b800] text-black">🟡 AGUARDANDO ANÁLISE</Badge>;
    case "AUTORIZADO": return <Badge className="bg-green-500 hover:bg-green-600 text-white">🟢 AUTORIZADO</Badge>;
    case "NÃO AUTORIZADO": return <Badge className="bg-red-500 hover:bg-red-600 text-white">🔴 NÃO AUTORIZADO</Badge>;
    case "ENVIADO AO FORNECEDOR": return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">🔵 ENVIADO AO FORNECEDOR</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
};

const PIE_COLORS = ["#F5C800", "#22c55e", "#ef4444", "#3b82f6", "#8b5cf6", "#f97316", "#06b6d4", "#ec4899"];

const isImageFile = (name: string) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name);
const isVideoFile = (name: string) => /\.(mp4|mov|avi|webm|mkv|wmv)$/i.test(name);

const getPublicUrl = (path: string) => {
  const { data } = supabase.storage.from("defeitos").getPublicUrl(path);
  return data.publicUrl;
};

const printDefeito = (d: Defeito) => {
  const w = window.open("", "_blank");
  if (!w) return;
  const fields = [
    ["Loja", d.loja],
    ["Responsável", d.nome_responsavel],
    ["Tipo", d.tipo === "CLIENTE" ? "Defeito Cliente" : "Defeito Loja"],
    ["Tipo de Produto", d.tipo_produto],
    ["Status", d.status],
    ["Data da Avaliação", format(new Date(d.data_avaliacao), "dd/MM/yyyy")],
    ["Referência do Produto", d.referencia_produto],
    ["Código do Produto", d.codigo_produto || "—"],
    ["Motivo do Defeito", d.motivo_defeito],
    ["Data da Compra", format(new Date(d.data_compra), "dd/MM/yyyy")],
    ["Responsável pelo Envio", d.responsavel_envio],
    ...(d.tipo === "CLIENTE" ? [
      ["Nome do Cliente", d.nome_cliente || "—"],
      ["Ficha do Cliente", d.ficha_cliente || "—"],
      ["Telefone", d.telefone || "—"],
      ["Número da Venda", d.numero_venda || "—"],
      ["Data da Venda", d.data_venda ? format(new Date(d.data_venda), "dd/MM/yyyy") : "—"],
    ] : []),
    ["Observação Comercial", d.observacao_comercial || "—"],
    ["Avaliado por", d.avaliado_por || "—"],
    ["Data Avaliação Comercial", d.data_avaliacao_comercial ? format(new Date(d.data_avaliacao_comercial), "dd/MM/yyyy HH:mm") : "—"],
  ];
  w.document.write(`<html><head><title>Defeito - ${d.referencia_produto}</title><style>body{font-family:Arial,sans-serif;padding:30px;font-size:14px}h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:8px 12px;border:1px solid #ddd}td:first-child{font-weight:bold;width:200px;background:#f5f5f5}@media print{body{padding:10px}}</style></head><body><h1>Registro de Defeito — ${d.tipo === "CLIENTE" ? "Cliente" : "Loja"}</h1><table>${fields.map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table><script>window.print()</script></body></html>`);
  w.document.close();
};

export default function Defeitos() {
  const { perfil } = useAuth();
  const [defeitos, setDefeitos] = useState<Defeito[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"CLIENTE" | "LOJA">("CLIENTE");
  const [mainTab, setMainTab] = useState<"defeitos" | "dashboard">("defeitos");

  // Detail modal
  const [selectedDefeito, setSelectedDefeito] = useState<Defeito | null>(null);
  const [obsComercial, setObsComercial] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [detailArquivos, setDetailArquivos] = useState<DefeitoArquivo[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Filters (Admin/Comercial)
  const [filterLoja, setFilterLoja] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");

  // Dashboard period filter
  const [dashDateStart, setDashDateStart] = useState("");
  const [dashDateEnd, setDashDateEnd] = useState("");

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
  const [formNomeCliente, setFormNomeCliente] = useState("");
  const [formFichaCliente, setFormFichaCliente] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formNumeroVenda, setFormNumeroVenda] = useState("");
  const [formDataVenda, setFormDataVenda] = useState("");
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isAdminOrComercial = perfil?.perfil === "Admin" || perfil?.perfil === "Comercial";

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

  const fetchArquivos = async (defeitoId: string) => {
    const { data } = await supabase
      .from("defeitos_arquivos")
      .select("*")
      .eq("defeito_id", defeitoId);
    setDetailArquivos((data as DefeitoArquivo[]) || []);
  };

  const openDetail = (d: Defeito) => {
    setSelectedDefeito(d);
    setObsComercial(d.observacao_comercial || "");
    fetchArquivos(d.id);
  };

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
    setFormFiles([]);
    if (perfil?.loja) setFormLoja(perfil.loja);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFormFile = (index: number) => {
    setFormFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (defeitoId: string) => {
    for (const file of formFiles) {
      const ext = file.name.split(".").pop();
      const path = `${defeitoId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("defeitos").upload(path, file);
      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }
      const publicUrl = getPublicUrl(path);
      await supabase.from("defeitos_arquivos").insert({
        defeito_id: defeitoId,
        nome_arquivo: file.name,
        url: publicUrl,
        tipo_arquivo: file.type,
      });
    }
  };

  const handleSubmit = async () => {
    if (!formLoja || !formNomeResponsavel || !formTipoProduto || !formDataAvaliacao || !formReferencia || !formMotivo) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (activeTab === "CLIENTE" && (!formNomeCliente || !formFichaCliente || !formTelefone || !formNumeroVenda || !formDataVenda)) {
      toast.error("Preencha todos os campos obrigatórios do cliente");
      return;
    }
    if (activeTab === "LOJA" && !formDataCompra) {
      toast.error("Preencha a Data da compra");
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
      data_compra: activeTab === "LOJA" ? formDataCompra : formDataAvaliacao,
      responsavel_envio: formNomeResponsavel,
      observacao_comercial: formObservacao || null,
    };

    if (activeTab === "CLIENTE") {
      payload.nome_cliente = formNomeCliente;
      payload.ficha_cliente = formFichaCliente;
      payload.telefone = formTelefone;
      payload.numero_venda = formNumeroVenda;
      payload.data_venda = formDataVenda;
    }

    const { data, error } = await supabase.from("defeitos").insert(payload).select("id").single();
    if (error) {
      toast.error("Erro ao registrar defeito: " + error.message);
    } else {
      if (formFiles.length > 0 && data) {
        await uploadFiles(data.id);
      }
      toast.success("Defeito registrado com sucesso!");
      setShowForm(false);
      resetForm();
      fetchDefeitos();
    }
    setSubmitting(false);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedDefeito) return;
    setUpdatingStatus(true);
    const updatePayload: any = {
      status: newStatus,
      avaliado_por: perfil?.nome || "Desconhecido",
      data_avaliacao_comercial: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (obsComercial.trim()) {
      updatePayload.observacao_comercial = obsComercial;
    }
    const { error } = await supabase.from("defeitos").update(updatePayload).eq("id", selectedDefeito.id);
    if (error) {
      toast.error("Erro ao atualizar status: " + error.message);
    } else {
      toast.success(`Status atualizado para ${newStatus}`);
      setSelectedDefeito(null);
      setObsComercial("");
      setDetailArquivos([]);
      fetchDefeitos();
    }
    setUpdatingStatus(false);
  };

  const downloadFile = async (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    a.click();
  };

  const downloadAll = async () => {
    for (const arq of detailArquivos) {
      downloadFile(arq.url, arq.nome_arquivo);
      await new Promise(r => setTimeout(r, 300));
    }
  };

  // Filtered defeitos for table
  const filteredDefeitos = useMemo(() => {
    return defeitos.filter(d => {
      if (d.tipo !== activeTab) return false;
      if (filterLoja !== "all" && d.loja !== filterLoja) return false;
      if (filterStatus !== "all" && d.status !== filterStatus) return false;
      if (filterDateStart && d.data_avaliacao < filterDateStart) return false;
      if (filterDateEnd && d.data_avaliacao > filterDateEnd) return false;
      return true;
    });
  }, [defeitos, activeTab, filterLoja, filterStatus, filterDateStart, filterDateEnd]);

  // Dashboard data
  const dashDefeitos = useMemo(() => {
    return defeitos.filter(d => {
      if (dashDateStart && d.data_avaliacao < dashDateStart) return false;
      if (dashDateEnd && d.data_avaliacao > dashDateEnd) return false;
      return true;
    });
  }, [defeitos, dashDateStart, dashDateEnd]);

  const kpis = useMemo(() => {
    const total = dashDefeitos.length;
    const aguardando = dashDefeitos.filter(d => d.status === "AGUARDANDO ANÁLISE").length;
    const autorizados = dashDefeitos.filter(d => d.status === "AUTORIZADO").length;
    const naoAutorizados = dashDefeitos.filter(d => d.status === "NÃO AUTORIZADO").length;
    const enviados = dashDefeitos.filter(d => d.status === "ENVIADO AO FORNECEDOR").length;
    return { total, aguardando, autorizados, naoAutorizados, enviados };
  }, [dashDefeitos]);

  const chartByLoja = useMemo(() => {
    const map: Record<string, number> = {};
    dashDefeitos.forEach(d => { map[d.loja] = (map[d.loja] || 0) + 1; });
    return Object.entries(map).map(([loja, count]) => ({ loja, count })).sort((a, b) => b.count - a.count);
  }, [dashDefeitos]);

  const chartByMotivo = useMemo(() => {
    const map: Record<string, number> = {};
    dashDefeitos.forEach(d => {
      const motivo = d.motivo_defeito.length > 30 ? d.motivo_defeito.slice(0, 30) + "…" : d.motivo_defeito;
      map[motivo] = (map[motivo] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [dashDefeitos]);

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

      {/* Main tabs: Defeitos | Dashboard (Admin/Comercial only) */}
      {isAdminOrComercial ? (
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)}>
          <TabsList>
            <TabsTrigger value="defeitos">Defeitos</TabsTrigger>
            <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" /> Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="defeitos">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "CLIENTE" | "LOJA")}>
              <TabsList>
                <TabsTrigger value="CLIENTE">Defeito Cliente</TabsTrigger>
                <TabsTrigger value="LOJA">Defeito Loja</TabsTrigger>
              </TabsList>

              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
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
                    <SelectItem value="AGUARDANDO ANÁLISE">Aguardando Análise</SelectItem>
                    <SelectItem value="AUTORIZADO">Autorizado</SelectItem>
                    <SelectItem value="NÃO AUTORIZADO">Não Autorizado</SelectItem>
                    <SelectItem value="ENVIADO AO FORNECEDOR">Enviado ao Fornecedor</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" placeholder="Data início" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} />
                <Input type="date" placeholder="Data fim" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} />
                <Button variant="outline" onClick={() => { setFilterLoja("all"); setFilterStatus("all"); setFilterDateStart(""); setFilterDateEnd(""); }}>Limpar</Button>
              </div>

              <TabsContent value="CLIENTE">
                <AdminDefeitosTable defeitos={filteredDefeitos} loading={loading} tipo="CLIENTE" onView={openDetail} />
              </TabsContent>
              <TabsContent value="LOJA">
                <AdminDefeitosTable defeitos={filteredDefeitos} loading={loading} tipo="LOJA" onView={openDetail} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="dashboard">
            <div className="space-y-6">
              <div className="flex gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Período início</Label>
                  <Input type="date" value={dashDateStart} onChange={e => setDashDateStart(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Período fim</Label>
                  <Input type="date" value={dashDateEnd} onChange={e => setDashDateEnd(e.target.value)} className="w-40" />
                </div>
                <Button variant="outline" size="sm" onClick={() => { setDashDateStart(""); setDashDateEnd(""); }}>Limpar</Button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{kpis.total}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Aguardando Análise</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-[#F5C800]">{kpis.aguardando}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Autorizados</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-green-500">{kpis.autorizados}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Não Autorizados</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-red-500">{kpis.naoAutorizados}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Enviados Fornecedor</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-blue-500">{kpis.enviados}</p></CardContent></Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Defeitos por Loja</CardTitle></CardHeader>
                  <CardContent>
                    {chartByLoja.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartByLoja} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="loja" width={80} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Defeitos" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Distribuição por Motivo</CardTitle></CardHeader>
                  <CardContent>
                    {chartByMotivo.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={chartByMotivo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                            {chartByMotivo.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        /* Lojas view */
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "CLIENTE" | "LOJA")}>
          <TabsList>
            <TabsTrigger value="CLIENTE">Defeito Cliente</TabsTrigger>
            <TabsTrigger value="LOJA">Defeito Loja</TabsTrigger>
          </TabsList>
          <TabsContent value="CLIENTE">
            <LojasDefeitosTable defeitos={filteredDefeitos} loading={loading} tipo="CLIENTE" />
          </TabsContent>
          <TabsContent value="LOJA">
            <LojasDefeitosTable defeitos={filteredDefeitos} loading={loading} tipo="LOJA" />
          </TabsContent>
        </Tabs>
      )}

      {/* Detail Modal (Admin/Comercial) */}
      <Dialog open={!!selectedDefeito} onOpenChange={(open) => { if (!open) { setSelectedDefeito(null); setDetailArquivos([]); setLightboxUrl(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Defeito — {selectedDefeito?.tipo === "CLIENTE" ? "Cliente" : "Loja"}</DialogTitle>
          </DialogHeader>
          {selectedDefeito && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="font-semibold">Loja:</span> {selectedDefeito.loja}</div>
                <div><span className="font-semibold">Responsável:</span> {selectedDefeito.nome_responsavel}</div>
                <div><span className="font-semibold">Tipo Produto:</span> {selectedDefeito.tipo_produto}</div>
                <div><span className="font-semibold">Data Avaliação:</span> {format(new Date(selectedDefeito.data_avaliacao), "dd/MM/yyyy")}</div>
                <div><span className="font-semibold">Referência:</span> {selectedDefeito.referencia_produto}</div>
                <div><span className="font-semibold">Código:</span> {selectedDefeito.codigo_produto || "—"}</div>
                <div className="col-span-2"><span className="font-semibold">Motivo:</span> {selectedDefeito.motivo_defeito}</div>
                <div><span className="font-semibold">Data Compra:</span> {format(new Date(selectedDefeito.data_compra), "dd/MM/yyyy")}</div>
                <div><span className="font-semibold">Responsável Envio:</span> {selectedDefeito.responsavel_envio}</div>

                {selectedDefeito.tipo === "CLIENTE" && (
                  <>
                    <div><span className="font-semibold">Cliente:</span> {selectedDefeito.nome_cliente || "—"}</div>
                    <div><span className="font-semibold">Ficha:</span> {selectedDefeito.ficha_cliente || "—"}</div>
                    <div><span className="font-semibold">Telefone:</span> {selectedDefeito.telefone || "—"}</div>
                    <div><span className="font-semibold">Nº Venda:</span> {selectedDefeito.numero_venda || "—"}</div>
                    <div><span className="font-semibold">Data Venda:</span> {selectedDefeito.data_venda ? format(new Date(selectedDefeito.data_venda), "dd/MM/yyyy") : "—"}</div>
                  </>
                )}

                <div className="col-span-2"><span className="font-semibold">Status:</span> {statusBadge(selectedDefeito.status)}</div>
                {selectedDefeito.avaliado_por && (
                  <div className="col-span-2"><span className="font-semibold">Avaliado por:</span> {selectedDefeito.avaliado_por} em {selectedDefeito.data_avaliacao_comercial ? format(new Date(selectedDefeito.data_avaliacao_comercial), "dd/MM/yyyy HH:mm") : "—"}</div>
                )}
              </div>

              {/* Galeria de Arquivos */}
              {detailArquivos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Fotos e Vídeos Anexados ({detailArquivos.length})</Label>
                    <Button size="sm" variant="outline" onClick={downloadAll}>
                      <Download className="h-4 w-4 mr-1" /> Baixar Todos
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {detailArquivos.map(arq => (
                      <div key={arq.id} className="relative group border rounded-lg overflow-hidden bg-muted">
                        {isImageFile(arq.nome_arquivo) ? (
                          <img
                            src={arq.url}
                            alt={arq.nome_arquivo}
                            className="w-full h-24 object-cover cursor-pointer"
                            onClick={() => setLightboxUrl(arq.url)}
                          />
                        ) : isVideoFile(arq.nome_arquivo) ? (
                          <video
                            src={arq.url}
                            className="w-full h-24 object-cover cursor-pointer"
                            onClick={() => setLightboxUrl(arq.url)}
                            muted
                          />
                        ) : (
                          <div className="w-full h-24 flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                            {arq.nome_arquivo}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                          {(isImageFile(arq.nome_arquivo) || isVideoFile(arq.nome_arquivo)) && (
                            <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => setLightboxUrl(arq.url)}>
                              <ZoomIn className="h-3 w-3" />
                            </Button>
                          )}
                          <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => downloadFile(arq.url, arq.nome_arquivo)}>
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate px-1 py-0.5">{arq.nome_arquivo}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Observação do Comercial</Label>
                <Textarea value={obsComercial} onChange={e => setObsComercial(e.target.value)} placeholder="Adicione observações..." />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleUpdateStatus("AUTORIZADO")} disabled={updatingStatus}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Autorizar
                </Button>
                <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={() => handleUpdateStatus("NÃO AUTORIZADO")} disabled={updatingStatus}>
                  <XCircle className="h-4 w-4 mr-1" /> Não Autorizar
                </Button>
                <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => handleUpdateStatus("ENVIADO AO FORNECEDOR")} disabled={updatingStatus}>
                  <Package className="h-4 w-4 mr-1" /> Enviado ao Fornecedor
                </Button>
                <Button size="sm" variant="outline" onClick={() => printDefeito(selectedDefeito)}>
                  <Printer className="h-4 w-4 mr-1" /> Imprimir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => { if (!open) setLightboxUrl(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
          {lightboxUrl && (
            isVideoFile(lightboxUrl) ? (
              <video src={lightboxUrl} controls autoPlay className="w-full max-h-[80vh] object-contain rounded" />
            ) : (
              <img src={lightboxUrl} alt="Ampliação" className="w-full max-h-[80vh] object-contain rounded" />
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Defeito — {activeTab === "CLIENTE" ? "Cliente" : "Loja"}</DialogTitle>
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
              <Label>Responsável pelo registro *</Label>
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

            {activeTab === "LOJA" && (
              <div className="space-y-2">
                <Label>Data da compra *</Label>
                <Input type="date" value={formDataCompra} onChange={e => setFormDataCompra(e.target.value)} />
              </div>
            )}

            {/* Upload de fotos e vídeos */}
            <div className="space-y-2 md:col-span-2">
              <Label>Fotos e Vídeos</Label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors w-full justify-center">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Clique para selecionar arquivos</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              {formFiles.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {formFiles.map((file, i) => (
                    <div key={i} className="relative border rounded-lg overflow-hidden bg-muted group">
                      {file.type.startsWith("image/") ? (
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-20 object-cover" />
                      ) : file.type.startsWith("video/") ? (
                        <video src={URL.createObjectURL(file)} className="w-full h-20 object-cover" muted />
                      ) : (
                        <div className="w-full h-20 flex items-center justify-center text-xs text-muted-foreground p-1 text-center">{file.name}</div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFormFile(i)}
                        className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <p className="text-[10px] text-muted-foreground truncate px-1">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
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

/* Admin/Comercial table with actions */
function AdminDefeitosTable({ defeitos, loading, tipo, onView }: { defeitos: Defeito[]; loading: boolean; tipo: string; onView: (d: Defeito) => void }) {
  if (loading) return <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>;
  if (defeitos.length === 0) return <Card><CardContent className="py-8 text-center text-muted-foreground"><AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhum defeito {tipo === "CLIENTE" ? "de cliente" : "de loja"} encontrado.</CardContent></Card>;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loja</TableHead>
                <TableHead>Data Avaliação</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responsável Envio</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defeitos.map(d => (
                <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onView(d)}>
                  <TableCell className="font-medium">{d.loja}</TableCell>
                  <TableCell>{format(new Date(d.data_avaliacao), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{d.referencia_produto}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{d.motivo_defeito}</TableCell>
                  <TableCell>{statusBadge(d.status)}</TableCell>
                  <TableCell>{d.responsavel_envio}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onView(d); }}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); printDefeito(d); }}><Printer className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* Lojas table (read-only, no actions except print) */
function LojasDefeitosTable({ defeitos, loading, tipo }: { defeitos: Defeito[]; loading: boolean; tipo: string }) {
  if (loading) return <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>;
  if (defeitos.length === 0) return <Card><CardContent className="py-8 text-center text-muted-foreground"><AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhum defeito {tipo === "CLIENTE" ? "de cliente" : "de loja"} registrado.</CardContent></Card>;

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
                <TableHead>Ações</TableHead>
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
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => printDefeito(d)}><Printer className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
