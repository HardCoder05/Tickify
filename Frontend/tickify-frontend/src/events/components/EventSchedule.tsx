import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Bloque {
  fecha: string;
  inicio: string;
  fin: string;
}

interface EventScheduleProps {
  tipoEvento: string; // "Evento único" | "Evento recurrente"
  onFechasChange: (fechas: any[] | null) => void;
  initialFechas?: any[] | null;
  showErrors?: boolean; // si true, mostrar mensajes de error; por defecto false
}

export default function EventSchedule({ tipoEvento, onFechasChange, initialFechas = null, showErrors = false }: EventScheduleProps) {
  // Estado para evento único
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [singleError, setSingleError] = useState<string | null>(null);

  // Estado para recurrente
  const [bloques, setBloques] = useState<Bloque[]>([{ fecha: "", inicio: "", fin: "" }]);
  const [bloquesErrors, setBloquesErrors] = useState<(string | null)[]>([null]);

  const agregarBloque = () => {
    setBloques([...bloques, { fecha: "", inicio: "", fin: "" }]);
    setBloquesErrors([...bloquesErrors, null]);
  };

  const eliminarBloque = (index: number) => {
    setBloques(bloques.filter((_, i) => i !== index));
    const errs = [...bloquesErrors];
    errs.splice(index, 1);
    setBloquesErrors(errs);
  };

  const handleChangeBloque = (index: number, field: keyof Bloque, value: string) => {
    const nuevos = [...bloques];
    nuevos[index][field] = value;
    setBloques(nuevos);

    // validate this block immediately
    const err = validateBlock(nuevos[index]);
    const errs = [...bloquesErrors];
    errs[index] = err;
    setBloquesErrors(errs);
  };

  // helper: today's date in yyyy-mm-dd
  const todayStr = new Date().toISOString().split('T')[0];

  // Initialize schedule from initialFechas when provided
  useEffect(() => {
    if (!initialFechas) return;
    // if single event (1 fecha) populate single inputs
    if (initialFechas.length === 1) {
      const f = initialFechas[0];
      const start = new Date(f.fecha_inicio);
      const end = new Date(f.fecha_fin);
      // build local date and time strings (avoid using toISOString which converts to UTC)
      const pad = (n: number) => String(n).padStart(2, '0');
      const localDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
      const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
      setFecha(localDate);
      setHoraInicio(startTime);
      setHoraFin(endTime);
    } else {
      // recurrent: map to bloques
      const mapped = initialFechas.map((f: any) => {
        const s = new Date(f.fecha_inicio);
        const e = new Date(f.fecha_fin);
        const pad = (n: number) => String(n).padStart(2, '0');
        const localDate = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
        const inicio = `${pad(s.getHours())}:${pad(s.getMinutes())}`;
        const fin = `${pad(e.getHours())}:${pad(e.getMinutes())}`;
        return { fecha: localDate, inicio, fin };
      });
      setBloques(mapped);
      // initialize errores for mapped bloques
      const initialErrs = mapped.map((m) => validateBlock(m));
      setBloquesErrors(initialErrs);
    }
  }, [initialFechas]);

  const validateBlock = (b: Bloque): string | null => {
    if (!b.fecha || !b.inicio || !b.fin) return 'Completa fecha y horas';
    if (b.fecha < todayStr) return 'La fecha no puede ser anterior a hoy';
    // combine to compare
    const start = new Date(`${b.fecha}T${b.inicio}`);
    const end = new Date(`${b.fecha}T${b.fin}`);
    if (end <= start) return 'La hora de fin debe ser mayor que la hora de inicio';
    return null;
  };

  // Use ref to track previous bloques serialization to avoid infinite loops
  const prevBloquesRef = useRef<string>('');

  // Cada vez que cambian los inputs, calculamos las fechas y llamamos al padre
  useEffect(() => {
    if (tipoEvento === "Evento único") {
      // validate date not before today
      if (!fecha || !horaInicio || !horaFin) {
        setSingleError(null);
        onFechasChange(null);
        return;
      }
      if (fecha < todayStr) {
        setSingleError('La fecha no puede ser anterior a hoy');
        onFechasChange(null);
        return;
      }
      const start = new Date(`${fecha}T${horaInicio}`);
      const end = new Date(`${fecha}T${horaFin}`);
      if (end <= start) {
        setSingleError('La hora de fin debe ser mayor que la hora de inicio');
        onFechasChange(null);
        return;
      }
      setSingleError(null);
      // Use local date-time string without converting to UTC to avoid shifting the day
      const fechaInicioISO = `${fecha}T${horaInicio}:00`;
      const fechaFinISO = `${fecha}T${horaFin}:00`;
      onFechasChange([
        {
          fecha_inicio: fechaInicioISO,
          fecha_fin: fechaFinISO,
          capacidad_maxima: 0,
          aforo_disponible: 0,
        },
      ]);
    } else {
      // recurrente
      if (!bloques.length) {
        onFechasChange(null);
        return;
      }

      // Check if bloques actually changed by comparing serialized values
      const currentSerialized = JSON.stringify(bloques);
      if (prevBloquesRef.current === currentSerialized) {
        // Bloques haven't actually changed, skip to avoid infinite loop
        return;
      }
      prevBloquesRef.current = currentSerialized;

      const errs: (string | null)[] = [];
      let hasError = false;
      for (const b of bloques) {
        const err = validateBlock(b);
        errs.push(err);
        if (err) hasError = true;
      }
      
      // DON'T call setBloquesErrors here - it causes infinite loop
      // bloquesErrors are already set in handleChangeBloque
      
      if (hasError) {
        onFechasChange(null);
        return;
      }

      const fechas = bloques.map((b) => ({
        // keep local date-time string (no UTC conversion) to preserve the selected day/time
        fecha_inicio: `${b.fecha}T${b.inicio}:00`,
        fecha_fin: `${b.fecha}T${b.fin}:00`,
        capacidad_maxima: 0,
        aforo_disponible: 0,
      }));

      onFechasChange(fechas);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoEvento, fecha, horaInicio, horaFin, bloques]);

  if (tipoEvento === "Evento único") {
    return (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 items-center">
          <div className="col-span-1 sm:col-span-1">
            <label className="block mb-1 font-normal">Fecha</label>
            <Input
              type="date"
              className="bg-[#F5F5E5] w-full"
              value={fecha}
              min={todayStr}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>

          <div className="col-span-1 sm:col-span-1">
            <label className="block mb-1 font-normal">Hora de inicio</label>
            <Input
              type="time"
              className="bg-[#F5F5E5] w-full"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              required
            />
          </div>

          <div className="col-span-1 sm:col-span-1">
            <label className="block mb-1 font-normal">Hora de fin</label>
            <Input
              type="time"
              className="bg-[#F5F5E5] w-full"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              required
            />
          </div>

          <div className="col-span-1 sm:col-span-1 flex sm:justify-end">
            <div className="hidden sm:block" />
          </div>
        </div>
    {singleError && showErrors ? <p className="text-sm text-red-600 mt-2">{singleError}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <div className="block mb-2 font-normal">Fechas y horarios</div>
      {bloques.map((bloque, index) => (
        <div key={index} className="border border-[#E4E4E7] rounded-md p-5 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 items-center">
            <div className="col-span-1 sm:col-span-1">
              <label className="block mb-1 font-normal">Fecha</label>
              <Input
                type="date"
                value={bloque.fecha}
                min={todayStr}
                onChange={(e) => handleChangeBloque(index, "fecha", e.target.value)}
                className="bg-[#F5F5E5] w-full"
                required
              />
            </div>

            <div className="col-span-1 sm:col-span-1">
              <label className="block mb-1 font-normal">Hora de inicio</label>
              <Input
                type="time"
                value={bloque.inicio}
                onChange={(e) => handleChangeBloque(index, "inicio", e.target.value)}
                className="bg-[#F5F5E5] w-full"
                required
              />
            </div>

            <div className="col-span-1 sm:col-span-1">
              <label className="block mb-1 font-normal">Hora de fin</label>
              <Input
                type="time"
                value={bloque.fin}
                onChange={(e) => handleChangeBloque(index, "fin", e.target.value)}
                className="bg-[#F5F5E5] w-full"
                required
              />
            </div>

            <div className="col-span-1 sm:col-span-1 flex sm:justify-end">
              <Button
                type="button"
                size="sm"
                className="w-full sm:w-auto bg-yellow-400 text-black justify-center hover:bg-yellow-500"
                onClick={() => eliminarBloque(index)}
              >
                Eliminar
              </Button>
            </div>
          </div>
          {bloquesErrors[index] && showErrors ? (
            <p className="text-sm text-red-600 mt-2">{bloquesErrors[index]}</p>
          ) : null}
        </div>
      ))}

      <div className="mt-4">
        <Button type="button" size="sm" className="w-full sm:w-auto bg-black text-white flex items-center justify-center gap-2 hover:bg-gray-800" onClick={agregarBloque}>
          Añadir nuevo horario
        </Button>
      </div>
    </div>
  );
}
