import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileText, BarChart3, Upload, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Promocao {
  id: string;
  nome: string;
  lojas: string[];
  data_inicio: string | null;
  data_fim: string | null;
  status: string | null;
  created_at: string | null;
}

interface Arquivo {
  id: string;
  promocao_id: string;
  tipo: string;
  nome_arquivo: string;
  url: string;
}

const LOJAS = [
  "Loja 4", "Loja 5", "Loja 6", "Loja 7", "Loja 8", "Loja 9",
  "Loja 10", "Loja 11", "Loja 12", "Loja 13", "Loja 14 (em breve)",
];

const STATUS_OPTIONS = ["ATIVA", "A INICIAR", "ENCERRADA"];

function StatusBadge({ status }: { status: string | null }) {
  const s = status || "ATIVA";
  const colors: Record<string, string> = {
    "ATIVA": "bg-green-500 text-white",
    "A INICIAR": "bg-yellow-500 text-black",
    "ENCERRADA": "bg-gray-700 text-white",
  };
  return <Badge className={colors[s] || "bg-muted text-muted-foreground"}>{s}</Badge>;
}

export default function Promocoes() {
  const { perfil } = useAuth();
  const isAdmin = perfil?.perfil === "Admin";

  const [promocoes, setPromocoes] = useState<Promocao[]>([]);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [lojasSel, setLojasSel] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [status, setStatus] = useState("ATIVA");
  const [saldoFile, setSaldoFile] = useState<File | null>(null);
  const [historicoFile, setHistoricoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const saldoRef = useRef<HTMLInputElement>(null);
  const historicoRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from("promocoes").select("*").order("created_at", { ascending: false }),
      supabase.from("promocoes_arquivos").select("*"),
    ]);
    setPromocoes((p as Promocao[]) || []);
    setArquivos((a as Arquivo[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    return promocoes.filter((p) => {
      const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "Todos" || p.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [promocoes, search, filterStatus]);

  const getArquivo = (promocaoId: string, tipo: string) =>
    arquivos.find((a) => a.promocao_id === promocaoId && a.tipo === tipo);

  const resetModal = () => {
    setEditingId(null);
    setNome("");
    setLojasSel([]);
    setDataInicio("");
    setDataFim("");
    setStatus("ATIVA");
    setSaldoFile(null);
    setHistoricoFile(null);
  };

  const openCreate = () => { resetModal(); setModalOpen(true); };

  const openEdit = (p: Promocao) => {
    setEditingId(p.id);
    setNome(p.nome);
    setLojasSel(p.lojas || []);
    setDataInicio(p.data_inicio || "");
    setDataFim(p.data_fim || "");
    setStatus(p.status || "ATIVA");
    setSaldoFile(null);
    setHistoricoFile(null);
    setModalOpen(true);
  };

  const uploadFile = async (file: File, promocaoId: string, tipo: string) => {
    const ext = file.name.split(".").pop();
    const path = `${promocaoId}/${tipo}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("promocoes").upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    const { data: urlData } = supabase.storage.from("promocoes").getPublicUrl(path);
    const url = urlData.publicUrl;

    // Delete existing arquivo record for this tipo
    const existing = arquivos.find((a) => a.promocao_id === promocaoId && a.tipo === tipo);
    if (existing) {
      await supabase.from("promocoes_arquivos").delete().eq("id", existing.id);
      // Delete old file from storage
      const oldPath = existing.url.split("/promocoes/")[1];
      if (oldPath) await supabase.storage.from("promocoes").remove([oldPath]);
    }

    await supabase.from("promocoes_arquivos").insert({
      promocao_id: promocaoId,
      tipo,
      nome_arquivo: file.name,
      url,
    });
  };

  const handleSave = async () => {
    if (!nome.trim() || lojasSel.length === 0) {
      toast.error("Preencha o nome e selecione ao menos uma loja.");
      return;
    }
    setSaving(true);
    try {
      let promocaoId = editingId;
      if (editingId) {
        const { error } = await supabase.from("promocoes").update({
          nome, lojas: lojasSel, data_inicio: dataInicio || null, data_fim: dataFim || null, status,
        }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("promocoes").insert({
          nome, lojas: lojasSel, data_inicio: dataInicio || null, data_fim: dataFim || null, status,
        }).select("id").single();
        if (error) throw error;
        promocaoId = data.id;
      }

      if (saldoFile && promocaoId) await uploadFile(saldoFile, promocaoId, "SALDO");
      if (historicoFile && promocaoId) await uploadFile(historicoFile, promocaoId, "HISTORICO");

      toast.success(editingId ? "Promoção atualizada!" : "Promoção criada!");
      setModalOpen(false);
      resetModal();
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta promoção?")) return;
    // Delete storage files
    const relatedFiles = arquivos.filter((a) => a.promocao_id === id);
    for (const f of relatedFiles) {
      const path = f.url.split("/promocoes/")[1];
      if (path) await supabase.storage.from("promocoes").remove([path]);
    }
    const { error } = await supabase.from("promocoes").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir."); return; }
    toast.success("Promoção excluída!");
    fetchData();
  };

  const handleFileReplace = async (promocaoId: string, tipo: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.pdf";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await uploadFile(file, promocaoId, tipo);
        toast.success("Arquivo substituído!");
        fetchData();
      } catch (err: any) {
        toast.error(err.message || "Erro ao substituir arquivo.");
      }
    };
    input.click();
  };

  const toggleLoja = (loja: string) => {
    setLojasSel((prev) =>
      prev.includes(loja) ? prev.filter((l) => l !== loja) : [...prev, loja]
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Promoções</h1>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Promoção
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar promoção..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os Status</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma promoção encontrada.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const saldo = getArquivo(p.id, "SALDO");
            const historico = getArquivo(p.id, "HISTORICO");
            return (
              <Card key={p.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{p.nome}</CardTitle>
                    <StatusBadge status={p.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Lojas */}
                  <div className="flex flex-wrap gap-1.5">
                    {p.lojas.map((l) => (
                      <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>
                    ))}
                  </div>

                  {/* Dates */}
                  <div className="text-sm text-muted-foreground">
                    {p.data_inicio && <span>Início: {format(new Date(p.data_inicio + "T00:00:00"), "dd/MM/yyyy")}</span>}
                    {p.data_inicio && p.data_fim && <span className="mx-2">•</span>}
                    {p.data_fim && <span>Fim: {format(new Date(p.data_fim + "T00:00:00"), "dd/MM/yyyy")}</span>}
                  </div>

                  {/* File buttons */}
                  <div className="flex flex-wrap gap-2">
                    {saldo ? (
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="gap-1.5" asChild>
                          <a href={saldo.url} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-3.5 w-3.5" /> Saldo Inicial
                          </a>
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="sm" onClick={() => handleFileReplace(p.id, "SALDO")} title="Substituir arquivo">
                            <Upload className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ) : isAdmin ? (
                      <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => handleFileReplace(p.id, "SALDO")}>
                        <Upload className="h-3.5 w-3.5" /> Upload Saldo
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-xs">Sem saldo</Badge>
                    )}

                    {historico ? (
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="gap-1.5" asChild>
                          <a href={historico.url} target="_blank" rel="noopener noreferrer">
                            <BarChart3 className="h-3.5 w-3.5" /> Histórico
                          </a>
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="sm" onClick={() => handleFileReplace(p.id, "HISTORICO")} title="Substituir arquivo">
                            <Upload className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ) : isAdmin ? (
                      <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => handleFileReplace(p.id, "HISTORICO")}>
                        <Upload className="h-3.5 w-3.5" /> Upload Histórico
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-xs">Sem histórico</Badge>
                    )}
                  </div>

                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="gap-1.5 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) { setModalOpen(false); resetModal(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Promoção" : "Nova Promoção"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Promoção *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da promoção" />
            </div>

            <div>
              <Label>Lojas Participantes *</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {LOJAS.map((l) => (
                  <Badge
                    key={l}
                    variant={lojasSel.includes(l) ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleLoja(l)}
                  >
                    {l}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data Início</Label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Arquivo de Saldo (.xlsx, .pdf)</Label>
              <Input ref={saldoRef} type="file" accept=".xlsx,.pdf" onChange={(e) => setSaldoFile(e.target.files?.[0] || null)} />
            </div>

            <div>
              <Label>Arquivo de Histórico/Fechamento (.xlsx, .pdf)</Label>
              <Input ref={historicoRef} type="file" accept=".xlsx,.pdf" onChange={(e) => setHistoricoFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalOpen(false); resetModal(); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
