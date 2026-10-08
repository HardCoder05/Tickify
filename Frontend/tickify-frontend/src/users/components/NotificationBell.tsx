import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck } from "lucide-react"; // Importamos CheckCheck
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/users/context/AuthContext";
import { 
  getUnreadNotifications, 
  markNotificationAsRead, 
  type Notificacion 
} from "@/users/services/NotificationService";

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;
      setLoading(true);
      
      try {
        const data = await getUnreadNotifications(user.id);
        
        setNotifications(data);
      } catch (error) {
        console.error("Error al cargar notificaciones:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const handleMarkAsRead = async (id: number) => {
    if (!user?.id) return;
    
    // --- CAMBIO CLAVE AQUÍ ---
    // En lugar de eliminarla (.filter), la buscamos y le cambiamos el estado 'leido' a true
    setNotifications((prev) => 
      prev.map((n) => 
        n.id === id ? { ...n, leido: true } : n
      )
    );
    
    // Llamada a la API en segundo plano
    try {
        if (id < 1000) { 
            console.log("Simulando marcado de lectura para ID mock:", id);
        } else {
            await markNotificationAsRead(id, user.id);
        }
    } catch (e) {
        console.log("Nota: Error esperado si marcas una notificación hardcodeada.");
    }
  };

  // Calculamos el contador basándonos solo en las que tienen leido: false
  const unreadCount = notifications.filter(n => !n.leido).length;

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full w-10 h-10">
          <Bell className="h-5 w-5" />
          
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0 shadow-xl border-gray-100 rounded-xl mr-4" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/80 backdrop-blur-sm rounded-t-xl">
          <h4 className="font-semibold text-sm text-gray-800">Notificaciones</h4>
          {unreadCount > 0 ? (
            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {unreadCount} nuevas
            </span>
          ) : (
            <span className="text-[10px] text-gray-400">Todo leído</span>
          )}
        </div>
        
        <div className="max-h-[350px] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-xs text-gray-500">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-2"></div>
                Cargando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <Bell className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">No tienes notificaciones nuevas</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  // Cambiamos el fondo si ya está leída para dar feedback visual
                  className={`relative p-4 transition-all flex gap-3 items-start group ${
                    notif.leido ? "bg-gray-50 opacity-60" : "hover:bg-gray-50 bg-white"
                  }`}
                >
                  {/* Punto azul solo si NO está leída */}
                  {!notif.leido ? (
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                  ) : (
                    // Si está leída, mostramos doble check sutil
                    <CheckCheck className="mt-1 h-3 w-3 text-blue-400 flex-shrink-0" />
                  )}
                  
                  <div className="flex-1 space-y-1">
                    <p className={`text-sm leading-snug ${notif.leido ? "text-gray-500" : "text-gray-800 font-medium"}`}>
                      {notif.mensaje}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                      {new Date(notif.fecha_creacion).toLocaleDateString("es-PE", {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {/* El botón solo aparece si NO está leída */}
                  {!notif.leido && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-all absolute right-2 top-2"
                      onClick={() => handleMarkAsRead(notif.id)}
                      title="Marcar como leída"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {notifications.length > 0 && (
            <div className="p-2 border-t bg-gray-50 text-center">
                <button 
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => {
                        // Marcar todas visualmente
                        setNotifications(prev => prev.map(n => ({...n, leido: true})));
                    }} 
                >
                    Marcar todo como leído
                </button>
            </div>
        )}
      </PopoverContent>
    </Popover>
  );
}