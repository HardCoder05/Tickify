import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ArrowUpRight, ArrowDownRight, Calendar, Check } from "lucide-react";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { getReporteGeneral, getReporteIngresosGeneral } from "@/admin/services/ReporteService";
import { useNotificationContext } from "@/contexts/NotificationContext";

// Estilos para animaciones secuenciales de barras (carga tipo barra de vida)
const barAnimationStyles = `
  @keyframes barFill {
    from {
      clip-path: inset(100% 0 0 0);
    }
    to {
      clip-path: inset(0 0 0 0);
    }
  }
  
  .recharts-bar-rectangle {
    animation: barFill 0.6s ease-out forwards;
    clip-path: inset(100% 0 0 0);
  }
  
  .recharts-bar-rectangle:nth-child(1) { animation-delay: 0s; }
  .recharts-bar-rectangle:nth-child(2) { animation-delay: 0.15s; }
  .recharts-bar-rectangle:nth-child(3) { animation-delay: 0.3s; }
  .recharts-bar-rectangle:nth-child(4) { animation-delay: 0.45s; }
  .recharts-bar-rectangle:nth-child(5) { animation-delay: 0.6s; }
  .recharts-bar-rectangle:nth-child(6) { animation-delay: 0.75s; }
  
  text { font-family: 'Manrope', sans-serif !important; }
`;

// Componente personalizado para barras con animación secuencial
const CustomBar = (props: any) => {
  const { x, y, width, height } = props;
  
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="#E8C468"
      rx="6"
      ry="6"
      className="recharts-bar-rectangle"
    />
  );
};

const nombresMeses: { [key: number]: string } = {
  1: "Ene",
  2: "Feb",
  3: "Mar",
  4: "Abr",
  5: "May",
  6: "Jun",
  7: "Jul",
  8: "Ago",
  9: "Sep",
  10: "Oct",
  11: "Nov",
  12: "Dic",
};

