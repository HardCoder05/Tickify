import { useState, useEffect } from "react";
import { Home, Calendar, Tags, Users, LogOut, Menu, SquareCheckBig, ChartColumnBig, GalleryVerticalEnd, CircleUserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/users/context/AuthContext";
import AdminUserDropdown from "./AdminUserDropdown";
import type { User } from "@/users/types/user";

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const [reportesOpen, setReportesOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const toggleSidebar = () => setOpen(!open);
  const toggleReportes = () => setReportesOpen(!reportesOpen);

  // Update CSS variable for sidebar width
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', open ? '256px' : '68px');
  }, [open]);

  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    localStorage.removeItem("organizador_id");
    logout();
  };

  //Lista de enlaces con sus rutas e íconos
  const links = [
    { href: "/admin/eventos", label: "Eventos", icon: Calendar },
    { href: "/admin/usuarios", label: "Usuarios", icon: Users },
    { href: "/admin/solicitudes", label: "Solicitudes", icon: SquareCheckBig },
    { href: "/admin/categorias", label: "Categorías", icon: Tags },
    //{ href: "/admin/reportes", label: "Reportes", icon: ChartColumnBig },
  ];

  return (
    <div
      className={cn(
        "h-screen transition-all duration-300 flex flex-col fixed top-0 left-0 z-30",
        open ? "w-64" : "w-17"
      )}
      style={{ backgroundColor: "#FCFCF7", color: "black" }}
    >
      {/* Botón para desplegar*/}
      <div className="flex items-center justify-between p-4 border-b border-black/10">
        <h1 className={cn("text-lg font-bold", !open && "hidden")}>Tickify</h1>
        <Button
          variant="ghost"
          size="icon"
          className="text-black"
          onClick={toggleSidebar}
        >
          <GalleryVerticalEnd />
        </Button>
      </div>

      {/* Navegación */}
      <nav className="flex flex-col gap-1 p-2 overflow-y-auto flex-1">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = location.pathname === href;
          return (
            <a
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 p-4 rounded-md transition-colors duration-200",
                isActive
                  ? "bg-[#F5F5E5] font-medium"
                  : "hover:bg-black/5"
              )}
              style={{ color: "black" }}
            >
              <Icon className="w-5 h-5" />
              {open && <span>{label}</span>}
            </a>
          );
        })}
        
        {/* Reportes con submenú */}
        <div>
          <button
            onClick={toggleReportes}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-md transition-colors duration-200",
              (location.pathname === "/admin/reportes" || location.pathname === "/admin/reportes/organizadores")
                ? "bg-[#F5F5E5] font-medium"
                : "hover:bg-black/5"
            )}
            style={{ color: "black" }}
          >
            <ChartColumnBig className="w-5 h-5" />
            {open && (
              <>
                <span>Reportes</span>
                <svg
                  className={cn("w-4 h-4 ml-auto transition-transform", reportesOpen && "rotate-180")}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
          
          {/* Submenú de Reportes */}
          {reportesOpen && open && (
            <div className="ml-8 mt-1 flex flex-col gap-1">
              <a
                href="/admin/reportes"
                className={cn(
                  "flex items-center gap-2 p-3 rounded-md transition-colors duration-200 text-sm",
                  location.pathname === "/admin/reportes"
                    ? "bg-[#F5F5E5] font-medium"
                    : "hover:bg-black/5"
                )}
                style={{ color: "black" }}
              >
                Reporte General
              </a>
              <a
                href="/admin/reportes/organizadores"
                className={cn(
                  "flex items-center gap-2 p-3 rounded-md transition-colors duration-200 text-sm",
                  location.pathname === "/admin/reportes/organizadores"
                    ? "bg-[#F5F5E5] font-medium"
                    : "hover:bg-black/5"
                )}
                style={{ color: "black" }}
              >
                Reporte de Organizadores
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* Apartado de perfil */}
      <div className="mt-auto p-4 border-t border-black/10">
        {user && open ? (
          <AdminUserDropdown user={user} onLogout={handleLogout} />
        ) : open ? (
          <Button
            variant="ghost"
            className="w-full flex items-center gap-3 text-black hover:bg-black/5"
          >
            <CircleUserRound className="w-5 h-5" />
            <span>Mi perfil</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="w-full flex items-center justify-center text-black hover:bg-black/5"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}