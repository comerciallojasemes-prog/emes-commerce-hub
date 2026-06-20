import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, Trash2 } from "lucide-react";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const ANOS = [2024, 2025, 2026, 2027, 2028];

type Importacao = {
  id: string;
  periodo: string;
  mes: number;
  ano: number;
  data_importacao: string;
  importado_por: string;
};

type ParsedRow = {
  departamento: string;
  codigo: string;
  tipo: string;
  loja: string;
  quantidade: number;
  preco_venda: number;
  preco_custo_real: number;
  lucro: number;
};

function normalize(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

function toNumber(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\s/g, "").replace(/R\$/gi, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseSheet(rows: any[][]): ParsedRow[] {
  const out: ParsedRow[] = [];
  let currentDept = "";
  let header: string[] | null = null;
  let idx: Record<string, number> = {};

  for (const row of rows) {
    if (!row || row.length === 0) continue;
    const joined = row.map((c) => normalize(c)).join(" | ");

    // detect department line
    const deptCell = row.find((c) => normalize(c).startsWith("departamento"));
    if (deptCell) {
      const txt = String(deptCell);
      const after = txt.split(":")[1];
      if (after !== undefined) {
        currentDept = after.trim();
      } else {
        // departamento name in next cell
        const i = row.findIndex((c) => normalize(c).startsWith("departamento"));
        currentDept = String(row[i + 1] ?? "").trim();
      }
      header = null;
      continue;
    }

    // detect header row
    if (joined.includes("código") || joined.includes("codigo")) {
      header = row.map((c) => normalize(c));
      idx = {};
      header.forEach((h, i) => {
        if (h.includes("código") || h.includes("codigo")) idx.codigo = i;
        else if (h.includes("tipo")) idx.tipo = i;
        else if (h.includes("loja")) idx.loja = i;
        else if (h.includes("quant")) idx.quantidade = i;
        else if (h.includes("venda")) idx.preco_venda = i;
        else if (h.includes("custo")) idx.preco_custo_real = i;
        else if (h.includes("lucro")) idx.lucro = i;
      });
      continue;
    }

    if (!header || !currentDept) continue;
    // skip totals / empty
    if (joined.includes("total")) continue;
    const codigo = String(row[idx.codigo] ?? "").trim();
    const loja = String(row[idx.loja] ?? "").trim();
    if (!codigo && !loja) continue;
    if (!codigo) continue;

    out.push({
      departamento: currentDept,
      codigo,
      tipo: String(row[idx.tipo] ?? "").trim(),
      loja,
      quantidade: toNumber(row[idx.quantidade]),
      preco_venda: toNumber(row[idx.preco_venda]),
      preco_custo_real: toNumber(row[idx.preco_custo_real]),
      lucro: toNumber(row[idx.lucro]),
    });
  }
  return out;
}

export default function ImportacaoVendas() {
  const { perfil } = useAuth();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [periodo, setPeriodo] = useState("");
  const [mes, setMes] = useState<string>("");
  const [ano, setAno] = useState<string>(String(new Date().getFullYear()));
  const [saving, setSaving] = useState(false);
  const [imports, setImports] = useState<Importacao[]>([]);
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("vendas_importadas").select("*").order("data_importacao", { ascending: false });
    setImports((data as Importacao[]) || []);
  };
  useEffect(() => { load(); }, []);

  const readFileToRows = async (f: File): Promise<any[][]> => {
    if (!XLSX || !XLSX.read || !XLSX.utils) {
      throw new Error("Biblioteca de leitura de planilhas não carregada");
    }
    const allRows: any[][] = [];

    // 1) try as HTML/XML disguised as .xls (common in ERP exports)
    try {
      const text = await f.text();
      const looksHtml = /<table[\s>]/i.test(text) || /<html[\s>]/i.test(text);
      if (looksHtml) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        const tables = Array.from(doc.querySelectorAll("table"));
        if (tables.length > 0) {
          tables.forEach((tbl) => {
            const trs = Array.from(tbl.querySelectorAll("tr"));
            trs.forEach((tr) => {
              const cells = Array.from(tr.querySelectorAll("th,td")).map((c) =>
                (c.textContent || "").replace(/\u00a0/g, " ").trim()
              );
              if (cells.length > 0) allRows.push(cells);
            });
          });
          if (allRows.length > 0) return allRows;
        }
      }
    } catch (err) {
      console.warn("Falha ao ler como HTML, tentando como XLSX binário:", err);
    }

    // 2) fallback: binary xlsx/xls
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      wb.SheetNames.forEach((n) => {
        const sheet = wb.Sheets[n];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: null });
        allRows.push(...rows);
      });
      if (allRows.length > 0) return allRows;
    } catch (err) {
      console.error("Falha ao ler como XLSX binário:", err);
    }

    throw new Error("Formato de arquivo não suportado ou corrompido");
  };

  const handleAnalyze = async () => {
    if (!file) { toast.error("Selecione um arquivo"); return; }
    setAnalyzing(true);
    try {
      const allRows = await readFileToRows(file);
      const parsed = parseSheet(allRows);
      if (parsed.length === 0) {
        toast.error("Nenhum registro válido encontrado no arquivo");
        setPreview(null);
      } else {
        setPreview(parsed);
        toast.success(`${parsed.length} registros identificados`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao processar o arquivo. Verifique se é um relatório de vendas válido.");
      setPreview(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!file || !periodo || !mes || !ano) { toast.error("Preencha todos os campos"); return; }
    if (!preview || preview.length === 0) { toast.error("Analise o arquivo primeiro"); return; }
    setSaving(true);
    try {
      const parsed = preview;

      const { data: imp, error: e1 } = await supabase.from("vendas_importadas").insert({
        periodo, mes: parseInt(mes), ano: parseInt(ano), importado_por: perfil?.nome || perfil?.email || "",
      }).select().single();
      if (e1 || !imp) throw e1;

      const payload = parsed.map((p) => ({ ...p, importacao_id: imp.id }));
      // insert in chunks
      for (let i = 0; i < payload.length; i += 500) {
        const chunk = payload.slice(i, i + 500);
        const { error } = await supabase.from("vendas_departamento").insert(chunk);
        if (error) throw error;
      }
      toast.success(`Importação concluída: ${parsed.length} linhas`);
      setOpen(false); setFile(null); setPeriodo(""); setMes(""); setPreview(null);
      load();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao processar o arquivo. Verifique se é um .xls ou .xlsx válido e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta importação e todos os seus dados?")) return;
    const { error } = await supabase.from("vendas_importadas").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Importação excluída");
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Histórico de Importações</CardTitle>
        <Button onClick={() => setOpen(true)}><Upload className="h-4 w-4 mr-2" />Importar Relatório de Vendas</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead>Mês/Ano</TableHead>
              <TableHead>Data de importação</TableHead>
              <TableHead>Importado por</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {imports.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma importação ainda</TableCell></TableRow>)}
            {imports.map((i) => (
              <TableRow key={i.id}>
                <TableCell>{i.periodo}</TableCell>
                <TableCell>{MESES[i.mes - 1]} / {i.ano}</TableCell>
                <TableCell>{new Date(i.data_importacao).toLocaleString("pt-BR")}</TableCell>
                <TableCell>{i.importado_por}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Importar Relatório de Vendas</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Arquivo (.xls ou .xlsx)</Label>
              <div className="flex gap-2">
                <Input type="file" accept=".xls,.xlsx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); }} />
                <Button type="button" variant="secondary" onClick={handleAnalyze} disabled={!file || analyzing}>
                  {analyzing ? "Analisando..." : "Analisar"}
                </Button>
              </div>
            </div>
            <div>
              <Label>Período de referência</Label>
              <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="Ex: Janeiro 2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mês</Label>
                <Select value={mes} onValueChange={setMes}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{MESES.map((m, i) => (<SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ano</Label>
                <Select value={ano} onValueChange={setAno}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ANOS.map((a) => (<SelectItem key={a} value={String(a)}>{a}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            {preview && preview.length > 0 && (
              <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                <div className="text-sm font-medium">
                  Prévia: {preview.length} registros · {new Set(preview.map(p => p.departamento)).size} departamentos
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Depto</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Loja</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Venda</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right">Lucro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.slice(0, 5).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{r.departamento}</TableCell>
                          <TableCell className="text-xs">{r.codigo}</TableCell>
                          <TableCell className="text-xs">{r.tipo}</TableCell>
                          <TableCell className="text-xs">{r.loja}</TableCell>
                          <TableCell className="text-xs text-right">{r.quantidade}</TableCell>
                          <TableCell className="text-xs text-right">{r.preco_venda.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right">{r.preco_custo_real.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right">{r.lucro.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setPreview(null); }}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={saving || !preview}>{saving ? "Importando..." : "Confirmar Importação"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}