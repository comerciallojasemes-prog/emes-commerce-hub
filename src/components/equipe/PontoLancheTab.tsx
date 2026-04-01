import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Coffee, FileText, AlertTriangle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInMinutes } from "date-fns";

interface PontoLanche {
  id: string;
  colaborador_id: string;
  colaborador_nome: string;
  data: string;
  pausa: string;
  saida: string | null;
  retorno: string | null;
  duracao_minutos: number | null;
  status: string;
  editado_por: string | null;
  created_at: string;
}

const MAX_MINUTOS = 10;

function statusBadge(status: string) {
  switch (status) {
    case "EM PAUSA": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">🟡 EM PAUSA</Badge>;
    case "RETORNOU": return <Badge className="bg-green-500 hover:bg-green-600 text-white">🟢 RETORNOU</Badge>;
    case "EXCEDEU": return <Badge variant="destructive">🔴 EXCEDEU</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function PontoLancheTab() {
  const { user, perfil } = useAuth();
  const isAdmin = perfil?.perfil === "Admin" || perfil?.email === "andreia@portalcomercial.com";
  const isComercial = perfil?.perfil === "Comercial";

  const [pontos, setPontos] = useState<PontoLanche[]>([]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState<Record<string, number>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Filters (admin)
  const [filterColab, setFilterColab] = useState("all");
  const [filterData, setFilterData] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Edit dialog
  const [editPonto, setEditPonto] = useState<PontoLanche | null>(null);
  const [editSaida, setEditSaida] = useState("");
  const [editRetorno, setEditRetorno] = useState("");

  const fetchPontos = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("ponto_lanche").select("*").order("created_at", { ascending: false });

    if (!isAdmin && user) {
      query = query.eq("colaborador_id", user.id);
    }

    const { data, error } = await query;
    if (error) { toast.error("Erro ao carregar registros"); setLoading(false); return; }
    setPontos((data || []) as PontoLanche[]);
    setLoading(false);
  }, [isAdmin, user]);

  useEffect(() => { fetchPontos(); }, [fetchPontos]);

  // Timer for active pauses
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const activePauses = pontos.filter(p => p.status === "EM PAUSA" && p.saida);
    if (activePauses.length === 0) return;

    const tick = () => {
      const now = new Date();
      const t: Record<string, number> = {};
      activePauses.forEach(p => {
        if (p.saida) {
          const elapsed = differenceInMinutes(now, new Date(p.saida));
          t[p.id] = elapsed;
        }
      });
      setTimer(t);
    };
    tick();
    timerRef.current = setInterval(tick, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pontos]);

  const today = format(new Date(), "yyyy-MM-dd");

  const canStartPause = (pausa: string) => {
    if (!user) return false;
    return !pontos.some(p => p.colaborador_id === user.id && p.data === today && p.pausa === pausa);
  };

  const hasActivePause = () => {
    if (!user) return false;
    return pontos.some(p => p.colaborador_id === user.id && p.status === "EM PAUSA");
  };

  const handleIniciarPausa = async (pausa: "MANHÃ" | "TARDE") => {
    if (!user || !perfil) return;
    const { error } = await supabase.from("ponto_lanche").insert({
      colaborador_id: user.id,
      colaborador_nome: perfil.nome,
      data: today,
      pausa,
      saida: new Date().toISOString(),
      status: "EM PAUSA",
    });
    if (error) { toast.error("Erro ao iniciar pausa"); return; }
    toast.success(`Pausa ${pausa} iniciada!`);
    fetchPontos();
  };

  const handleRetornar = async () => {
    if (!user) return;
    const active = pontos.find(p => p.colaborador_id === user.id && p.status === "EM PAUSA");
    if (!active || !active.saida) return;

    const retorno = new Date();
    const duracao = differenceInMinutes(retorno, new Date(active.saida));
    const status = duracao > MAX_MINUTOS ? "EXCEDEU" : "RETORNOU";

    const { error } = await supabase.from("ponto_lanche").update({
      retorno: retorno.toISOString(),
      duracao_minutos: duracao,
      status,
    }).eq("id", active.id);

    if (error) { toast.error("Erro ao registrar retorno"); return; }
    toast.success(status === "EXCEDEU" ? "Pausa excedeu o limite de 10 minutos!" : "Retorno registrado!");
    fetchPontos();
  };

  const handleSaveEdit = async () => {
    if (!editPonto || !perfil) return;
    const saida = editSaida ? new Date(editSaida) : null;
    const retorno = editRetorno ? new Date(editRetorno) : null;
    let duracao: number | null = null;
    let status = editPonto.status;

    if (saida && retorno) {
      duracao = differenceInMinutes(retorno, saida);
      status = duracao > MAX_MINUTOS ? "EXCEDEU" : "RETORNOU";
    } else if (saida && !retorno) {
      status = "EM PAUSA";
    }

    const { error } = await supabase.from("ponto_lanche").update({
      saida: saida?.toISOString() || null,
      retorno: retorno?.toISOString() || null,
      duracao_minutos: duracao,
      status,
      editado_por: perfil.nome,
    }).eq("id", editPonto.id);

    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Registro atualizado!");
    setEditPonto(null);
    fetchPontos();
  };

  const handleExportPDF = () => {
    const filtered = getFilteredPontos();
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let rows = filtered.map(p => `
      <tr>
        <td>${format(new Date(p.data), "dd/MM/yyyy")}</td>
        <td>${p.colaborador_nome}</td>
        <td>${p.pausa}</td>
        <td>${p.saida ? format(new Date(p.saida), "HH:mm") : "-"}</td>
        <td>${p.retorno ? format(new Date(p.retorno), "HH:mm") : "-"}</td>
        <td>${p.duracao_minutos != null ? `${p.duracao_minutos} min` : "-"}</td>
        <td>${p.status}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html><head><title>Relatório Ponto de Lanche</title>
      <style>body{font-family:Arial;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:6px;font-size:12px;}th{background:#f0f0f0;}</style>
      </head><body>
      <h2>Relatório - Ponto de Lanche</h2>
      <table><tr><th>Data</th><th>Colaborador</th><th>Pausa</th><th>Saída</th><th>Retorno</th><th>Duração</th><th>Status</th></tr>${rows}</table>
      <script>window.print();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const getFilteredPontos = () => {
    return pontos.filter(p => {
      if (filterColab !== "all" && p.colaborador_nome !== filterColab) return false;
      if (filterData && p.data !== filterData) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      return true;
    });
  };

  const todayPontos = pontos.filter(p => p.data === today);
  const excedeuHoje = todayPontos.filter(p => p.status === "EXCEDEU").length;
  const colaboradores = [...new Set(pontos.map(p => p.colaborador_nome))];

  // Comercial view
  if (isComercial) {
    const activePause = pontos.find(p => p.colaborador_id === user?.id && p.status === "EM PAUSA");
    const myPontos = pontos.filter(p => p.colaborador_id === user?.id);

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Controle de Pausa</CardTitle>
          </CardHeader>
          <CardContent>
            {activePause ? (
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="font-medium">Pausa {activePause.pausa} em andamento</span>
                  {timer[activePause.id] != null && (
                    <span className={`ml-2 font-bold ${timer[activePause.id] > MAX_MINUTOS ? "text-destructive" : "text-green-600"}`}>
                      {timer[activePause.id]} min
                    </span>
                  )}
                </div>
                <Button onClick={handleRetornar} size="sm">Registrar Retorno</Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleIniciarPausa("MANHÃ")}
                  disabled={!canStartPause("MANHÃ") || hasActivePause()}
                  variant="outline"
                >
                  <Coffee className="h-4 w-4 mr-2" />Iniciar Pausa Manhã
                </Button>
                <Button
                  onClick={() => handleIniciarPausa("TARDE")}
                  disabled={!canStartPause("TARDE") || hasActivePause()}
                  variant="outline"
                >
                  <Coffee className="h-4 w-4 mr-2" />Iniciar Pausa Tarde
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Meu Histórico</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Pausa</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Retorno</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myPontos.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.data), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{p.pausa}</TableCell>
                    <TableCell>{p.saida ? format(new Date(p.saida), "HH:mm") : "-"}</TableCell>
                    <TableCell>{p.retorno ? format(new Date(p.retorno), "HH:mm") : "-"}</TableCell>
                    <TableCell>{p.duracao_minutos != null ? `${p.duracao_minutos} min` : "-"}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                  </TableRow>
                ))}
                {myPontos.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum registro</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin view
  const filtered = getFilteredPontos();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Pausas hoje</p>
            <p className="text-2xl font-bold">{todayPontos.length}</p>
          </CardContent>
        </Card>
        <Card className={excedeuHoje > 0 ? "border-destructive" : ""}>
          <CardContent className="pt-4 flex items-center gap-2">
            <div>
              <p className="text-sm text-muted-foreground">Excederam hoje</p>
              <p className="text-2xl font-bold text-destructive">{excedeuHoje}</p>
            </div>
            {excedeuHoje > 0 && <AlertTriangle className="h-5 w-5 text-destructive" />}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterColab} onValueChange={setFilterColab}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Colaborador" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {colaboradores.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={filterData} onChange={e => setFilterData(e.target.value)} className="w-[160px]" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="EM PAUSA">EM PAUSA</SelectItem>
            <SelectItem value="RETORNOU">RETORNOU</SelectItem>
            <SelectItem value="EXCEDEU">EXCEDEU</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExportPDF}><FileText className="h-4 w-4 mr-2" />Exportar PDF</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-4 text-muted-foreground text-sm">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Pausa</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Retorno</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.data), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{p.colaborador_nome}</TableCell>
                    <TableCell>{p.pausa}</TableCell>
                    <TableCell>{p.saida ? format(new Date(p.saida), "HH:mm") : "-"}</TableCell>
                    <TableCell>{p.retorno ? format(new Date(p.retorno), "HH:mm") : "-"}</TableCell>
                    <TableCell className={p.duracao_minutos != null && p.duracao_minutos > MAX_MINUTOS ? "text-destructive font-bold" : ""}>
                      {p.duracao_minutos != null ? `${p.duracao_minutos} min` : "-"}
                    </TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditPonto(p);
                        setEditSaida(p.saida ? format(new Date(p.saida), "yyyy-MM-dd'T'HH:mm") : "");
                        setEditRetorno(p.retorno ? format(new Date(p.retorno), "yyyy-MM-dd'T'HH:mm") : "");
                      }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum registro</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editPonto} onOpenChange={open => !open && setEditPonto(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Registro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Colaborador</Label>
              <Input disabled value={editPonto?.colaborador_nome || ""} />
            </div>
            <div>
              <Label>Saída</Label>
              <Input type="datetime-local" value={editSaida} onChange={e => setEditSaida(e.target.value)} />
            </div>
            <div>
              <Label>Retorno</Label>
              <Input type="datetime-local" value={editRetorno} onChange={e => setEditRetorno(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPonto(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