export default function ReportsPage() {
  const { error: showError } = useNotificationContext();
  const [loading, setLoading] = useState(false);
  const [reporteData, setReporteData] = useState<any>(null);
  
  // Estado para el período seleccionado
  const [diasSeleccionados, setDiasSeleccionados] = useState<number>(30);
  const [diasPersonalizados, setDiasPersonalizados] = useState<string>("30");
  
  // Estado para reporte de ingresos general
  const [loadingIngresos, setLoadingIngresos] = useState(false);
  const [reporteIngresos, setReporteIngresos] = useState<any>(null);
  const hoy = new Date();
  const hace30Dias = new Date();
  hace30Dias.setDate(hoy.getDate() - 30);
  const formato = "yyyy-MM-dd";
  const [fechaInicioIngresos, setFechaInicioIngresos] = useState(format(hace30Dias, formato));
  const [fechaFinIngresos, setFechaFinIngresos] = useState(format(hoy, formato));

  useEffect(() => {
    loadReporteData();
  }, []);

  async function loadReporteData(dias: number = diasSeleccionados) {
    try {
      setLoading(true);
      const data = await getReporteGeneral(dias);
      setReporteData(data);
    } catch (err) {
      console.error("Error al cargar reporte:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSeleccionarPeriodo = (dias: number) => {
    setDiasSeleccionados(dias);
    loadReporteData(dias);
  };

  const handleAplicarPersonalizado = () => {
    const dias = parseInt(diasPersonalizados);
    
    if (isNaN(dias)) {
      showError("Por favor ingresa un número válido");
      return;
    }
    
    if (dias <= 0) {
      showError("El número de días debe ser mayor a 0");
      return;
    }
    
    if (dias > 365) {
      showError("El período no puede ser mayor a 365 días");
      return;
    }
    
    setDiasSeleccionados(dias);
    loadReporteData(dias);
  };

  async function loadReporteIngresos() {
    try {
      setLoadingIngresos(true);
      const data = await getReporteIngresosGeneral(fechaInicioIngresos, fechaFinIngresos);
      setReporteIngresos(data);
    } catch (err) {
      console.error("Error al cargar reporte de ingresos:", err);
    } finally {
      setLoadingIngresos(false);
    }
  }

  const handleAplicarFiltroIngresos = async () => {
    await loadReporteIngresos();
  };

  // Preparar datos para los gráficos
  const ingresosMensuales = reporteData?.graficos?.eventos_mensuales?.map((item: any) => ({
    mes: nombresMeses[item.mes] || `Mes ${item.mes}`,
    eventos: item.total,
  })) || [];

  const nuevosOrganizadores = reporteData?.graficos?.organizadores_mensuales?.map((item: any) => ({
    mes: nombresMeses[item.mes] || `Mes ${item.mes}`,
    cantidad: item.total,
  })) || [];

  // Preparar KPIs
  const kpis = reporteData ? [
    {
      titulo: "Total Ingresos",
      valor: `S/ ${reporteData.ingresos?.actual?.toLocaleString() || 0}`,
      variacion: `${reporteData.ingresos?.variacion >= 0 ? '+' : ''}${reporteData.ingresos?.variacion?.toFixed(1) || 0}%`,
      periodo: `Anteriores ${diasSeleccionados} días`,
      positivo: reporteData.ingresos?.variacion >= 0,
    },
    {
      titulo: "Total Eventos Activos",
      valor: `${reporteData.eventos_activos?.actual || 0}`,
      variacion: `${reporteData.eventos_activos?.variacion >= 0 ? '+' : ''}${reporteData.eventos_activos?.variacion?.toFixed(1) || 0}%`,
      periodo: `Anteriores ${diasSeleccionados} días`,
      positivo: reporteData.eventos_activos?.variacion >= 0,
    },
    {
      titulo: "Total Usuarios",
      valor: `${reporteData.usuarios?.actual || 0}`,
      variacion: `${reporteData.usuarios?.variacion >= 0 ? '+' : ''}${reporteData.usuarios?.variacion?.toFixed(1) || 0}%`,
      periodo: `Últimos ${diasSeleccionados} días`,
      positivo: reporteData.usuarios?.variacion >= 0,
    },
    {
      titulo: "Total Organizadores",
      valor: `${reporteData.organizadores?.actual || 0}`,
      variacion: `${reporteData.organizadores?.variacion >= 0 ? '+' : ''}${reporteData.organizadores?.variacion?.toFixed(1) || 0}%`,
      periodo: `Últimos ${diasSeleccionados} días`,
      positivo: reporteData.organizadores?.variacion >= 0,
    },
  ] : [];

  return (
    <>
      <style>{barAnimationStyles}</style>
      <main className="p-6 space-y-8 font-manrope">
      {/* Título y Filtro de Períodos */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold font-manrope">Reporte General</h1>
        
        {/* Botón de Filtro de Períodos */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="border-[#E4E4E7] text-black flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Período: {diasSeleccionados} días
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-64 bg-white border border-[#E4E4E7] shadow-md p-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700 mb-2">Seleccionar Período</label>
              
              {/* Opciones predefinidas */}
              {[7, 30, 90].map((dias) => (
                <button
                  key={dias}
                  onClick={() => handleSeleccionarPeriodo(dias)}
                  className="flex justify-between items-center px-3 py-2 rounded-md hover:bg-gray-100 text-sm text-black transition"
                >
                  {dias} días
                  {diasSeleccionados === dias && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                </button>
              ))}
              
              {/* Separador */}
              <div className="border-t border-gray-200 my-2"></div>
              
              {/* Período personalizado */}
              <label className="text-sm font-medium text-gray-700">Personalizado (días)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={diasPersonalizados}
                  onChange={(e) => setDiasPersonalizados(e.target.value)}
                  placeholder="Ej: 60"
                  className="border border-[#E4E4E7] text-black"
                />
                <Button
                  className="bg-[#FFD700] text-black hover:bg-[#e5e5d6]"
                  onClick={handleAplicarPersonalizado}
                  disabled={loading}
                >
                  OK
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tarjetas KPI */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Cargando datos del reporte...</p>
        </div>
      ) : reporteData && kpis.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.titulo} className="shadow-md border-gray-200 gap-1 font-manrope">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-black-500 font-manrope">
                  {kpi.titulo}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="text-3xl font-bold text-center font-manrope">{kpi.valor}</p>
                  <div
                    className={`flex items-center gap-1 text-sm font-medium font-manrope ${
                      kpi.positivo ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {kpi.positivo ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    {kpi.variacion}
                  </div>
                  <p className="text-xs text-gray-500 font-manrope">{kpi.periodo}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">No hay datos disponibles. Selecciona un rango de fechas.</p>
        </div>
      )}

      {/* Gráficos */}
      {!loading && reporteData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Eventos Mensuales */}
          <Card className="shadow-md border-gray-200 font-manrope">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-700 font-manrope">
                Eventos por Mes
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {ingresosMensuales.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ingresosMensuales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mes" style={{ fontFamily: 'Manrope' }} />
                    <YAxis style={{ fontFamily: 'Manrope' }} />
                    <Tooltip formatter={(value: number) => [`${value}`, "Eventos"]} contentStyle={{ fontFamily: 'Manrope' }} />
                    <Line
                      type="linear"
                      dataKey="eventos"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      isAnimationActive={true}
                      animationDuration={1200}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No hay datos de eventos para este período</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Nuevos Organizadores */}
          <Card className="shadow-md border-gray-200 font-manrope">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-700 font-manrope">
                Nuevos Organizadores por Mes
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {nuevosOrganizadores.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart key={diasSeleccionados} data={nuevosOrganizadores}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mes" style={{ fontFamily: 'Manrope' }} />
                    <YAxis style={{ fontFamily: 'Manrope' }} />
                    <Tooltip contentStyle={{ fontFamily: 'Manrope' }} />
                    <Bar 
                      dataKey="cantidad" 
                      fill="#E8C468" 
                      radius={[6, 6, 0, 0]}
                      isAnimationActive={false}
                      shape={<CustomBar />}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No hay datos de organizadores para este período</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sección de Reporte de Ingresos General */}
      <div className="border-t border-gray-300 pt-8 mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold font-manrope">Análisis de Ingresos Detallado</h2>
          
          {/* Botón de Filtro de Fechas para Ingresos */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="border-[#E4E4E7] text-black flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Rango de Fechas
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-64 bg-white border border-[#E4E4E7] shadow-md p-4">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-gray-700">Fecha inicio</label>
                <Input
                  type="date"
                  value={fechaInicioIngresos}
                  onChange={(e) => setFechaInicioIngresos(e.target.value)}
                  className="border border-[#E4E4E7] text-black"
                />

                <label className="text-sm font-medium text-gray-700 mt-2">Fecha fin</label>
                <Input
                  type="date"
                  value={fechaFinIngresos}
                  onChange={(e) => setFechaFinIngresos(e.target.value)}
                  className="border border-[#E4E4E7] text-black"
                />

                <Button
                  className="bg-[#FFD700] text-black hover:bg-[#e5e5d6] mt-4"
                  onClick={handleAplicarFiltroIngresos}
                  disabled={loadingIngresos}
                >
                  {loadingIngresos ? "Cargando..." : "Aplicar"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Tarjetas Resumen de Ingresos */}
        {loadingIngresos ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Cargando análisis de ingresos...</p>
          </div>
        ) : reporteIngresos?.reporte?.resumen ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Card className="shadow-md border-gray-200 font-manrope">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-black-500 font-manrope">
                    Eventos Realizados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-center font-manrope">
                    {reporteIngresos.reporte.resumen.eventos_realizados || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-md border-gray-200 font-manrope">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-black-500 font-manrope">
                    Tickets Vendidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-center font-manrope">
                    {reporteIngresos.reporte.resumen.tickets_vendidos || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-md border-gray-200 font-manrope">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-black-500 font-manrope">
                    Ticket Promedio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-center font-manrope">
                    S/ {reporteIngresos.reporte.resumen.ticket_promedio?.toFixed(2) || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos de Análisis de Ingresos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Eventos por Ingresos */}
              <Card className="shadow-md border-gray-200 font-manrope">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-gray-700 font-manrope">
                    Top 5 Eventos por Ingresos
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  {reporteIngresos.reporte.top_eventos_por_ingresos?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={reporteIngresos.reporte.top_eventos_por_ingresos}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" style={{ fontFamily: 'Manrope' }} />
                        <YAxis 
                          type="category" 
                          dataKey="evento" 
                          width={150}
                          style={{ fontFamily: 'Manrope', fontSize: '12px' }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`S/ ${value}`, "Ingresos"]} 
                          contentStyle={{ fontFamily: 'Manrope' }} 
                        />
                        <Bar 
                          dataKey="ingresos" 
                          fill="#10b981"
                          radius={[0, 6, 6, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No hay datos de ingresos por evento</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Eventos por Capacidad */}
              <Card className="shadow-md border-gray-200 font-manrope">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-gray-700 font-manrope">
                    Top 5 Eventos por Capacidad Usada
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  {reporteIngresos.reporte.top_eventos_por_capacidad?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={reporteIngresos.reporte.top_eventos_por_capacidad}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" style={{ fontFamily: 'Manrope' }} />
                        <YAxis 
                          type="category" 
                          dataKey="evento" 
                          width={180}
                          style={{ fontFamily: 'Manrope', fontSize: '12px' }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(2)}%`, "Capacidad Usada"]} 
                          contentStyle={{ fontFamily: 'Manrope' }} 
                        />
                        <Bar 
                          dataKey="capacidad_usada" 
                          fill="#f59e0b"
                          radius={[0, 6, 6, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No hay datos de capacidad por evento</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tendencia Mensual */}
            {reporteIngresos.reporte.tendencia_mensual?.datos?.length > 0 && (
              <Card className="shadow-md border-gray-200 font-manrope mt-6">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-gray-700 font-manrope">
                    Tendencia Mensual de Ingresos
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="80%">
                    <LineChart data={reporteIngresos.reporte.tendencia_mensual.datos}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="mes" style={{ fontFamily: 'Manrope' }} />
                      <YAxis style={{ fontFamily: 'Manrope' }} />
                      <Tooltip 
                        formatter={(value: number) => [`S/ ${value}`, "Ingresos"]} 
                        contentStyle={{ fontFamily: 'Manrope' }} 
                      />
                      <Line
                        type="monotone"
                        dataKey="ingresos"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        isAnimationActive={true}
                        animationDuration={1200}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-600 font-manrope">Tasa de Crecimiento</p>
                      <p className="text-lg font-bold font-manrope">
                        {reporteIngresos.reporte.tendencia_mensual.tasa_crecimiento?.toFixed(1) || 0}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-manrope">Mejor Mes</p>
                      <p className="text-lg font-bold font-manrope">
                        {reporteIngresos.reporte.tendencia_mensual.mejor_mes || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-manrope">Promedio Mensual</p>
                      <p className="text-lg font-bold font-manrope">
                        S/ {reporteIngresos.reporte.tendencia_mensual.promedio_mensual?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No hay datos disponibles. Selecciona un rango de fechas.</p>
          </div>
        )}
      </div>
    </main>
    </>
  );
}