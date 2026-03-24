import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, KeyRound, UserCheck, UserX, Search } from "lucide-react";
import { toast } from "sonner";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  loja: string | null;
  status: string | null;
}

const LOJAS = [
  "Loja 4", "Loja 5", "Loja 6", "Loja 7", "Loja 8", "Loja 9",
  "Loja 10", "Loja 11", "Loja 12", "Loja 13", "Loja 14 (em breve)",
];

const PERFIS = ["Admin", "Comercial", "Lojas"];

function PerfilBadge({ perfil }: { perfil: string }) {
  switch (perfil) {
    case "Admin": return <Badge className="bg-[hsl(0,84%,60%)] text-white border-0">🔴 Admin</Badge>;
    case "Comercial": return <Badge className="bg-[hsl(217,91%,60%)] text-white border-0">🔵 Comercial</Badge>;
    case "Lojas": return <Badge className="bg-[hsl(142,71%,45%)] text-white border-0">🟢 Lojas</Badge>;
    default: return <Badge variant="outline">{perfil}</Badge>;
  }
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "Ativo") return <Badge className="bg-[hsl(142,71%,45%)] text-white border-0">🟢 Ativo</Badge>;
  return <Badge className="bg-[hsl(0,0%,20%)] text-white border-0">⚫ Inativo</Badge>;
}

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    nome: "", email: "", password: "", confirmPassword: "", perfil: "", loja: "", status: "Ativo",
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    nome: "", perfil: "", loja: "", status: "Ativo",
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmPassword: "" });

  const fetchUsuarios = async () => {
    const { data } = await supabase.from("perfis").select("*").order("nome");
    if (data) setUsuarios(data as Usuario[]);
    setLoading(false);
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const callEdgeFunction = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sessão expirada"); return null; }

    const res = await supabase.functions.invoke("admin-users", {
      body,
    });

    if (res.error) {
      toast.error(res.error.message || "Erro na operação");
      return null;
    }

    if (res.data?.error) {
      toast.error(res.data.error);
      return null;
    }

    return res.data;
  };

  const handleCreate = async () => {
    if (!createForm.nome || !createForm.email || !createForm.password || !createForm.perfil) {
      toast.error("Preencha todos os campos obrigatórios"); return;
    }
    if (createForm.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres"); return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      toast.error("As senhas não coincidem"); return;
    }
    if (createForm.perfil === "Lojas" && !createForm.loja) {
      toast.error("Selecione a loja para o perfil Lojas"); return;
    }

    setSubmitting(true);
    const result = await callEdgeFunction({
      action: "create",
      email: createForm.email,
      password: createForm.password,
      nome: createForm.nome,
      perfil: createForm.perfil,
      loja: createForm.perfil === "Lojas" ? createForm.loja : null,
      status: createForm.status,
    });
    setSubmitting(false);

    if (result?.success) {
      toast.success("Usuário criado com sucesso!");
      setCreateOpen(false);
      setCreateForm({ nome: "", email: "", password: "", confirmPassword: "", perfil: "", loja: "", status: "Ativo" });
      fetchUsuarios();
    }
  };

  const openEdit = (u: Usuario) => {
    setSelectedUser(u);
    setEditForm({ nome: u.nome, perfil: u.perfil, loja: u.loja || "", status: u.status || "Ativo" });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    if (!editForm.nome || !editForm.perfil) {
      toast.error("Preencha todos os campos obrigatórios"); return;
    }
    if (editForm.perfil === "Lojas" && !editForm.loja) {
      toast.error("Selecione a loja para o perfil Lojas"); return;
    }

    setSubmitting(true);
    const result = await callEdgeFunction({
      action: "update_profile",
      userId: selectedUser.id,
      nome: editForm.nome,
      perfil: editForm.perfil,
      loja: editForm.perfil === "Lojas" ? editForm.loja : null,
      status: editForm.status,
    });
    setSubmitting(false);

    if (result?.success) {
      toast.success("Usuário atualizado!");
      setEditOpen(false);
      fetchUsuarios();
    }
  };

  const openPasswordReset = (u: Usuario) => {
    setSelectedUser(u);
    setPasswordForm({ password: "", confirmPassword: "" });
    setPasswordOpen(true);
  };

  const handlePasswordReset = async () => {
    if (!selectedUser) return;
    if (passwordForm.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres"); return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      toast.error("As senhas não coincidem"); return;
    }

    setSubmitting(true);
    const result = await callEdgeFunction({
      action: "reset_password",
      userId: selectedUser.id,
      newPassword: passwordForm.password,
    });
    setSubmitting(false);

    if (result?.success) {
      toast.success("Senha redefinida com sucesso!");
      setPasswordOpen(false);
    }
  };

  const toggleStatus = async (u: Usuario) => {
    if (u.id === currentUser?.id) {
      toast.error("Você não pode desativar a própria conta"); return;
    }
    const newStatus = u.status === "Ativo" ? "Inativo" : "Ativo";

    setSubmitting(true);
    const result = await callEdgeFunction({
      action: "update_profile",
      userId: u.id,
      status: newStatus,
    });
    setSubmitting(false);

    if (result?.success) {
      toast.success(`Usuário ${newStatus === "Ativo" ? "ativado" : "desativado"}`);
      fetchUsuarios();
    }
  };

  const filtered = useMemo(() => {
    return usuarios.filter(u => {
      const matchBusca = !busca || u.nome.toLowerCase().includes(busca.toLowerCase()) || u.email.toLowerCase().includes(busca.toLowerCase());
      const matchPerfil = filtroPerfil === "todos" || u.perfil === filtroPerfil;
      const matchStatus = filtroStatus === "todos" || u.status === filtroStatus;
      return matchBusca && matchPerfil && matchStatus;
    });
  }, [usuarios, busca, filtroPerfil, filtroStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os usuários do sistema</p>
        </div>
        <Button onClick={() => { setCreateForm({ nome: "", email: "", password: "", confirmPassword: "", perfil: "", loja: "", status: "Ativo" }); setCreateOpen(true); }} size="sm">
          <Plus size={16} /> Novo Usuário
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou e-mail..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <div className="w-40">
          <Select value={filtroPerfil} onValueChange={setFiltroPerfil}>
            <SelectTrigger><SelectValue placeholder="Perfil" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Perfis</SelectItem>
              {PERFIS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</TableCell></TableRow>
              ) : filtered.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell><PerfilBadge perfil={u.perfil} /></TableCell>
                  <TableCell>{u.loja || "—"}</TableCell>
                  <TableCell><StatusBadge status={u.status} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Editar"><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openPasswordReset(u)} title="Redefinir Senha"><KeyRound size={14} /></Button>
                      {u.id !== currentUser?.id && (
                        <Button variant="ghost" size="icon" onClick={() => toggleStatus(u)} title={u.status === "Ativo" ? "Desativar" : "Ativar"}>
                          {u.status === "Ativo" ? <UserX size={14} /> : <UserCheck size={14} />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome completo *</Label><Input value={createForm.nome} onChange={e => setCreateForm({ ...createForm, nome: e.target.value })} /></div>
            <div><Label>E-mail *</Label><Input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Senha *</Label><Input type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} /></div>
              <div><Label>Confirmar senha *</Label><Input type="password" value={createForm.confirmPassword} onChange={e => setCreateForm({ ...createForm, confirmPassword: e.target.value })} /></div>
            </div>
            <div>
              <Label>Perfil *</Label>
              <Select value={createForm.perfil} onValueChange={v => setCreateForm({ ...createForm, perfil: v, loja: v !== "Lojas" ? "" : createForm.loja })}>
                <SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
                <SelectContent>{PERFIS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {createForm.perfil === "Lojas" && (
              <div>
                <Label>Loja *</Label>
                <Select value={createForm.loja} onValueChange={v => setCreateForm({ ...createForm, loja: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a loja" /></SelectTrigger>
                  <SelectContent>{LOJAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Status</Label>
              <Select value={createForm.status} onValueChange={v => setCreateForm({ ...createForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? "Criando..." : "Criar Usuário"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>E-mail</Label>
              <Input value={selectedUser?.email || ""} disabled className="opacity-60" />
            </div>
            <div><Label>Nome completo *</Label><Input value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} /></div>
            <div>
              <Label>Perfil *</Label>
              <Select value={editForm.perfil} onValueChange={v => setEditForm({ ...editForm, perfil: v, loja: v !== "Lojas" ? "" : editForm.loja })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PERFIS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {editForm.perfil === "Lojas" && (
              <div>
                <Label>Loja *</Label>
                <Select value={editForm.loja} onValueChange={v => setEditForm({ ...editForm, loja: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a loja" /></SelectTrigger>
                  <SelectContent>{LOJAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={submitting}>{submitting ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Modal */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Redefinir Senha</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Redefinindo senha de: <strong>{selectedUser?.nome}</strong></p>
          <div className="space-y-4">
            <div><Label>Nova senha *</Label><Input type="password" value={passwordForm.password} onChange={e => setPasswordForm({ ...passwordForm, password: e.target.value })} /></div>
            <div><Label>Confirmar nova senha *</Label><Input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>Cancelar</Button>
            <Button onClick={handlePasswordReset} disabled={submitting}>{submitting ? "Redefinindo..." : "Redefinir Senha"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
