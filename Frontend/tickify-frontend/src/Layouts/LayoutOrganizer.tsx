import Sidebar from "@/events/components/OrganizerSideBar";
import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function OrganizerLayout() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Interceptar errores de fetch para detectar token expirado
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Si es 401 (no autorizado) y estamos en rutas de organizador, redirigir al login
      if (response.status === 401) {
        // Limpiar el localStorage
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("organizador_id");
        
        // Redirigir al login
        navigate("/login", { replace: true });
      }
      
      return response;
    };

    // Cleanup: restaurar fetch original cuando el componente se desmonte
    return () => {
      window.fetch = originalFetch;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={open} onToggle={() => setOpen((v) => !v)} />
      {/* add left margin to avoid content being overlapped by the fixed sidebar (w-64)
          Wrap the page content in a centered container so left/right margins align */}
      <main className={`flex-grow bg-gray-50 transition-all duration-300 ${open ? "ml-64" : "ml-[4.25rem]"}`}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}