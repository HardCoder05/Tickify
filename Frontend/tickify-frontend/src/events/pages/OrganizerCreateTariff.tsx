import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Ticket, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getZonasByEvento, getTiposByEvento, getEtapasByEvento, createTarifa, updateTarifa, createTipoTicket, createEtapa } from "../services/TariffService";
import Modal from "../components/Modal";
import ZoneModal from "../components/ZoneModal";
import EtapaModal from "../components/EtapaModal";
import type { Etapa, TipoEvento } from "../types/event";
import type { Zona } from "../types/event";
import BackButton from "@/components/ui/backButton";
import { getEventById } from "../services/EventService";

export default function OrganizerCreateTariffPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Local UI state (not wired to API for now)
  // Store selected ids as numbers (or null when none selected) for clarity
  // allow string values for idx-N fallbacks or numeric ids
  const [tipo, setTipo] = useState<string | number | null>(null);
  const [zona, setZona] = useState<string | number | null>(null);
  const [etapa, setEtapa] = useState<string | number | null>(null);
  const [selectedTipoObj, setSelectedTipoObj] = useState<any | null>(null);
  const [selectedZonaObj, setSelectedZonaObj] = useState<any | null>(null);
  const [selectedEtapaObj, setSelectedEtapaObj] = useState<any | null>(null);
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [zonasList, setZonasList] = useState<Zona[] | null>(null);
  const [zonasLoading, setZonasLoading] = useState(false);
  const [zonasError, setZonasError] = useState<string | null>(null);
  const [tiposList, setTiposList] = useState<TipoEvento[] | null>(null);
  const [tiposLoading, setTiposLoading] = useState(false);
  const [tiposError, setTiposError] = useState<string | null>(null);
  const [etapasList, setEtapasList] = useState<Etapa[] | null>(null);
  const [etapasLoading, setEtapasLoading] = useState(false);
  const [etapasError, setEtapasError] = useState<string | null>(null);

  // Modal / crear tipo
  const [isTipoModalOpen, setIsTipoModalOpen] = useState(false);
  const [nuevoTipoNombre, setNuevoTipoNombre] = useState("");
  const [nuevoTipoDescripcion, setNuevoTipoDescripcion] = useState("");
  const [creatingTipo, setCreatingTipo] = useState(false);
  const [tipoCreateError, setTipoCreateError] = useState<string | null>(null);
  // Modal / crear etapa
  const [isEtapaModalOpen, setIsEtapaModalOpen] = useState(false);
  // Modal / crear zona
  const [isZonaModalOpen, setIsZonaModalOpen] = useState(false);

  // support edit via query param: ?tariffId=123
  const [searchParams] = useSearchParams();
  const tariffIdParam = searchParams.get('tariffId');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!id) {
      setSubmitError("Evento inválido");
      return;
    }

    // basic validation
    if (!nombre || !precio || !cantidad) {
      setSubmitError("Por favor completa nombre, precio y cantidad");
      return;
    }

    // Normalizar payload: resolver ids correctamente (si usamos fallback idx-* usamos el objeto seleccionado)
    const zona_id = typeof zona === 'number' ? zona : (selectedZonaObj && (selectedZonaObj.id !== undefined) ? Number(selectedZonaObj.id) : null);
    const tipo_ticket_id = typeof tipo === 'number' ? tipo : (selectedTipoObj && (selectedTipoObj.id !== undefined) ? Number(selectedTipoObj.id) : null);
    const etapa_id = typeof etapa === 'number' ? etapa : (selectedEtapaObj && (selectedEtapaObj.id !== undefined) ? Number(selectedEtapaObj.id) : null);

    const payload = {
      nombre: nombre,
      precio: Number(precio),
      cantidad: Number(cantidad),
      zona_id: zona_id,
      tipo_ticket_id: tipo_ticket_id,
      etapa_id: etapa_id,
      estado: "activo",
    } as any;

    // Debug helpers para inspeccionar por qué no se toman los ids
    // Abre la consola del navegador y verifica estos logs cuando intentes guardar
    // - zonasList y tiposList: datos recibidos del backend
    // - valores seleccionados tipo/zona/etapa
    // - payload final enviado
    // Esto ayudará a identificar si el problema está en la carga de opciones o en la selección
    // (por ejemplo, objetos sin 'id' o keys diferentes)
    // eslint-disable-next-line no-console
    console.debug("zonasList:", zonasList);
    // eslint-disable-next-line no-console
    console.debug("tiposList:", tiposList);
    // eslint-disable-next-line no-console
    console.debug("selected -> zona, tipo, etapa:", { zona, tipo, etapa });
    // eslint-disable-next-line no-console
    console.debug("payload -> crear tarifa:", payload);

    try {
      setSubmitting(true);

  // If tipo_ticket_id is not resolvable but we have a selectedTipoObj, create it first
  if ((payload.tipo_ticket_id === null || payload.tipo_ticket_id === undefined) && selectedTipoObj && selectedTipoObj.nombre) {
        // eslint-disable-next-line no-console
        console.debug('Creando tipo antes de crear tarifa porque no tiene id en la lista...', selectedTipoObj);
        try {
          const createdTipo = await createTipoTicket(Number(id), { nombre: selectedTipoObj.nombre, descripcion: selectedTipoObj.descripcion || '', estado: selectedTipoObj.estado || 'activo', incremento: 0 });
          // eslint-disable-next-line no-console
          console.debug('Tipo creado automáticamente:', createdTipo);
          payload.tipo_ticket_id = createdTipo?.id ?? payload.tipo_ticket_id;
          // update tiposList optimistically
          setTiposList((prev) => (createdTipo ? [createdTipo, ...(prev || [])] : prev));
        } catch (errCreate: any) {
          // if creation fails, surface the error and abort
          // eslint-disable-next-line no-console
          console.error('No se pudo crear el tipo automáticamente:', errCreate);
          throw errCreate;
        }
      }

      // If etapa_id is not resolvable but we have a selectedEtapaObj, create it first
      if ((payload.etapa_id === null || payload.etapa_id === undefined) && selectedEtapaObj && selectedEtapaObj.nombre) {
        // eslint-disable-next-line no-console
        console.debug('Creando etapa antes de crear tarifa porque no tiene id en la lista...', selectedEtapaObj);
        try {
          const createdEtapa = await createEtapa(Number(id), { nombre: selectedEtapaObj.nombre, fecha_inicio: selectedEtapaObj.fecha_inicio, fecha_fin: selectedEtapaObj.fecha_fin, estado: selectedEtapaObj.estado || 'activo' });
          // eslint-disable-next-line no-console
          console.debug('Etapa creada automáticamente:', createdEtapa);
          payload.etapa_id = createdEtapa?.id ?? payload.etapa_id;
          // update etapasList optimistically
          setEtapasList((prev) => (createdEtapa ? [createdEtapa, ...(prev || [])] : prev));
        } catch (errCreate: any) {
          // eslint-disable-next-line no-console
          console.error('No se pudo crear la etapa automáticamente:', errCreate);
          throw errCreate;
        }
      }

      // Si hay tariffIdParam, actualizar; si no, crear
      if (tariffIdParam) {
        await updateTarifa(Number(id), Number(tariffIdParam), payload);
      } else {
        await createTarifa(Number(id), payload);
      }
      // on success navigate back to event detail
      navigate(`/organizerEvent/${id}`);
    } catch (err: any) {
      setSubmitError(err?.response?.data?.detail || err?.message || (tariffIdParam ? "Error al actualizar tarifa" : "Error al crear tarifa"));
    } finally {
      setSubmitting(false);
    }
  };

  // Load zonas for the event when id is present
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return;
      setZonasLoading(true);
      setZonasError(null);
      try {
        const res = await getZonasByEvento(Number(id));
        if (mounted) setZonasList(res || []);
      } catch (err: any) {
        if (mounted) setZonasError(err?.message || "Error al cargar zonas");
      } finally {
        if (mounted) setZonasLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);
  // Load tipos separately
  React.useEffect(() => {
    let mounted = true;
    const loadTipos = async () => {
      if (!id) return;
      setTiposLoading(true);
      setTiposError(null);
      try {
        const res = await getTiposByEvento(Number(id));
        if (mounted) setTiposList(res || []);
      } catch (err: any) {
        if (mounted) setTiposError(err?.message || "Error al cargar tipos");
      } finally {
        if (mounted) setTiposLoading(false);
      }
    };
    loadTipos();
    return () => { mounted = false; };
  }, [id]);

  // When lists load, if we have selected*Obj from prefill, try to resolve to a real option
  useEffect(() => {
    if (zonasList && selectedZonaObj) {
      const match = zonasList.findIndex(z => String(z.id) === String((selectedZonaObj as any).id) || (z.nombre && z.nombre === (selectedZonaObj as any).nombre));
      if (match >= 0) {
        const z = zonasList[match];
        setZona(z.id ?? `idx-${match}`);
        setSelectedZonaObj(null);
      }
    }
  }, [zonasList, selectedZonaObj]);

  useEffect(() => {
    if (tiposList && selectedTipoObj) {
      const match = tiposList.findIndex(t => String(t.id) === String((selectedTipoObj as any).id) || (t.nombre && t.nombre === (selectedTipoObj as any).nombre));
      if (match >= 0) {
        const t = tiposList[match];
        setTipo(t.id ?? `idx-${match}`);
        setSelectedTipoObj(null);
      }
    }
  }, [tiposList, selectedTipoObj]);

  useEffect(() => {
    if (etapasList && selectedEtapaObj) {
      const match = etapasList.findIndex(e => String(e.id) === String((selectedEtapaObj as any).id) || (e.nombre && e.nombre === (selectedEtapaObj as any).nombre));
      if (match >= 0) {
        const e = etapasList[match];
        setEtapa(e.id ?? `idx-${match}`);
        setSelectedEtapaObj(null);
      }
    }
  }, [etapasList, selectedEtapaObj]);

  // Load etapas separately
  React.useEffect(() => {
    let mounted = true;
    const loadEtapas = async () => {
      if (!id) return;
      setEtapasLoading(true);
      setEtapasError(null);
      try {
        const res = await getEtapasByEvento(Number(id));
        if (mounted) setEtapasList(res || []);
      } catch (err: any) {
        if (mounted) setEtapasError(err?.message || "Error al cargar etapas");
      } finally {
        if (mounted) setEtapasLoading(false);
      }
    };
    loadEtapas();
    return () => { mounted = false; };
  }, [id]);

  // If tariffId provided in query, load tarifa and prefill form
  useEffect(() => {
    let mounted = true;
    const loadTarifa = async () => {
      if (!id || !tariffIdParam) return;
      try {
        const svc = await import("../services/TariffService");
        let tarifa: any = null;
        try {
          tarifa = await svc.getTarifaById(Number(id), Number(tariffIdParam));
        } catch (errGetSingle) {
          // Fallback: some backends don't expose single-get; fetch all and find
          try {
            const list = await svc.getTarifasByEvento(Number(id));
            tarifa = list.find((x: any) => String(x.id) === String(tariffIdParam));
          } catch (errList) {
            throw errGetSingle || errList;
          }
        }
        if (!mounted || !tarifa) return;
        // Prefill form fields
        setNombre(tarifa.nombre || "");
        setPrecio(tarifa.precio !== undefined && tarifa.precio !== null ? String(tarifa.precio) : "");
        setCantidad(tarifa.cantidad !== undefined && tarifa.cantidad !== null ? String(tarifa.cantidad) : "");

        // Set selects: if tarifa has ids, set numeric values; if not, fallback to object matching
        if (tarifa.zona_id !== undefined && tarifa.zona_id !== null) {
          setZona(Number(tarifa.zona_id));
        } else if ((tarifa as any).zona) {
          setSelectedZonaObj((tarifa as any).zona);
          // we'll set zona to idx-0 to allow select to show option when zonasList loaded
          setZona('idx-0');
        }

        if (tarifa.tipo_ticket_id !== undefined && tarifa.tipo_ticket_id !== null) {
          setTipo(Number(tarifa.tipo_ticket_id));
        } else if ((tarifa as any).tipo_ticket) {
          setSelectedTipoObj((tarifa as any).tipo_ticket);
          setTipo('idx-0');
        }

        if (tarifa.etapa_id !== undefined && tarifa.etapa_id !== null) {
          setEtapa(Number(tarifa.etapa_id));
        } else if ((tarifa as any).etapa) {
          setSelectedEtapaObj((tarifa as any).etapa);
          setEtapa('idx-0');
        }
      } catch (err) {
        console.warn('No se pudo cargar tarifa para edición:', err);
      }
    };
    loadTarifa();
    return () => { mounted = false; };
  }, [id, tariffIdParam]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <BackButton to={`/organizerEvent/${id}`} />
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-yellow-50 rounded-md"><Ticket className="w-6 h-6 text-yellow-600" /></div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{tariffIdParam ? 'Editar Tarifa' : 'Clasificación'}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {tariffIdParam 
                ? 'Actualiza los detalles de esta tarifa' 
                : 'Define el tipo, zona y etapa de venta para esta tarifa'}
            </p>
          </div>
        </div>

        {tariffIdParam && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
            ⚠️ La edición de tarifas no está disponible actualmente. Esta vista solo permite crear nuevas tarifas.
          </div>
        )}

        <hr className="my-4" />

        {/* Tipo de Entrada */}
        <div>
          <label className="text-sm font-medium">Tipo de Entrada</label>
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1">
              <select
                value={tipo !== null ? String(tipo) : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  // debug immediate selection
                  // eslint-disable-next-line no-console
                  console.debug('tipo select change raw value:', v);
                  if (v.startsWith('idx-')) {
                    const idx = parseInt(v.slice(4), 10);
                    const obj = tiposList ? tiposList[idx] : null;
                    setSelectedTipoObj(obj || null);
                    // store the option value so the select shows the chosen option
                    setTipo(v);
                    // eslint-disable-next-line no-console
                    console.debug('tipo selected fallback object:', obj);
                  } else {
                    setSelectedTipoObj(null);
                    setTipo(v ? Number(v) : null);
                    // eslint-disable-next-line no-console
                    console.debug('tipo selected id:', v ? Number(v) : null);
                  }
                }}
                className="w-full border rounded-lg py-3 px-4 pr-10 text-sm appearance-none"
                aria-label="Seleccionar tipo de entrada"
              >
              <option value="">Seleccionar tipo...</option>
              {tiposLoading && <option value="">Cargando tipos...</option>}
              {tiposError && <option value="" disabled>{tiposError}</option>}
              {!tiposLoading && !tiposError && tiposList && tiposList.length === 0 && (
                <option value="">No hay tipos definidos</option>
              )}
              {!tiposLoading && !tiposError && tiposList && tiposList.map((tp, i) => {
                const hasId = tp && (tp.id !== undefined && tp.id !== null);
                const optVal = hasId ? String(tp.id) : `idx-${i}`;
                return <option key={i} value={optVal}>{tp.nombre}</option>;
              })}
              </select>
              <ChevronDown className="w-5 h-5 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button type="button" onClick={() => setIsTipoModalOpen(true)}
              className="w-9 h-9 bg-yellow-400 rounded-md flex items-center justify-center text-black text-lg font-bold shadow-sm"
              aria-label="Crear tipo">
              +
            </button>
          </div>
        </div>

        {/* Zona o Sector */}
        <div>
          <label className="text-sm font-medium">Zona o Sector</label>
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1">
              <select
                value={zona !== null ? String(zona) : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  // debug immediate selection
                  // eslint-disable-next-line no-console
                  console.debug('zona select change raw value:', v);
                  if (v.startsWith('idx-')) {
                    const idx = parseInt(v.slice(4), 10);
                    const obj = zonasList ? zonasList[idx] : null;
                    setSelectedZonaObj(obj || null);
                    // store the option value so the select shows the chosen option
                    setZona(v);
                    // eslint-disable-next-line no-console
                    console.debug('zona selected fallback object:', obj);
                  } else {
                    setSelectedZonaObj(null);
                    setZona(v ? Number(v) : null);
                    // eslint-disable-next-line no-console
                    console.debug('zona selected id:', v ? Number(v) : null);
                  }
                }}
                className="w-full border rounded-lg py-3 px-4 pr-10 text-sm appearance-none"
                aria-label="Seleccionar zona o sector"
              >
              <option value="">Seleccionar zona...</option>
              {zonasLoading && <option value="">Cargando zonas...</option>}
              {zonasError && <option value="" disabled>{zonasError}</option>}
              {!zonasLoading && !zonasError && zonasList && zonasList.length === 0 && (
                <option value="">No hay zonas definidas</option>
              )}
              {!zonasLoading && !zonasError && zonasList && zonasList.map((z, i) => {
                const hasId = z && (z.id !== undefined && z.id !== null);
                const optVal = hasId ? String(z.id) : `idx-${i}`;
                return <option key={i} value={optVal}>{z.nombre || z.descripcion || `Zona ${i}`}</option>;
              })}
              </select>
              <ChevronDown className="w-5 h-5 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button type="button" onClick={() => setIsZonaModalOpen(true)}
              className="w-9 h-9 bg-yellow-400 rounded-md flex items-center justify-center text-black text-lg font-bold shadow-sm"
              aria-label="Crear zona">
              +
            </button>
          </div>
        </div>

        {/* Modal para crear nueva zona (componente reutilizable) */}
        <ZoneModal
          open={isZonaModalOpen}
          onClose={() => setIsZonaModalOpen(false)}
          eventoId={id}
          onCreated={(created) => {
            if (created && created.id) setZona(created.id);
            // optimísticamente añadir al inicio de la lista para evitar recarga visible
            setZonasList((prev) => (created ? [created, ...(prev || [])] : prev));
          }}
        />

        {/* Etapa de Venta */}
        <div>
          <label className="text-sm font-medium">Etapa de Venta</label>
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1">
              <select
                value={etapa !== null ? String(etapa) : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  // eslint-disable-next-line no-console
                  console.debug('etapa select change raw value:', v);
                  if (v.startsWith('idx-')) {
                    const idx = parseInt(v.slice(4), 10);
                    const obj = etapasList ? etapasList[idx] : null;
                    setSelectedEtapaObj(obj || null);
                    setEtapa(v);
                    // eslint-disable-next-line no-console
                    console.debug('etapa selected fallback object:', obj);
                  } else {
                    setSelectedEtapaObj(null);
                    setEtapa(v ? Number(v) : null);
                    // eslint-disable-next-line no-console
                    console.debug('etapa selected id:', v ? Number(v) : null);
                  }
                }}
                className="w-full border rounded-lg py-3 px-4 pr-10 text-sm appearance-none"
                aria-label="Seleccionar etapa de venta"
              >
              <option value="">Seleccionar etapa...</option>
              {etapasLoading && <option value="">Cargando etapas...</option>}
              {etapasError && <option value="" disabled>{etapasError}</option>}
              {!etapasLoading && !etapasError && etapasList && etapasList.length === 0 && (
                <option value="">No hay etapas definidas</option>
              )}
              {!etapasLoading && !etapasError && etapasList && etapasList.map((et, i) => {
                const hasId = et && (et.id !== undefined && et.id !== null);
                const optVal = hasId ? String(et.id) : `idx-${i}`;
                return <option key={i} value={optVal}>{et.nombre}</option>;
              })}
              </select>
              <ChevronDown className="w-5 h-5 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button type="button" onClick={() => setIsEtapaModalOpen(true)}
              className="w-9 h-9 bg-yellow-400 rounded-md flex items-center justify-center text-black text-lg font-bold shadow-sm"
              aria-label="Crear etapa">
              +
            </button>
          </div>
        </div>

        {/* Modal para crear nuevo tipo de entrada */}
        <Modal
          open={isTipoModalOpen}
          onClose={() => { setIsTipoModalOpen(false); setNuevoTipoNombre(""); setNuevoTipoDescripcion(""); setTipoCreateError(null); }}
          title={"Crear tipo de entrada"}
          footer={(
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setIsTipoModalOpen(false); setNuevoTipoNombre(""); setNuevoTipoDescripcion(""); setTipoCreateError(null); }}>Cancelar</Button>
              <Button onClick={() => handleCreateTipo()} disabled={creatingTipo}>{creatingTipo ? 'Creando...' : 'Crear'}</Button>
            </div>
          )}
        >
          <form onSubmit={(e) => { e.preventDefault(); handleCreateTipo(); }} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nombre del tipo</label>
              <input value={nuevoTipoNombre} onChange={(e) => setNuevoTipoNombre(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="Ej. General, VIP" />
            </div>
            <div>
              <label className="text-sm font-medium">Descripción (opcional)</label>
              <textarea value={nuevoTipoDescripcion} onChange={(e) => setNuevoTipoDescripcion(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="Breve descripción del tipo (ej. acceso al área VIP, beneficios)" rows={3} />
            </div>
            {tipoCreateError && <div className="text-sm text-red-600">{tipoCreateError}</div>}
          </form>
        </Modal>

        {/* Modal para crear nueva etapa (componente reutilizable) */}
        <EtapaModal
          open={isEtapaModalOpen}
          onClose={() => setIsEtapaModalOpen(false)}
          eventoId={id}
          onCreated={(created) => {
            if (created && created.id) setEtapa(created.id);
            setEtapasList((prev) => (created ? [created, ...(prev || [])] : prev));
            setIsEtapaModalOpen(false);
          }}
        />

        {submitError && <div className="text-sm text-red-600">{submitError}</div>}

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Nombre / Precio / Cantidad (mínimos para crear tarifa) */}
          <div>
            <label className="text-sm font-medium">Nombre de la tarifa</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="Ej. Entrada general" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Precio</label>
              <input value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium">Cantidad</label>
              <input value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="0" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-3">
            <Button type="submit" className="bg-black text-white" disabled={submitting}>
              {submitting ? 'Guardando...' : (tariffIdParam ? 'Actualizar' : 'Siguiente')}
            </Button>
            <Button variant="outline" onClick={() => (id ? navigate(`/organizerEvent/${id}`) : navigate(`/organizerEvent`))}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  );

  async function handleCreateTipo(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setTipoCreateError(null);
    if (!id) { setTipoCreateError("Evento inválido"); return; }
    if (!nuevoTipoNombre || nuevoTipoNombre.trim().length === 0) { setTipoCreateError("Ingresa un nombre para el tipo"); return; }
    try {
      // Verificar token y role antes de intentar crear
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role') || (JSON.parse(localStorage.getItem('user') || '{}')?.role);
      if (!token) { setTipoCreateError('Debes iniciar sesión para crear un tipo'); return; }
      if (role !== 'ORGANIZADOR') { setTipoCreateError('Solo usuarios con rol ORGANIZADOR pueden crear tipos'); return; }

      // Verificar que el evento pertenezca al organizador logueado para evitar 403 del servidor
      try {
        const evento = await getEventById(Number(id));
        const eventoOrganizadorId = (evento as any).organizador_id ?? (evento as any).organizadorId ?? null;
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const myOrganizadorId = storedUser?.organizador_id ?? localStorage.getItem('organizador_id') ?? null;

        if (eventoOrganizadorId != null && myOrganizadorId != null && String(eventoOrganizadorId) !== String(myOrganizadorId)) {
          setTipoCreateError(`No eres el organizador de este evento (organizador evento: ${eventoOrganizadorId}, tu organizador_id: ${myOrganizadorId})`);
          return;
        }
      } catch (errCheck: any) {
        // Si falla el GET por cualquier razón, no bloquear el intento pero informar en consola
        console.warn('No se pudo verificar organizador del evento antes de crear tipo:', errCheck);
      }

      setCreatingTipo(true);
      // El API espera solo { nombre, descripcion, estado }
  await createTipoTicket(Number(id), { nombre: nuevoTipoNombre.trim(), descripcion: nuevoTipoDescripcion.trim(), estado: 'activo', incremento: 0 });
      // recargar tipos
      try {
        const res = await getTiposByEvento(Number(id));
        setTiposList(res || []);
      } catch (err) {
        // no bloquear si la recarga falla
        console.error('No se pudieron recargar los tipos tras creación', err);
      }
      // cerrar modal y limpiar
      setIsTipoModalOpen(false);
      setNuevoTipoNombre("");
      setNuevoTipoDescripcion("");
    } catch (err: any) {
      setTipoCreateError(err?.response?.data?.detail || err?.message || "Error al crear tipo");
    } finally {
      setCreatingTipo(false);
    }
  }

  async function handleCreateZona(e?: React.FormEvent) {
    // handler removed: use ZoneModal component instead
  }

  
}
