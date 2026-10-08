import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@/users/types/user";

interface UserDropdownProps {
  user: User;
  onLogout: () => void;
}

export default function UserDropdown({ user, onLogout }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Cierra el menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setOpen(false);
    navigate("/organizerEvent/perfil");
  };

  const handleHomeClick = () => {
    setOpen(false);
    navigate("/HomePage");
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left flex items-center justify-between"
      >
        <div>
          <p className="text-sm font-medium">{`${user.nombres || ""} ${user.apellidos || ""}`.trim()}</p>
          <p className="text-xs text-gray-500">{user.correo}</p>
        </div>
        <svg
          className={`w-4 h-4 ml-2 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-12 left-0 w-full bg-white border rounded-md shadow-lg">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium">{`${user.nombres || ""} ${user.apellidos || ""}`.trim()}</p>
            <p className="text-xs text-gray-500">{user.correo}</p>
            {user.telefono && <p className="text-xs text-gray-500">Tel: {user.telefono}</p>}
          </div>
          <button
            onClick={handleProfileClick}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            Mi perfil
          </button>
          <button
            onClick={handleHomeClick}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            Vista de cliente
          </button>
          <button
            onClick={onLogout}
            className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
