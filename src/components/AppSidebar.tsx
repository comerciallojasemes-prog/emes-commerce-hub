import { Calendar, AlertTriangle, Bell, Gift, Package, ClipboardList, Settings, Tag } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const allModules = [
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Pendências", url: "/pendencias", icon: AlertTriangle },
  { title: "Alertas", url: "/alertas", icon: Bell },
  { title: "Bonificações", url: "/bonificacoes", icon: Gift },
  { title: "Suprimentos", url: "/suprimentos", icon: Package },
  { title: "Solicitações", url: "/solicitacoes", icon: ClipboardList },
];

const lojasModules = ["/suprimentos", "/agenda"];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { perfil } = useAuth();

  const isAdmin = perfil?.perfil === "Admin";

  const modules = perfil?.perfil === "Lojas"
    ? allModules.filter((m) => lojasModules.includes(m.url))
    : allModules;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent>
        {/* Brand in sidebar */}
        <div className="px-4 py-5 border-b border-sidebar-border">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <span className="text-sm font-extrabold text-sidebar-primary-foreground">PC</span>
              </div>
              <div>
                <p className="text-sm font-bold text-sidebar-accent-foreground">Portal Comercial</p>
                <p className="text-xs text-sidebar-muted">Lojas Emes</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <span className="text-sm font-extrabold text-sidebar-primary-foreground">PC</span>
              </div>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">
            Módulos
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modules.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end
                        className="transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {isAdmin && (
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === "/usuarios"}
                tooltip="Gestão de Usuários"
              >
                <NavLink
                  to="/usuarios"
                  end
                  className="transition-colors"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                >
                  <Settings className="h-4 w-4" />
                  {!collapsed && <span>Gestão de Usuários</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
