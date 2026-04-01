import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";

const COLABORADORES = [
  "Leniton Garcia",
  "Willes Ferreira",
  "Luis Fernando",
  "Girlane Santos",
  "Marcela Guimarães",
];

interface EscalaEntry {
  id?: string;
  mes: number;
  ano: number;
  colaborador: string;
  dia: number;
  turno: string | null;
  folga: boolean;
}

export default function EscalaTab() {
  const { perfil } = useAuth();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [data, setData] = useState<Record<string, EscalaEntry>>({});
  const [loading, setLoading] = useState(false);

  const isEditor = perfil?.perfil === "Admin" || perfil?.email === "andreia@portalcomercial.com";
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const key = (colab: string, dia: number) => `${colab}::${dia}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("escala")
      .select("*")
      .eq("mes", mes)
      .eq("ano", ano);

    if (error) {
      toast.error("Erro ao carregar escala");
      setLoading(false);
      return;
    }

    const map: Record<string, EscalaEntry> = {};
    (rows || []).forEach((r: any) => {
      map[key(r.colaborador, r.dia)] = r;
    });
    setData(map);
    setLoading(false);
  }, [mes, ano]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCellChange = async (colab: string, dia: number, value: string) => {
    const k = key(colab, dia);
    const isFolga = value.toUpperCase() === "FOLGA";
    const existing = data[k];

    const entry: any = {
      mes, ano, colaborador: colab, dia,
      turno: isFolga ? null : (value || null),
      folga: isFolga,
    };

    if (existing?.id) {
      const { error } = await supabase.from("escala").update(entry).eq("id", existing.id);
      if (error) { toast.error("Erro ao salvar"); return; }
    } else if (value.trim()) {
      const { error } = await supabase.from("escala").insert(entry);
      if (error) { toast.error("Erro ao salvar"); return; }
    }
    fetchData();
  };

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let tableHTML = `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:10px;">`;
    tableHTML += `<tr><th style="background:#f0f0f0;">Colaborador</th>`;
    for (let d = 1; d <= diasNoMes; d++) tableHTML += `<th style="background:#f0f0f0;min-width:30px;">${d}</th>`;
    tableHTML += `</tr>`;

    COLABORADORES.forEach(colab => {
      tableHTML += `<tr><td style="font-weight:bold;white-space:nowrap;">${colab}</td>`;
      for (let d = 1; d <= diasNoMes; d++) {
        const entry = data[key(colab, d)];
        const bg = entry?.folga ? "#FEF9C3" : "white";
        const text = entry?.folga ? "FOLGA" : (entry?.turno || "");
        tableHTML += `<td style="background:${bg};text-align:center;">${text}</td>`;
      }
      tableHTML += `</tr>`;
    });
    tableHTML += `</table>`;

    printWindow.document.write(`
      <html><head><title>Escala ${meses[mes - 1]} ${ano}</title>
      <style>@page{size:landscape;}body{font-family:Arial;padding:20px;}h1{font-size:16px;}</style>
      </head><body>
      <h1>Escala - ${meses[mes - 1]} ${ano}</h1>
      ${tableHTML}
      <script>window.print();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const prevMonth = () => {
    if (mes === 1) { setMes(12); setAno(ano - 1); }
    else setMes(mes - 1);
  };
  const nextMonth = () => {
    if (mes === 12) { setMes(1); setAno(ano + 1); }
    else setMes(mes + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <Select value={String(mes)} onValueChange={v => setMes(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {meses.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Button variant="outline" onClick={handleExportPDF}><FileText className="h-4 w-4 mr-2" />Exportar PDF</Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{meses[mes - 1]} {ano}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <p className="p-4 text-muted-foreground text-sm">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">Colaborador</TableHead>
                  {Array.from({ length: diasNoMes }, (_, i) => (
                    <TableHead key={i} className="text-center min-w-[50px] px-1">{i + 1}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {COLABORADORES.map(colab => (
                  <TableRow key={colab}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium whitespace-nowrap">{colab}</TableCell>
                    {Array.from({ length: diasNoMes }, (_, i) => {
                      const d = i + 1;
                      const entry = data[key(colab, d)];
                      const isFolga = entry?.folga;
                      const cellValue = isFolga ? "FOLGA" : (entry?.turno || "");

                      return (
                        <TableCell key={d} className={`p-0.5 text-center ${isFolga ? "bg-yellow-100 dark:bg-yellow-900/30" : ""}`}>
                          {isEditor ? (
                            <Input
                              className="h-7 w-full min-w-[45px] text-xs text-center px-0.5"
                              defaultValue={cellValue}
                              onBlur={e => {
                                if (e.target.value !== cellValue) handleCellChange(colab, d, e.target.value);
                              }}
                              onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                            />
                          ) : (
                            <span className="text-xs">{cellValue}</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
