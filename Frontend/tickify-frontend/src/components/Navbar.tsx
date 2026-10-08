import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Menu, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/users/context/AuthContext";
// Importar el nuevo componente
import NotificationBell from "@/users/components/NotificationBell";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-md px-6 py-4 relative z-50">
      <div className="flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-secondary">
          ⌘ Tickify
        </Link>
        <div className="hidden md:flex items-center space-x-4">
          <Link to="/" className="text-gray-600 hover:text-gray-900">
            Inicio
          </Link>
          <Link to="/eventos" className="text-gray-600 hover:text-gray-900">
            Eventos
          </Link>

          {!user ? (
            <>
              <Button asChild className="w-28">
                <Link to="/login">Iniciar Sesión</Link>
              </Button>
              <Button
                variant="secondary"
                asChild
                className="w-28 bg-secondary/80 text-white hover:bg-muted-foreground"
              >
                <Link to="/register">Registrarse</Link>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {/* --- AQUÍ AGREGAMOS LA CAMPANITA --- */}
              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border hover:ring-2 hover:ring-secondary transition ml-2">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="text-gray-600 w-5 h-5" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>
                    {user.nombres || "Usuario"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/perfil">Mi perfil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/mis-tickets">Mis tickets</Link>
                  </DropdownMenuItem>
                  {user.rol?.toUpperCase() === "ORGANIZADOR" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/organizerEvent">Vista de organizador</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      to="/login"
                      onClick={logout}
                      className="text-red-500"
                    >
                      Cerrar sesión
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          {/* Campanita en móvil también si está logueado */}
          {user && <NotificationBell />}

          <Button
            variant="outline"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden mt-2 bg-white shadow-md rounded-b-lg flex flex-col space-y-2 p-4">
          <Link to="/" className="text-gray-600 hover:text-gray-900">
            Home
          </Link>
          <Link to="/eventos" className="text-gray-600 hover:text-gray-900">
            Eventos
          </Link>

          {!user ? (
            <>
              <Button asChild className="w-full">
                <Link to="/login">Iniciar Sesión</Link>
              </Button>
              <Button
                variant="secondary"
                asChild
                className="w-full bg-secondary/80 text-white hover:bg-muted-foreground"
              >
                <Link to="/register">Registrarse</Link>
              </Button>
            </>
          ) : (
            <>
              <Link to="/perfil" className="text-gray-600 hover:text-gray-900">
                Mi perfil
              </Link>
              <Link
                to="/mis-tickets"
                className="text-gray-600 hover:text-gray-900"
              >
                Mis tickets
              </Link>
              {user.rol?.toUpperCase() === "ORGANIZADOR" && (
                <Link
                  to="/organizerEvent"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Vista de organizador
                </Link>
              )}
              <Button
                onClick={logout}
                className="w-full bg-red-500 text-white"
              >
                Cerrar sesión
              </Button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}