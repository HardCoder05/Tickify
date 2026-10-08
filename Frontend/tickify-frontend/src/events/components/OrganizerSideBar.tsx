import { useEffect, useState } from "react";
import { Home, Calendar, LogOut, ChartColumnBig, GalleryVerticalEnd, User as UserIcon } from "lucide-react"; // íconos de lucide-react
import { Link, useLocation } from "react-router-dom";
import type { User } from "@/users/types/user";
import { getCurrentUser, getUserById } from "@/users/services/AuthService";
import UserDropdown from "./UserDropdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";



type Props = {
  open: boolean;
  onToggle: () => void;
};

export default function Sidebar({ open, onToggle }: Props) {
  // user may be null while loading or when unauthenticated
  const [user, setUser] = useState<User | null>(null);


  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      // Primero, intentamos cargar desde localStorage
      try {
        const cached = localStorage.getItem("user");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (mounted && parsed) {
            setUser(parsed as User);
            // Si tenemos datos válidos en localStorage, no seguimos buscando
            // para evitar que se borren los datos
            return;
          }
        }
      } catch (e) {
        console.warn("Error parseando user desde localStorage:", e);
      }

      // Solo si no hay datos en localStorage, intentamos cargar desde la API
      try {
        const data = await getCurrentUser();
        if (!mounted) return;
        
        if (data && typeof data === "object") {
          // Mapear los datos del usuario
          const userId = (data as any).id ?? (data as any).user_id ?? (data as any).id_user;
          const mapped: User = {
            id: userId,
            id_user: userId,
            nombres: (data as any).nombres ?? (data as any).nombre ?? (data as any).name ?? "",
            apellidos: (data as any).apellidos ?? "",
            correo: (data as any).correo ?? (data as any).email ?? "",
            telefono: (data as any).telefono ?? (data as any).phone ?? "",
            rol: (data as any).rol ?? (data as any).role ?? "",
          };
          
          if (mounted) {
            setUser(mapped);
            // Guardar en localStorage para próximas visitas
            try {
              localStorage.setItem("user", JSON.stringify(mapped));
            } catch (e) {
              console.warn("Error guardando user en localStorage:", e);
            }
          }
        }
      } catch (error) {
        console.error("Error cargando usuario desde API:", error);
        // Si falla, no hacemos nada - mantenemos el estado actual (null)
      }
    };

    fetchUser();
    return () => {
      mounted = false;
    };
  }, []);
  const handleLogout = () => {
    localStorage.removeItem("token"); // eliminas el token
    window.location.href = "/login"; // rediriges al login
  };

  const links = [
    { href: "/organizerEvent", label: "Eventos", icon: Calendar },
    { href: "/organizerEvent/reportes", label: "Reportes", icon: ChartColumnBig },
  ];
  const location = useLocation();

  return (
    <div
      className={cn(
        // fixed so the sidebar stays visible while the page scrolls
        "fixed top-0 left-0 h-screen z-30 transition-all duration-300 flex flex-col",
        open ? "w-64" : "w-17"
      )}
      style={{ backgroundColor: "#FCFCF7", color: "black" }}>

      {/* Botón para desplegar*/}
      <div className="flex items-center justify-between p-4 border-b border-black/10">
        <h1 className={cn("text-lg font-bold", !open && "hidden")}>Tickify</h1>
        <Button
          variant="ghost"
          size="icon"
          className="text-black"
          onClick={onToggle}
        >
          <GalleryVerticalEnd />
        </Button>
      </div>
      
      {/* Navegación */}
      <nav className="flex flex-col gap-1 p-2">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = location.pathname === href;
          return (
            <Link
              key={href}
              to={href}
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
            </Link>
          );
        })}
      </nav>

      {/* Footer con menú desplegable del usuario (temporalmente oculto) */}
      <div className="mt-auto p-4">
        {user ? (
          open ? (
            <UserDropdown
              user={user}
              onLogout={handleLogout}
            />
          ) : (
            // When collapsed, show a compact user icon instead of the full dropdown
            <Button
              variant="ghost"
              size="icon"
              className="text-black"
              onClick={onToggle}
              aria-label="Abrir menú usuario"
            >
              <UserIcon className="w-5 h-5" />
            </Button>
          )
        ) : (
          <p className="text-sm text-gray-400">Cargando usuario...</p>
        )}
      </div>

    </div>);
}
