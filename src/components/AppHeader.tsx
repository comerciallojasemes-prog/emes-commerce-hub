import { useState, useEffect } from "react";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle } from "lucide-react";

interface Alerta {
  id: string;
  mensagem: string;
  data: string;
  responsavel: string;
  status: string;
}

export function AppHeader() {
  const { perfil, signOut } = useAuth();
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const [alertasAtivos, setAlertasAtivos] = useState<Alerta[]>([]);

  const fetchAlertas = async () => {
    const { data } = await supabase
      .from("alertas")
      .select("*")
      .eq("status", "Ativo")
      .order("data", { ascending: false });
    if (data) setAlertasAtivos(data);
  };

  useEffect(() => {
    fetchAlertas();

    const channel = supabase
      .channel("alertas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alertas" },
        () => {
          fetchAlertas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <span className="text-sm font-bold text-foreground hidden sm:block">Portal Comercial</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Alerts bell with sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="relative text-muted-foreground hover:text-foreground transition-colors">
              <Bell size={20} />
              {alertasAtivos.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                  {alertasAtivos.length}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Alertas Ativos</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              {alertasAtivos.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Nenhum alerta ativo.</p>
              ) : (
                alertasAtivos.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg p-3 flex items-start gap-3"
                    style={{ backgroundColor: "#F5C800" }}
                  >
                    <AlertTriangle size={18} className="text-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{a.mensagem}</p>
                      <p className="text-xs text-foreground/70 mt-1">
                        {a.responsavel} — {format(new Date(a.data + "T00:00:00"), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Date */}
        <span className="text-xs text-muted-foreground hidden md:block">{today}</span>

        {/* User info */}
        <div className="flex items-center gap-3 pl-3 border-l">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-tight">{perfil?.nome}</p>
            <p className="text-xs text-muted-foreground">{perfil?.perfil}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
}
