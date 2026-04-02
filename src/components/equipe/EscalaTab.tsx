import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface EscalaMensal {
  id?: string;
  mes: number;
  ano: number;
  colaborador: string;
  tipo_escala: string;
  horario_fixo: string | null;
  horario_quinzenal_1: string | null;
  horario_quinzenal_2: string | null;
  horario_semanal: string | null;
}

interface EscalaSabado {
  id?: string;
  mes: number;
  ano: number;
  data: string;
  turno_8_12: string | null;
  turno_10_14: string | null;
  turno_14_19: string | null;
  extra: boolean;
}

function getSabados(ano: number, mes: number): string[] {
  const result: string[] = [];
  const diasNoMes = new Date(ano, mes, 0).getDate();
  for (let d = 1; d <= diasNoMes; d++) {
    const date = new Date(ano, mes - 1, d);
    if (date.getDay() === 6) {
      result.push(date.toISOString().split("T")[0]);
    }
  }
  return result;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function EscalaTab() {
  const { perfil } = useAuth();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [mensal, setMensal] = useState<EscalaMensal[]>([]);
  const [sabados, setSabados] = useState<EscalaSabado[]>([]);
  const [loading, setLoading] = useState(false);

  const isEditor = perfil?.perfil === "Admin" || perfil?.email === "andreia@portalcomercial.com";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [resMensal, resSabados] = await Promise.all([
      supabase.from("escala_mensal").select("*").eq("mes", mes).eq("ano", ano),
      supabase.from("escala_sabados").select("*").eq("mes", mes).eq("ano", ano).order("data"),
    ]);

    if (resMensal.error || resSabados.error) {
      toast.error("Erro ao carregar escala");
      setLoading(false);
      return;
    }

    setMensal((resMensal.data || []) as EscalaMensal[]);

    // Merge DB rows with auto-generated saturdays
    const sabadosAuto = getSabados(ano, mes);
    const dbRows = (resSabados.data || []) as EscalaSabado[];
    const dbMap = new Map(dbRows.map(r => [r.data, r]));

    const merged: EscalaSabado[] = sabadosAuto.map(dt => dbMap.get(dt) || {
      mes, ano, data: dt, turno_8_12: null, turno_10_14: null, turno_14_19: null, extra: false,
    });
    // Add extra dates that aren't regular saturdays
    dbRows.filter(r => r.extra && !sabadosAuto.includes(r.data)).forEach(r => merged.push(r));
    merged.sort((a, b) => a.data.localeCompare(b.data));

    setSabados(merged);
    setLoading(false);
  }, [mes, ano]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => { if (mes === 1) { setMes(12); setAno(ano - 1); } else setMes(mes - 1); };
  const nextMonth = () => { if (mes === 12) { setMes(1); setAno(ano + 1); } else setMes(mes + 1); };

  // --- MENSAL handlers ---
  const addColaborador = async () => {
    const entry: any = { mes, ano, colaborador: "", tipo_escala: "FIXO", horario_fixo: null, horario_quinzenal_1: null, horario_quinzenal_2: null, horario_semanal: null };
    const { error } = await supabase.from("escala_mensal").insert(entry);
    if (error) { toast.error("Erro ao adicionar"); return; }
    fetchData();
  };

  const updateMensal = async (row: EscalaMensal, field: string, value: string) => {
    if (!row.id) return;
    const update: any = { [field]: value || null };
    // Clear irrelevant fields when changing tipo
    if (field === "tipo_escala") {
      if (value === "FIXO") { update.horario_quinzenal_1 = null; update.horario_quinzenal_2 = null; update.horario_semanal = null; }
      else if (value === "QUINZENAL") { update.horario_fixo = null; update.horario_semanal = null; }
      else if (value === "SEMANAL") { update.horario_fixo = null; update.horario_quinzenal_1 = null; update.horario_quinzenal_2 = null; }
    }
    const { error } = await supabase.from("escala_mensal").update(update).eq("id", row.id);
    if (error) { toast.error("Erro ao salvar"); return; }
    fetchData();
  };

  const deleteMensal = async (id: string) => {
    const { error } = await supabase.from("escala_mensal").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    fetchData();
  };

  // --- SABADOS handlers ---
  const upsertSabado = async (row: EscalaSabado, field: string, value: string) => {
    if (row.id) {
      const { error } = await supabase.from("escala_sabados").update({ [field]: value || null }).eq("id", row.id);
      if (error) { toast.error("Erro ao salvar"); return; }
    } else {
      const entry: any = { mes, ano, data: row.data, extra: row.extra, [field]: value || null };
      const { error } = await supabase.from("escala_sabados").insert(entry);
      if (error) { toast.error("Erro ao salvar"); return; }
    }
    fetchData();
  };

  const addDataExtra = () => {
    const dateStr = prompt("Informe a data extra (DD/MM/AAAA):");
    if (!dateStr) return;
    const parts = dateStr.split("/");
    if (parts.length !== 3) { toast.error("Formato inválido. Use DD/MM/AAAA"); return; }
    const isoDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    const newRow: EscalaSabado = { mes, ano, data: isoDate, turno_8_12: null, turno_10_14: null, turno_14_19: null, extra: true };
    // Insert immediately
    supabase.from("escala_sabados").insert({ mes, ano, data: isoDate, extra: true } as any).then(({ error }) => {
      if (error) { toast.error("Erro ao adicionar data extra"); return; }
      fetchData();
    });
  };

  const deleteSabado = async (id: string) => {
    const { error } = await supabase.from("escala_sabados").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    fetchData();
  };

  // --- PDF ---
  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let html = `<h2>Escala Mensal — ${MESES[mes - 1]} ${ano}</h2>`;
    html += `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:11px;margin-bottom:30px;">`;
    html += `<tr style="background:#f0f0f0;"><th>Escala</th><th>Colaborador</th><th>Horário</th></tr>`;
    mensal.forEach(r => {
      let horario = "";
      if (r.tipo_escala === "FIXO") horario = r.horario_fixo || "";
      else if (r.tipo_escala === "QUINZENAL") horario = `Dia 01-15: ${r.horario_quinzenal_1 || ""} | Dia 16-31: ${r.horario_quinzenal_2 || ""}`;
      else horario = r.horario_semanal || "";
      html += `<tr><td>${r.tipo_escala}</td><td>${r.colaborador}</td><td>${horario}</td></tr>`;
    });
    html += `</table>`;

    html += `<h2>Escala de Sábados — ${MESES[mes - 1]} ${ano}</h2>`;
    html += `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:11px;">`;
    html += `<tr style="background:#f0f0f0;"><th>Data</th><th>8h às 12h</th><th>10h às 14h</th><th>14h às 19h</th></tr>`;
    sabados.forEach(r => {
      const label = r.extra ? `${formatDate(r.data)} (Extra)` : formatDate(r.data);
      html += `<tr><td>${label}</td><td>${r.turno_8_12 || ""}</td><td>${r.turno_10_14 || ""}</td><td>${r.turno_14_19 || ""}</td></tr>`;
    });
    html += `</table>`;

    printWindow.document.write(`<html><head><title>Escala ${MESES[mes - 1]} ${ano}</title>
      <style>@page{size:landscape;}body{font-family:Arial;padding:20px;}h2{font-size:14px;margin-top:0;}</style>
      </head><body>${html}<script>window.print();</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Month/Year selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <Select value={String(mes)} onValueChange={v => setMes(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>{[2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Button variant="outline" onClick={handleExportPDF}><FileText className="h-4 w-4 mr-2" />Exportar Escala PDF</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        <>
          {/* SECTION 1 — ESCALA MENSAL */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Escala Mensal — {MESES[mes - 1]} {ano}</CardTitle>
              {isEditor && (
                <Button size="sm" onClick={addColaborador}><Plus className="h-4 w-4 mr-1" />Adicionar Colaborador</Button>
              )}
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Escala</TableHead>
                    <TableHead className="w-[180px]">Colaborador</TableHead>
                    <TableHead>Horário</TableHead>
                    {isEditor && <TableHead className="w-[60px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mensal.length === 0 && (
                    <TableRow><TableCell colSpan={isEditor ? 4 : 3} className="text-center text-muted-foreground text-sm">Nenhum colaborador adicionado</TableCell></TableRow>
                  )}
                  {mensal.map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="p-1">
                        {isEditor ? (
                          <Select value={row.tipo_escala} onValueChange={v => updateMensal(row, "tipo_escala", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FIXO">FIXO</SelectItem>
                              <SelectItem value="QUINZENAL">QUINZENAL</SelectItem>
                              <SelectItem value="SEMANAL">SEMANAL</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs font-medium">{row.tipo_escala}</span>
                        )}
                      </TableCell>
                      <TableCell className="p-1">
                        {isEditor ? (
                          <Input className="h-8 text-xs" defaultValue={row.colaborador}
                            onBlur={e => { if (e.target.value !== row.colaborador) updateMensal(row, "colaborador", e.target.value); }}
                            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                        ) : (
                          <span className="text-xs">{row.colaborador}</span>
                        )}
                      </TableCell>
                      <TableCell className="p-1">
                        {row.tipo_escala === "FIXO" && (
                          isEditor ? (
                            <Input className="h-8 text-xs" placeholder="Ex: 8h às 18h" defaultValue={row.horario_fixo || ""}
                              onBlur={e => { if (e.target.value !== (row.horario_fixo || "")) updateMensal(row, "horario_fixo", e.target.value); }}
                              onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                          ) : <span className="text-xs">{row.horario_fixo || ""}</span>
                        )}
                        {row.tipo_escala === "QUINZENAL" && (
                          <div className="flex gap-2">
                            {isEditor ? (
                              <>
                                <div className="flex-1">
                                  <label className="text-[10px] text-muted-foreground">Dia 01 a 15</label>
                                  <Input className="h-8 text-xs" defaultValue={row.horario_quinzenal_1 || ""}
                                    onBlur={e => { if (e.target.value !== (row.horario_quinzenal_1 || "")) updateMensal(row, "horario_quinzenal_1", e.target.value); }}
                                    onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[10px] text-muted-foreground">Dia 16 a 31</label>
                                  <Input className="h-8 text-xs" defaultValue={row.horario_quinzenal_2 || ""}
                                    onBlur={e => { if (e.target.value !== (row.horario_quinzenal_2 || "")) updateMensal(row, "horario_quinzenal_2", e.target.value); }}
                                    onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                                </div>
                              </>
                            ) : (
                              <span className="text-xs">01-15: {row.horario_quinzenal_1 || "—"} | 16-31: {row.horario_quinzenal_2 || "—"}</span>
                            )}
                          </div>
                        )}
                        {row.tipo_escala === "SEMANAL" && (
                          isEditor ? (
                            <Input className="h-8 text-xs" placeholder="Ex: 1ª 9h-19h / 2ª 7h-17h" defaultValue={row.horario_semanal || ""}
                              onBlur={e => { if (e.target.value !== (row.horario_semanal || "")) updateMensal(row, "horario_semanal", e.target.value); }}
                              onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                          ) : <span className="text-xs">{row.horario_semanal || ""}</span>
                        )}
                      </TableCell>
                      {isEditor && (
                        <TableCell className="p-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => row.id && deleteMensal(row.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* SECTION 2 — ESCALA DE SÁBADOS */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Escala de Sábados — {MESES[mes - 1]} {ano}</CardTitle>
              {isEditor && (
                <Button size="sm" variant="outline" onClick={addDataExtra}><Plus className="h-4 w-4 mr-1" />Adicionar Data Extra</Button>
              )}
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Data</TableHead>
                    <TableHead>8h às 12h</TableHead>
                    <TableHead>10h às 14h</TableHead>
                    <TableHead>14h às 19h</TableHead>
                    {isEditor && <TableHead className="w-[60px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sabados.length === 0 && (
                    <TableRow><TableCell colSpan={isEditor ? 5 : 4} className="text-center text-muted-foreground text-sm">Nenhum sábado no período</TableCell></TableRow>
                  )}
                  {sabados.map((row, idx) => (
                    <TableRow key={row.id || `new-${idx}`}>
                      <TableCell className="p-1 whitespace-nowrap text-xs font-medium">
                        {formatDate(row.data)}{row.extra && <span className="ml-1 text-[10px] text-muted-foreground">(Extra)</span>}
                      </TableCell>
                      {(["turno_8_12", "turno_10_14", "turno_14_19"] as const).map(field => (
                        <TableCell key={field} className="p-1">
                          {isEditor ? (
                            <Input className="h-8 text-xs" defaultValue={row[field] || ""}
                              onBlur={e => { if (e.target.value !== (row[field] || "")) upsertSabado(row, field, e.target.value); }}
                              onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                          ) : (
                            <span className="text-xs">{row[field] || ""}</span>
                          )}
                        </TableCell>
                      ))}
                      {isEditor && (
                        <TableCell className="p-1">
                          {row.extra && row.id && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSabado(row.id!)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
