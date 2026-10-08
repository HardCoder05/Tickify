import React, { useState } from "react";
import { Armchair, Save, Plus, Minus, Check } from "lucide-react";
import { useNotificationContext } from "@/contexts/NotificationContext";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

interface Asiento {
  fila: number;
  columna: number;
  estado: string;
  numero: string;
}

export default function SeatCreatorAdmin() {
  const { error: showError, success: showSuccess, warning } = useNotificationContext();
  const [zonaId, setZonaId] = useState(804);
  const [eventoFechaIds, setEventoFechaIds] = useState("30,31,32");
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(10);
  const [seats, setSeats] = useState<Asiento[][]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [layoutCreated, setLayoutCreated] = useState(false);

  const generateSeats = () => {
    const layout: Asiento[][] = [];
    for (let f = 0; f < rows; f++) {
      const fila: Asiento[] = [];
      for (let c = 0; c < cols; c++) {
        fila.push({
          fila: f + 1,
          columna: c + 1,
          estado: "activo",
          numero: `${f + 1}-${c + 1}`
        });
      }
      layout.push(fila);
    }
    setSeats(layout);
    setLayoutCreated(false);
  };

  const toggleSeatAdmin = (f: number, c: number) => {
    const newSeats = seats.map((fila, i) =>
      fila.map((asiento, j) => {
        if (i === f && j === c) {
          if (asiento.estado === "eliminado") {
            return { ...asiento, estado: "activo" };
          }
          return { ...asiento, estado: "eliminado" };
        }
        return asiento;
      })
    );
    setSeats(newSeats);
  };

  const addRow = () => {
    const newRow: Asiento[] = [];
    for (let c = 0; c < cols; c++) {
      newRow.push({
        fila: rows + 1,
        columna: c + 1,
        estado: "activo",
        numero: `${rows + 1}-${c + 1}`
      });
    }
    setSeats([...seats, newRow]);
    setRows(rows + 1);
  };

  const removeRow = () => {
    if (rows <= 1) return;
    setSeats(seats.slice(0, -1));
    setRows(rows - 1);
  };

  const addColumn = () => {
    const newSeats = seats.map((fila, i) => {
      const newSeat = {
        fila: i + 1,
        columna: cols + 1,
        estado: "activo",
        numero: `${i + 1}-${cols + 1}`
      };
      return [...fila, newSeat];
    });
    setSeats(newSeats);
    setCols(cols + 1);
  };

  const removeColumn = () => {
    if (cols <= 1) return;
    const newSeats = seats.map(fila => fila.slice(0, -1));
    setSeats(newSeats);
    setCols(cols - 1);
  };

  const saveLayout = async () => {
    if (seats.length === 0) {
      warning('Por favor genera el layout primero');
      return;
    }

    setIsSaving(true);

    try {
      // 1. Crear layout base
      const asientosDeshabilitados: { fila: number; numero: number }[] = [];
      seats.flat().forEach(asiento => {
        if (asiento.estado === "eliminado") {
          asientosDeshabilitados.push({
            fila: asiento.fila,
            numero: asiento.columna
          });
        }
      });

      const layoutResponse = await fetch(`${API_URL}/api/v1/asientos/layout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          zona_id: zonaId,
          filas: rows,
          columnas: cols,
          asientos_deshabilitados: asientosDeshabilitados
        })
      });

      if (!layoutResponse.ok) {
        let errorText = `Error ${layoutResponse.status}: ${layoutResponse.statusText}.`;
        
        try {
          // Intentar leer el JSON. Si falla (por cuerpo vacío), simplemente usamos el status/text
          const contentType = layoutResponse.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            const errorJson = await layoutResponse.json();
            errorText = errorJson.detail || errorJson.message || 'Error desconocido del servidor.';
          }
        } catch (e) {
          // Si falla el JSON.parse, simplemente usamos el errorText básico.
          console.warn("Fallo al parsear JSON de error, usando status text.");
        }
        throw new Error(errorText);
      }

      setLayoutCreated(true);
      showSuccess('Layout base creado exitosamente');

    } catch (error) {
      console.error('Error:', error);
      showError(`${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const replicarAFechas = async () => {
    if (!layoutCreated) {
      warning('Primero debes crear el layout base');
      return;
    }

    setIsSaving(true);

    try {
      const fechaIds = eventoFechaIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      
      if (fechaIds.length === 0) {
        throw new Error('Ingresa al menos un ID de fecha válido');
      }

      const response = await fetch(`${API_URL}/api/v1/asientos/replicar?zona_id=${zonaId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          evento_fecha_ids: fechaIds
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al replicar el layout');
      }

      showSuccess('Layout replicado exitosamente a las fechas seleccionadas');

    } catch (error) {
      console.error('Error:', error);
      showError(`${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getStats = () => {
    if (seats.length === 0) return { activos: 0, eliminados: 0 };
    
    const flat = seats.flat();
    return {
      activos: flat.filter(s => s.estado === "activo").length,
      eliminados: flat.filter(s => s.estado === "eliminado").length
    };
  };

  const stats = getStats();

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)',
      padding: '32px'
    },
    card: {
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      padding: '24px',
      marginBottom: '24px'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 24px',
      borderRadius: '8px',
      border: 'none',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '14px'
    },
    input: {
      padding: '8px 12px',
      border: '2px solid #cbd5e1',
      borderRadius: '8px',
      fontSize: '14px',
      width: '100%'
    },
    stage: {
      background: 'linear-gradient(to bottom, #1e293b, #334155)',
      color: 'white',
      padding: '16px',
      borderRadius: '12px',
      textAlign: 'center' as const,
      fontWeight: '600',
      fontSize: '18px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)'
    },
    seat: {
      width: '56px',
      height: '56px',
      margin: '4px',
      borderRadius: '16px 16px 0 0',
      cursor: 'pointer',
      transition: 'all 0.2s',
      position: 'relative' as const,
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Header */}
        <div style={styles.card}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            <Armchair color="#2563eb" size={32} />
            Panel de Administración - Crear Layout
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', marginBottom: 0 }}>Configura el layout de asientos para tu zona</p>
        </div>

        {/* Configuration */}
        <div style={styles.card}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Configuración Inicial</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>ID de Zona</label>
              <input
                type="number"
                value={zonaId}
                onChange={(e) => setZonaId(parseInt(e.target.value))}
                style={styles.input}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>IDs de Fechas (separados por comas)</label>
              <input
                type="text"
                value={eventoFechaIds}
                onChange={(e) => setEventoFechaIds(e.target.value)}
                placeholder="1,2,3,4"
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Filas</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={removeRow} style={{ ...styles.button, background: '#ef4444', color: 'white', flex: 0 }}>
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                  style={{ ...styles.input, textAlign: 'center', fontWeight: '600' }}
                />
                <button onClick={addRow} style={{ ...styles.button, background: '#22c55e', color: 'white', flex: 0 }}>
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Columnas</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={removeColumn} style={{ ...styles.button, background: '#ef4444', color: 'white', flex: 0 }}>
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  value={cols}
                  onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                  style={{ ...styles.input, textAlign: 'center', fontWeight: '600' }}
                />
                <button onClick={addColumn} style={{ ...styles.button, background: '#22c55e', color: 'white', flex: 0 }}>
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={generateSeats}
                style={{ ...styles.button, background: '#3b82f6', color: 'white', width: '100%', justifyContent: 'center' }}
              >
                Generar Vista Previa
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {seats.length > 0 && (
          <div style={styles.card}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '30px', fontWeight: 'bold', color: '#15803d' }}>{stats.activos}</div>
                <div style={{ fontSize: '14px', color: '#16a34a', fontWeight: '500' }}>Asientos Activos</div>
              </div>
              <div style={{ background: '#f8fafc', border: '2px solid #cbd5e1', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '30px', fontWeight: 'bold', color: '#334155' }}>{stats.eliminados}</div>
                <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Deshabilitados</div>
              </div>
            </div>
          </div>
        )}

        {/* Seat Grid */}
        {seats.length > 0 && (
          <div style={styles.card}>
            <div style={{ marginBottom: '24px' }}>
              <div style={styles.stage}>🎭 ESCENARIO</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '16px' }}>
              <div>
                {seats.map((fila, fIndex) => (
                  <div key={fIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ width: '48px', flexShrink: 0, textAlign: 'center', fontWeight: 'bold', color: '#64748b', fontSize: '14px' }}>
                      {fIndex + 1}
                    </div>
                    {fila.map((asiento, cIndex) => {
                      const isActivo = asiento.estado === "activo";
                      return (
                        <div
                          key={cIndex}
                          onClick={() => toggleSeatAdmin(fIndex, cIndex)}
                          style={{
                            ...styles.seat,
                            background: isActivo
                              ? 'linear-gradient(to bottom, #4ade80, #22c55e)'
                              : 'linear-gradient(to bottom, #cbd5e1, #94a3b8)',
                            opacity: isActivo ? 1 : 0.5
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          title={`Fila ${asiento.fila} - Columna ${asiento.columna}`}
                        >
                          <div style={{ position: 'absolute', inset: '8px 8px auto', height: '32px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '12px 12px 0 0' }}></div>
                          <div style={{ position: 'absolute', inset: 'auto 4px 8px', height: '24px', background: 'rgba(0, 0, 0, 0.1)', borderRadius: '8px' }}></div>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                            {cIndex + 1}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>
                <b>Clic</b> en un asiento para habilitar/deshabilitar
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        {seats.length > 0 && (
          <div style={styles.card}>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={saveLayout}
                disabled={isSaving}
                style={{
                  ...styles.button,
                  background: layoutCreated ? '#10b981' : '#2563eb',
                  color: 'white',
                  opacity: isSaving ? 0.5 : 1
                }}
              >
                {layoutCreated ? <Check size={20} /> : <Save size={20} />}
                {isSaving ? 'Guardando...' : layoutCreated ? 'Layout Creado' : 'Crear Layout Base'}
              </button>
              
              {layoutCreated && (
                <button
                  onClick={replicarAFechas}
                  disabled={isSaving}
                  style={{
                    ...styles.button,
                    background: '#8b5cf6',
                    color: 'white',
                    opacity: isSaving ? 0.5 : 1
                  }}
                >
                  <Check size={20} />
                  Replicar a Fechas
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}