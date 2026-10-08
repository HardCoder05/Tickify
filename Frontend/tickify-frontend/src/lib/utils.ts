import { clsx, type ClassValue } from "clsx"
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function DynamicTitle() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    
    const titles: Record<string, string> = {
      "/": "Inicio",
      "/login": "Iniciar Sesión",
      "/register": "Registro",
      "/eventos": "Eventos",
      "/perfil": "Mi Perfil",
      "/mis-tickets": "Mis Tickets",
      "/organizer-request": "Solicitud de Organizador"
    };

    let title = "Tickify";

    if (titles[path]) {
      title = titles[path];
    } else if (path.startsWith("/eventos/") && !path.includes("comprar") && !path.includes("seleccionar-asientos") && !path.includes("compra")) {
      title = "Detalle del Evento";
    } else if (path.includes("/comprar")) {
      title = "Comprar Entradas";
    } else if (path.includes("seleccionar-asientos")) {
      title = "Seleccionar Asientos";
    } else if (path.includes("/compra/resumen")) {
      title = "Resumen de Compra";
    } else if (path.startsWith("/compra-exitosa")) {
      title = "Compra Exitosa";
    } else if (path.includes("mis-tickets/imprimir")) {
      title = "Imprimir Tickets";
    } else if (path.startsWith("/mis-tickets/")) {
      title = "Detalle de Ticket";
    }

    document.title = `${title} | Tickify`;
  }, [location]);

  return null;
}
