import { Bell, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AppHeader() {
  const { perfil, signOut } = useAuth();
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <span className="text-sm font-bold text-foreground hidden sm:block">Portal Comercial</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Alerts bell */}
        <button className="relative text-muted-foreground hover:text-foreground transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
            0
          </span>
        </button>

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
