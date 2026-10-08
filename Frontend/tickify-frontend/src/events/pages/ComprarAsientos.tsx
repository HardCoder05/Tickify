import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { ShoppingCart, Clock, Check } from "lucide-react";
import { fetchEventoCompleto } from "@/users/services/PurcharseService";

// Simulación de obtener el token de autenticación (debería venir de tu sistema de Auth)
const getAuthToken = () => localStorage.getItem('token');
//const getUserId = () => 3; // Simulación: Obtener el ID de usuario autenticado

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

interface Asiento {
  id: number;
  fila: number;
  numero: number;
  estado: "libre" | "reservado" | "vendido";
  reserva_expira?: string;
  reservado_por: number;
}

export default function SeatSelectorUser() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [searchParams] = useSearchParams();
  const eventoFechaId = Number(searchParams.get("fecha"));
  const zonaID = Number(searchParams.get("zona"));
  const tarifaID = Number(searchParams.get("tarifa"));
  const tarifaPrecio = Number(searchParams.get("tarifaPrecio"));

  const zonaNombre = searchParams.get("zonaNombre") || "Zona";
  const tarifaNombre = searchParams.get("tarifaNombre") || "Tarifa";

  const [asientos, setAsientos] = useState<Asiento[][]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Asiento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ESTADOS REINTRODUCIDOS
  const [maxSeats, setMaxSeats] = useState(1); // Límite de asientos seleccionables
  const [reservaExpira, setReservaExpira] = useState<string | null>(null);
  const [tiempoRestante, setTiempoRestante] = useState<string | null>(null);

  
  // =====================
  //    CARGAR ASIENTOS
  // =====================
  // Uso de useCallback para estabilizar la dependencia en useEffect
  const cargarAsientos = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/v1/asientos/disponibilidad/fecha/${eventoFechaId}?zona_id=${zonaID}`
      );
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (!user) throw new Error("Debes iniciar sesión para ver los asientos.");

      if (!response.ok) throw new Error("Error al cargar asientos");

      const data: Asiento[] = await response.json();

      // Buscar si algún asiento de la respuesta tiene una reserva_expira y actualizar el estado
      const asientoReservado = data.filter(
        (a) => a.estado === "reservado" && a.reserva_expira && a.reservado_por === user.id
      );
      if (asientoReservado.length > 0) {
        setSelectedSeats(asientoReservado);
        setMaxSeats(asientoReservado.length);
        setReservaExpira(asientoReservado[0].reserva_expira ?? null);
      } else {
        setSelectedSeats([]); 
        setMaxSeats(1);
        setReservaExpira(null); // Asegurar que el estado se limpia si no hay reservas
      }

      // Organizar asientos en matriz (lógica del componente anterior)
      const matriz: Record<number, Asiento[]> = {};
      data.forEach((asiento) => {
        if (!matriz[asiento.fila]) matriz[asiento.fila] = [];
        matriz[asiento.fila].push(asiento);
      });

      const ordenado = Object.keys(matriz)
        .sort((a, b) => Number(a) - Number(b))
        .map((fila) => matriz[Number(fila)].sort((a, b) => a.numero - b.numero));

      setAsientos(ordenado);
    } catch (err) {
      alert("Error al cargar asientos");
    } finally {
      setIsLoading(false);
    }
  }, [eventoFechaId, zonaID]);

  // Ejecutar carga inicial y al cambiar ids
  useEffect(() => {
    cargarAsientos();
  }, [cargarAsientos]);

  // =====================
  //    TEMPORIZADOR
  // =====================
  useEffect(() => {
    if (reservaExpira) {
      const interval = setInterval(() => {
        const ahora = new Date().getTime();
        const expira = new Date(reservaExpira + "Z").getTime();
        const diff = expira - ahora;

        if (diff <= 0) {
          setTiempoRestante(null);
          setReservaExpira(null);
          setSelectedSeats([]);
          alert("Tu reserva ha expirado. Por favor selecciona nuevamente.");
          cargarAsientos(); // Recargar para actualizar estados
        } else {
          const minutos = Math.floor(diff / 60000);
          const segundos = Math.floor((diff % 60000) / 1000);
          setTiempoRestante(`${minutos}:${segundos.toString().padStart(2, '0')}`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [reservaExpira, cargarAsientos]);

  // ============================
  //    SELECCIONAR ASIENTO
  // ============================
  const toggleSeat = (asiento: Asiento) => {
    // Si ya existe una reserva activa, no permitir selección/deselección de asientos
    if (reservaExpira) {
        alert("Ya tienes una reserva temporal activa. Debes comprar o esperar a que expire.");
        return;
    }

    if (asiento.estado !== "libre") return;

    const seatId = asiento.id;
    const isSelected = selectedSeats.some((s) => s.id === seatId);

    if (isSelected) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seatId));
    } else {
      // Aplicar límite máximo de asientos
      if (selectedSeats.length < maxSeats) {
        setSelectedSeats([...selectedSeats, asiento]);
      } else {
        alert(`Solo puedes seleccionar ${maxSeats} asientos`);
      }
    }
  };

  // ============================
  //    RESERVAR ASIENTOS
  // ============================
  const reservarAsientos = async () => {
    if (selectedSeats.length === 0) {
      alert('Selecciona al menos un asiento para reservar.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/asientos/reserva/temporal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          asiento_fecha_ids: selectedSeats.map(s => s.id),
          duracion_minutos: 15
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al reservar asientos');
      }

      const data = await response.json();
      
      // La respuesta debería contener la información de expiración del asiento reservado
      if (data.length > 0 && data[0].reserva_expira) {
        setReservaExpira(data[0].reserva_expira);
      }

      alert('✅ Asientos reservados por 15 minutos. Completa tu compra antes de que expire.');
      // Importante: recargar asientos para que el estado se refleje en el mapa de asientos
      await cargarAsientos();

    } catch (error) {
      console.error('Error:', error);
      alert(`❌ ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };


  // ============================
  //    CONFIRMAR COMPRA (MODIFICADA)
  // ============================
  const confirmarCompra = async () => {
    if (!reservaExpira) {
        // Si no hay reserva expirando, el usuario está tratando de comprar sin reservar
        // Esto puede ser un flujo no deseado, o puede significar que se saltó el paso de reserva.
        alert('Debes reservar los asientos primero o la reserva actual ha expirado. Por favor, recarga y reserva.');
        return;
    }
    
    // Si hay reserva activa, se salta a la página de resumen, donde se completará la compra
    const eventoCompleto = await fetchEventoCompleto(Number(id));

    const precioTarifa = tarifaPrecio || 0;
    const total = selectedSeats.length * precioTarifa;

    // Se asume que en el componente de resumen/pago, se hará la llamada al endpoint /compras/
    // La función original saltaba directamente, pero si queremos usar el flujo de reserva
    // y luego ir al resumen, solo necesitamos la navegación, ya que los asientos 
    // seleccionados (que ahora están 'reservados') son los que se pasan.
    
    navigate(`/eventos/${id}/compra/resumen`, {
      state: {
        tipo: "asientos",
        evento: eventoCompleto.evento,
        zonaNombre,
        tarifaNombre,
        tarifaId: tarifaID,
        tarifaPrecio: precioTarifa,
        eventoFechaId,
        asientos: selectedSeats,
        total,
        // Pasar el tiempo de expiración para mostrarlo en el resumen
        reservaExpira, 
      },
    });
  };

  // Lógica de carga...
  if (isLoading && asientos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-gray-300 border-t-indigo-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* ... (Botón Volver) ... */}
      <button
        onClick={() => navigate(-1)}
        className="text-gray-600 mb-4 hover:text-gray-900"
      >
        ← Volver
      </button>

      {/* HEADER con Timer y Límite */}
      <div className="bg-white shadow rounded-xl p-6 mb-6">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <ShoppingCart className="text-indigo-600" /> Selecciona tus asientos
                </h1>
                <p className="text-gray-500 mt-1">
                    <strong>{zonaNombre}</strong> —{" "}
                    <span>
                        {tarifaNombre.replace(zonaNombre, "").replace(/^[ -]+/, "").trim()}
                    </span>
                </p>
                <div className="mt-4">
                    <label className="block text-gray-700 text-sm font-medium mb-1">
                        Cantidad de asientos (Máx: 10)
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={maxSeats}
                        onChange={(e) => {
                            const value = parseInt(e.target.value) || 1;
                            setMaxSeats(Math.min(10, Math.max(1, value)));
                            setSelectedSeats([]); // Limpiar selección al cambiar el límite
                            setReservaExpira(null); // Limpiar reserva si existía
                        }}
                        className="p-2 border border-gray-300 rounded-lg w-20 text-center"
                        disabled={!!reservaExpira} // Deshabilitar si hay reserva activa
                    />
                </div>
            </div>

            <div className="text-right">
                {tiempoRestante && (
                    <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-800 rounded-lg p-2 flex items-center gap-2 mb-2 font-bold">
                        <Clock size={20} />
                        Tiempo Restante: <span className="text-xl">{tiempoRestante}</span>
                    </div>
                )}
                <div className="text-sm text-gray-500">Seleccionados</div>
                <div className="text-4xl font-bold text-indigo-600">
                    {selectedSeats.length} / {maxSeats}
                </div>
            </div>
        </div>
      </div>

      {/* ESCENARIO */}
      <div className="bg-gray-900 text-white text-center py-4 rounded-xl mb-6 font-semibold tracking-wide">
        🎭 ESCENARIO
      </div>

      {/* ASIENTOS */}
      <div className="bg-white shadow rounded-xl p-6">
        {/* ... Lógica de renderizado de asientos ... */}
        <div className="flex flex-wrap justify-center">
        {asientos.map((fila, index) => (
          <div key={index} className="flex items-center mb-3">
            <div className="w-10 text-gray-600 font-semibold mr-2 text-sm text-center flex-shrink-0">
              {fila[0]?.fila}
            </div>

            <div className="flex">
            {fila.map((asiento) => {
              const selected = selectedSeats.some((s) => s.id === asiento.id);

              // REINTODUCCIÓN DE ESTILOS MÁS SIMILARES AL ANTERIOR CON TAILWIND
              const isReservado = asiento.estado === "reservado";
              const isVendido = asiento.estado === "vendido";
              const isLibre = asiento.estado === "libre";
              
              let color = "";
              let cursor = isLibre ? "cursor-pointer" : "cursor-not-allowed";
              let hover = isLibre || selected ? "hover:scale-110" : "";
              let opacity = isLibre || selected ? "opacity-100" : "opacity-60";

              if (selected) color = "bg-blue-600";
              else if (isLibre) color = "bg-green-500";
              else if (isReservado) color = "bg-yellow-500";
              else if (isVendido) color = "bg-red-500";

              return (
                <div
                  key={asiento.id}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white transition-all mx-1 ${color} ${cursor} ${hover} ${opacity} relative`}
                  onClick={() => toggleSeat(asiento)}
                >
                  {asiento.numero}
                  {selected && (
                      <div className="absolute -top-1 -right-1 bg-indigo-600 rounded-full p-0.5">
                          <Check size={12} color="white" />
                      </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* FOOTER - Acciones (Reservar / Continuar a pago) */}
      {selectedSeats.length > 0 && (
        <div className="bg-white shadow rounded-xl p-6 mt-6 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="font-medium text-gray-700 mb-1">Asientos seleccionados:</p>
            <div className="flex flex-wrap gap-2">
              {selectedSeats.map((s) => (
                <span
                  key={s.id}
                  className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm"
                >
                  Fila {s.fila} — #{s.numero}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
             {/* Mostrar Reservar solo si no hay reserva expirando */}
            {!reservaExpira && (
              <button
                onClick={reservarAsientos}
                disabled={isLoading}
                className={`px-6 py-3 bg-yellow-500 text-white rounded-lg font-semibold flex items-center gap-2 transition-opacity ${
                  isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-yellow-600"
                }`}
              >
                <Clock size={20} />
                Reservar (15 min)
              </button>
            )}

            {/* Mostrar Continuar a pago solo si hay reserva expirando */}
            {reservaExpira && (
              <button
                onClick={confirmarCompra}
                disabled={isLoading}
                className={`px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold flex items-center gap-2 transition-opacity ${
                  isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700"
                }`}
              >
                <ShoppingCart size={20} />
                Continuar a pago
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}