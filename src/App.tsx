import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import DashboardLayout from "@/layouts/DashboardLayout";
import Agenda from "@/pages/Agenda";
import Pendencias from "@/pages/Pendencias";
import Alertas from "@/pages/Alertas";
import Bonificacoes from "@/pages/Bonificacoes";
import Suprimentos from "@/pages/Suprimentos";
import Solicitacoes from "@/pages/Solicitacoes";
import Promocoes from "@/pages/Promocoes";
import Usuarios from "@/pages/Usuarios";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, perfil, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <span className="text-sm font-extrabold text-primary-foreground">PC</span>
          </div>
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  
  if (!perfil) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <span className="text-sm font-extrabold text-primary-foreground">PC</span>
          </div>
          <p className="text-muted-foreground text-sm">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  const defaultRoute = perfil.perfil === "Lojas" ? "/agenda" : "/agenda";

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to={defaultRoute} replace />} />
        <Route path="agenda" element={<Agenda />} />
        {perfil.perfil !== "Lojas" && (
          <>
            <Route path="pendencias" element={<Pendencias />} />
            <Route path="alertas" element={<Alertas />} />
            <Route path="bonificacoes" element={<Bonificacoes />} />
            <Route path="solicitacoes" element={<Solicitacoes />} />
          </>
        )}
        {perfil.perfil === "Admin" && (
          <Route path="usuarios" element={<Usuarios />} />
        )}
        <Route path="suprimentos" element={<Suprimentos />} />
        <Route path="promocoes" element={<Promocoes />} />
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Route>
    </Routes>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <span className="text-sm font-extrabold text-primary-foreground">PC</span>
          </div>
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
