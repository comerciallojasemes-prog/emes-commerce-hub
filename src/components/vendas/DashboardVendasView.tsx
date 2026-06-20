import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ChevronDown, ChevronRight, FileDown, FileText, Eraser, ArrowUpDown } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

const LOJAS = ["Loja 4","Loja 5","Loja 6","Loja 7","Loja 8","Loja 9","Loja 10","Loja 11","Loja 12","Loja 13"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const COLORS = ["#3b82f6","#ef4444","#10b981","#f59e0b","#8b5cf6","#ec4899","#14b8a6","#f97316","#6366f1","#84cc16","#06b6d4","#a855f7"];

type Importacao = { id: string; periodo: string; mes: number; ano: number; data_importacao: string };
type VendaRow = {
  id: string; importacao_id: string; departamento: string; codigo: string; tipo: string;
  loja: string; quantidade: number; preco_venda: number; preco_custo_real: number; lucro: number;
};

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (n: number) => n.toLocaleString("pt-BR");
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function aggregate(rows: VendaRow[]) {
  const qtd = rows.reduce((s, r) => s + (r.quantidade || 0), 0);
  const fat = rows.reduce((s, r) => s + (r.preco_venda || 0), 0);
  const cus = rows.reduce((s, r) => s + (r.preco_custo_real || 0), 0);
  const luc = rows.reduce((s, r) => s + (r.lucro || 0), 0);
  const margem = fat > 0 ? (luc / fat) * 100 : 0;
  const ticket = qtd > 0 ? fat / qtd : 0;
  return { qtd, fat, cus, luc, margem, ticket };
}

function groupBy<T>(arr: T[], fn: (x: T) => string) {
  const m = new Map<string, T[]>();
  arr.forEach((it) => { const k = fn(it); if (!m.has(k)) m.set(k, []); m.get(k)!.push(it); });
  return m;
}

function LojaMultiSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (l: string) => {
    if (value.includes(l)) onChange(value.filter((x) => x !== l));
    else onChange([...value, l]);
  };
  const label = value.length === 0 ? "Todas as lojas" : value.length === LOJAS.length ? "Todas as lojas" : `${value.length} loja(s)`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[180px]">{label}<ChevronDown className="h-4 w-4 ml-2" /></Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <div className="space-y-1 max-h-64 overflow-auto">
          <label className="flex items-center gap-2 px-2 py-1 cursor-pointer text-sm">
            <Checkbox checked={value.length === LOJAS.length} onCheckedChange={(c) => onChange(c ? [...LOJAS] : [])} />
            Todas
          </label>
          {LOJAS.map((l) => (
            <label key={l} className="flex items-center gap-2 px-2 py-1 cursor-pointer text-sm">
              <Checkbox checked={value.includes(l)} onCheckedChange={() => toggle(l)} />
              {l}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function matchesLojaFilter(rowLoja: string, sel: string[]) {
  if (sel.length === 0 || sel.length === LOJAS.length) return true;
  return sel.some((s) => rowLoja.toLowerCase().includes(s.toLowerCase()));
}

export default function DashboardVendasView() {
  const [mode, setMode] = useState<"periodo" | "comparativo">("periodo");
  const [imports, setImports] = useState<Importacao[]>([]);
  const [allRows, setAllRows] = useState<Record<string, VendaRow[]>>({});

  // Periodo mode
  const [periodoId, setPeriodoId] = useState<string>("");
  const [lojas, setLojas] = useState<string[]>([]);

  // Comparativo
  const [p1, setP1] = useState<string>("");
  const [p2, setP2] = useState<string>("");

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sort, setSort] = useState<{ col: string; dir: "asc" | "desc" }>({ col: "fat", dir: "desc" });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("vendas_importadas").select("*").order("ano").order("mes");
      const list = (data as Importacao[]) || [];
      setImports(list);
      if (list.length && !periodoId) setPeriodoId(list[list.length - 1].id);
      if (list.length >= 2) { setP1(list[list.length - 2].id); setP2(list[list.length - 1].id); }
      else if (list.length === 1) { setP1(list[0].id); setP2(list[0].id); }
    })();
  }, []);

  const ensureLoaded = async (id: string) => {
    if (!id || allRows[id]) return;
    const { data } = await supabase.from("vendas_departamento").select("*").eq("importacao_id", id);
    setAllRows((s) => ({ ...s, [id]: (data as VendaRow[]) || [] }));
  };

  useEffect(() => { if (periodoId) ensureLoaded(periodoId); }, [periodoId]);
  useEffect(() => { if (p1) ensureLoaded(p1); if (p2) ensureLoaded(p2); }, [p1, p2]);

  const periodoLabel = (id: string) => {
    const i = imports.find((x) => x.id === id);
    return i ? `${i.periodo} (${MESES[i.mes - 1]}/${i.ano})` : "";
  };

  // ============ MODE 1: por período ============
  const filteredRows = useMemo(() => {
    const rows = allRows[periodoId] || [];
    return rows.filter((r) => matchesLojaFilter(r.loja, lojas));
  }, [allRows, periodoId, lojas]);

  const kpis = useMemo(() => aggregate(filteredRows), [filteredRows]);

  const porDepto = useMemo(() => {
    const m = groupBy(filteredRows, (r) => r.departamento);
    const arr = Array.from(m.entries()).map(([dep, rs]) => ({ dep, ...aggregate(rs), rows: rs }));
    arr.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const map: any = { dep: a.dep.localeCompare(b.dep), qtd: a.qtd - b.qtd, fat: a.fat - b.fat, cus: a.cus - b.cus, luc: a.luc - b.luc, margem: a.margem - b.margem, ticket: a.ticket - b.ticket };
      return (map[sort.col] ?? 0) * dir;
    });
    return arr;
  }, [filteredRows, sort]);

  const porLoja = useMemo(() => {
    const m = groupBy(filteredRows, (r) => r.loja);
    return Array.from(m.entries()).map(([loja, rs]) => ({ loja, fat: aggregate(rs).fat })).sort((a, b) => b.fat - a.fat);
  }, [filteredRows]);

  const toggleSort = (col: string) => setSort((s) => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" });

  const exportExcel = () => {
    const data = porDepto.map((d) => ({
      Departamento: d.dep, Quantidade: d.qtd, Faturamento: d.fat, Custo: d.cus, Lucro: d.luc,
      "Margem %": d.margem.toFixed(2), "Ticket Médio": d.ticket.toFixed(2),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Por Departamento");
    XLSX.writeFile(wb, `vendas_${periodoLabel(periodoId)}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Dashboard de Vendas — ${periodoLabel(periodoId)}`, 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["Departamento", "Qtd", "Faturamento", "Custo", "Lucro", "Margem %", "Ticket"]],
      body: porDepto.map((d) => [d.dep, fmtNum(d.qtd), fmtBRL(d.fat), fmtBRL(d.cus), fmtBRL(d.luc), fmtPct(d.margem), fmtBRL(d.ticket)]),
    });
    doc.save(`vendas_${periodoLabel(periodoId)}.pdf`);
  };

  // ============ MODE 2: comparativo ============
  const rowsP1 = useMemo(() => (allRows[p1] || []).filter((r) => matchesLojaFilter(r.loja, lojas)), [allRows, p1, lojas]);
  const rowsP2 = useMemo(() => (allRows[p2] || []).filter((r) => matchesLojaFilter(r.loja, lojas)), [allRows, p2, lojas]);
  const kpisP1 = useMemo(() => aggregate(rowsP1), [rowsP1]);
  const kpisP2 = useMemo(() => aggregate(rowsP2), [rowsP2]);

  const comparativoDept = useMemo(() => {
    const m1 = groupBy(rowsP1, (r) => r.departamento);
    const m2 = groupBy(rowsP2, (r) => r.departamento);
    const all = new Set([...m1.keys(), ...m2.keys()]);
    const rows = Array.from(all).map((dep) => {
      const a1 = aggregate(m1.get(dep) || []);
      const a2 = aggregate(m2.get(dep) || []);
      const varPct = (a: number, b: number) => (a === 0 ? (b === 0 ? 0 : 100) : ((b - a) / a) * 100);
      return {
        dep,
        qtd1: a1.qtd, qtd2: a2.qtd, varQtd: varPct(a1.qtd, a2.qtd),
        fat1: a1.fat, fat2: a2.fat, varFat: varPct(a1.fat, a2.fat),
        luc1: a1.luc, luc2: a2.luc, varLuc: varPct(a1.luc, a2.luc),
        marg1: a1.margem, marg2: a2.margem,
      };
    });
    rows.sort((a, b) => b.fat2 - a.fat2);
    return rows;
  }, [rowsP1, rowsP2]);

  const evolucao = useMemo(() => {
    return imports.map((i) => {
      const rs = (allRows[i.id] || []).filter((r) => matchesLojaFilter(r.loja, lojas));
      return { periodo: i.periodo, faturamento: aggregate(rs).fat };
    });
  }, [imports, allRows, lojas]);

  useEffect(() => { imports.forEach((i) => ensureLoaded(i.id)); }, [imports.length, mode]);

  const exportExcelComp = () => {
    const data = comparativoDept.map((d) => ({
      Departamento: d.dep,
      "Qtd P1": d.qtd1, "Qtd P2": d.qtd2, "Var Qtd %": d.varQtd.toFixed(2),
      "Faturamento P1": d.fat1, "Faturamento P2": d.fat2, "Var Fat %": d.varFat.toFixed(2),
      "Lucro P1": d.luc1, "Lucro P2": d.luc2, "Var Lucro %": d.varLuc.toFixed(2),
      "Margem P1": d.marg1.toFixed(2), "Margem P2": d.marg2.toFixed(2),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comparativo");
    XLSX.writeFile(wb, `comparativo_vendas.xlsx`);
  };

  if (imports.length === 0) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma importação encontrada. Importe um relatório na aba Importação.</CardContent></Card>;
  }

  const SortHead = ({ col, children }: { col: string; children: any }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(col)}>
      <span className="inline-flex items-center gap-1">{children}<ArrowUpDown className="h-3 w-3 opacity-50" /></span>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant={mode === "periodo" ? "default" : "outline"} onClick={() => setMode("periodo")}>Análise por Período</Button>
        <Button variant={mode === "comparativo" ? "default" : "outline"} onClick={() => setMode("comparativo")}>Comparativo entre Períodos</Button>
      </div>

      {mode === "periodo" && (
        <>
          <Card>
            <CardContent className="pt-6 flex flex-wrap items-end gap-3">
              <div>
                <Label>Período</Label>
                <Select value={periodoId} onValueChange={setPeriodoId}>
                  <SelectTrigger className="min-w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{imports.map((i) => (<SelectItem key={i.id} value={i.id}>{periodoLabel(i.id)}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Loja</Label>
                <div><LojaMultiSelect value={lojas} onChange={setLojas} /></div>
              </div>
              <Button variant="outline" onClick={() => setLojas([])}><Eraser className="h-4 w-4 mr-2" />Limpar Filtros</Button>
              <Button variant="outline" onClick={exportExcel}><FileDown className="h-4 w-4 mr-2" />Exportar Excel</Button>
              <Button variant="outline" onClick={exportPDF}><FileText className="h-4 w-4 mr-2" />Exportar PDF</Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { l: "Peças Vendidas", v: fmtNum(kpis.qtd) },
              { l: "Faturamento", v: fmtBRL(kpis.fat) },
              { l: "Custo Total", v: fmtBRL(kpis.cus) },
              { l: "Lucro Total", v: fmtBRL(kpis.luc) },
              { l: "Margem Média", v: fmtPct(kpis.margem) },
              { l: "Ticket Médio", v: fmtBRL(kpis.ticket) },
            ].map((k) => (
              <Card key={k.l}><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{k.l}</p><p className="text-xl font-bold">{k.v}</p></CardContent></Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-base">Faturamento por Departamento</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer><BarChart data={porDepto.map((d) => ({ name: d.dep, fat: d.fat }))}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                  <Bar dataKey="fat" fill="#3b82f6" />
                </BarChart></ResponsiveContainer>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">Faturamento por Loja</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer><BarChart data={porLoja}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="loja" tick={{ fontSize: 11 }} /><YAxis /><Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                  <Bar dataKey="fat" fill="#10b981" />
                </BarChart></ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Participação % por Departamento</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer><PieChart>
                  <Pie data={porDepto.map((d) => ({ name: d.dep, value: d.fat }))} dataKey="value" nameKey="name" outerRadius={110} label>
                    {porDepto.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie><Tooltip formatter={(v: any) => fmtBRL(Number(v))} /><Legend />
                </PieChart></ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Consolidado por Departamento</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <SortHead col="dep">Departamento</SortHead>
                    <SortHead col="qtd">Quantidade</SortHead>
                    <SortHead col="fat">Faturamento</SortHead>
                    <SortHead col="cus">Custo</SortHead>
                    <SortHead col="luc">Lucro</SortHead>
                    <SortHead col="margem">Margem %</SortHead>
                    <SortHead col="ticket">Ticket Médio</SortHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porDepto.map((d) => {
                    const isOpen = !!expanded[d.dep];
                    const tipos = Array.from(groupBy(d.rows, (r) => r.tipo).entries()).map(([t, rs]) => ({ t, ...aggregate(rs) }));
                    return (
                      <>
                        <TableRow key={d.dep} className="cursor-pointer" onClick={() => setExpanded((s) => ({ ...s, [d.dep]: !isOpen }))}>
                          <TableCell>{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                          <TableCell className="font-medium">{d.dep}</TableCell>
                          <TableCell>{fmtNum(d.qtd)}</TableCell>
                          <TableCell>{fmtBRL(d.fat)}</TableCell>
                          <TableCell>{fmtBRL(d.cus)}</TableCell>
                          <TableCell>{fmtBRL(d.luc)}</TableCell>
                          <TableCell>{fmtPct(d.margem)}</TableCell>
                          <TableCell>{fmtBRL(d.ticket)}</TableCell>
                        </TableRow>
                        {isOpen && tipos.map((t) => (
                          <TableRow key={d.dep + "-" + t.t} className="bg-muted/30">
                            <TableCell></TableCell>
                            <TableCell className="pl-8 text-sm text-muted-foreground">↳ {t.t || "—"}</TableCell>
                            <TableCell>{fmtNum(t.qtd)}</TableCell>
                            <TableCell>{fmtBRL(t.fat)}</TableCell>
                            <TableCell>{fmtBRL(t.cus)}</TableCell>
                            <TableCell>{fmtBRL(t.luc)}</TableCell>
                            <TableCell>{fmtPct(t.margem)}</TableCell>
                            <TableCell>{fmtBRL(t.ticket)}</TableCell>
                          </TableRow>
                        ))}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {mode === "comparativo" && (
        <>
          <Card>
            <CardContent className="pt-6 flex flex-wrap items-end gap-3">
              <div>
                <Label>Período 1</Label>
                <Select value={p1} onValueChange={setP1}>
                  <SelectTrigger className="min-w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{imports.map((i) => (<SelectItem key={i.id} value={i.id}>{periodoLabel(i.id)}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Período 2</Label>
                <Select value={p2} onValueChange={setP2}>
                  <SelectTrigger className="min-w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{imports.map((i) => (<SelectItem key={i.id} value={i.id}>{periodoLabel(i.id)}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Loja</Label>
                <div><LojaMultiSelect value={lojas} onChange={setLojas} /></div>
              </div>
              <Button variant="outline" onClick={exportExcelComp}><FileDown className="h-4 w-4 mr-2" />Exportar Excel</Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { l: "Variação Faturamento", v: fmtBRL(kpisP2.fat - kpisP1.fat), p: kpisP1.fat ? ((kpisP2.fat - kpisP1.fat) / kpisP1.fat) * 100 : 0 },
              { l: "Variação Lucro", v: fmtBRL(kpisP2.luc - kpisP1.luc), p: kpisP1.luc ? ((kpisP2.luc - kpisP1.luc) / kpisP1.luc) * 100 : 0 },
              { l: "Variação Peças", v: fmtNum(kpisP2.qtd - kpisP1.qtd), p: kpisP1.qtd ? ((kpisP2.qtd - kpisP1.qtd) / kpisP1.qtd) * 100 : 0 },
              { l: "Variação Margem", v: `${(kpisP2.margem - kpisP1.margem).toFixed(1)} p.p.`, p: kpisP2.margem - kpisP1.margem },
            ].map((k) => (
              <Card key={k.l}><CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{k.l}</p>
                <p className="text-xl font-bold">{k.v}</p>
                <p className={`text-sm font-medium ${k.p >= 0 ? "text-green-600" : "text-red-600"}`}>{k.p >= 0 ? "▲" : "▼"} {Math.abs(k.p).toFixed(1)}%</p>
              </CardContent></Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Comparativo por Departamento</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Qtd P1</TableHead><TableHead>Qtd P2</TableHead><TableHead>Var Qtd %</TableHead>
                    <TableHead>Fat P1</TableHead><TableHead>Fat P2</TableHead><TableHead>Var Fat %</TableHead>
                    <TableHead>Lucro P1</TableHead><TableHead>Lucro P2</TableHead><TableHead>Var Lucro %</TableHead>
                    <TableHead>Margem P1</TableHead><TableHead>Margem P2</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparativoDept.map((d) => {
                    const cls = (v: number) => v >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium";
                    return (
                      <TableRow key={d.dep}>
                        <TableCell className="font-medium">{d.dep}</TableCell>
                        <TableCell>{fmtNum(d.qtd1)}</TableCell><TableCell>{fmtNum(d.qtd2)}</TableCell>
                        <TableCell className={cls(d.varQtd)}>{d.varQtd >= 0 ? "▲" : "▼"} {Math.abs(d.varQtd).toFixed(1)}%</TableCell>
                        <TableCell>{fmtBRL(d.fat1)}</TableCell><TableCell>{fmtBRL(d.fat2)}</TableCell>
                        <TableCell className={cls(d.varFat)}>{d.varFat >= 0 ? "▲" : "▼"} {Math.abs(d.varFat).toFixed(1)}%</TableCell>
                        <TableCell>{fmtBRL(d.luc1)}</TableCell><TableCell>{fmtBRL(d.luc2)}</TableCell>
                        <TableCell className={cls(d.varLuc)}>{d.varLuc >= 0 ? "▲" : "▼"} {Math.abs(d.varLuc).toFixed(1)}%</TableCell>
                        <TableCell>{fmtPct(d.marg1)}</TableCell><TableCell>{fmtPct(d.marg2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-base">Faturamento P1 vs P2 por Departamento</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer><BarChart data={comparativoDept.map((d) => ({ name: d.dep, P1: d.fat1, P2: d.fat2 }))}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip formatter={(v: any) => fmtBRL(Number(v))} /><Legend />
                  <Bar dataKey="P1" fill="#3b82f6" /><Bar dataKey="P2" fill="#10b981" />
                </BarChart></ResponsiveContainer>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">Evolução do Faturamento</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer><LineChart data={evolucao}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="periodo" tick={{ fontSize: 11 }} /><YAxis /><Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                  <Line type="monotone" dataKey="faturamento" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart></ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}