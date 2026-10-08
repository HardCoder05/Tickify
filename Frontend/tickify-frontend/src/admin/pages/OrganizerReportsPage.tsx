import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ArrowUpRight, ArrowDownRight, Calendar, Check } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { getReporteOrganizadores } from "@/admin/services/ReporteService";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function OrganizerReportsPage() {
  const { error: showError } = useNotificationContext();
  const [loading, setLoading] = useState(false);
  const [reporteData, setReporteData] = useState<any>(null);
  
  // Estado para el período seleccionado
  const [diasSeleccionados, setDiasSeleccionados] = useState<number>(30);
  const [diasPersonalizados, setDiasPersonalizados] = useState<string>("30");

  useEffect(() => {
    // Cargar KPIs y gráficos al montar el componente
    loadReporteData();
  }, []);

  async function loadReporteData(dias: number = diasSeleccionados) {
    try {
      setLoading(true);
      const data = await getReporteOrganizadores(dias);
      setReporteData(data);
    } catch (err) {
      console.error("Error al cargar reporte de organizadores:", err);
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

  // Preparar KPIs
  const kpis = reporteData ? [
    {
      titulo: "Total Organizadores",
      valor: `${reporteData.organizadores?.actual || 0}`,
      variacion: `${reporteData.organizadores?.variacion >= 0 ? '+' : ''}${reporteData.organizadores?.variacion?.toFixed(1) || 0}%`,
      periodo: `Últimos ${diasSeleccionados} días`,
      positivo: reporteData.organizadores?.variacion >= 0,
    },
    {
      titulo: "Total Eventos Activos",
      valor: `${reporteData.eventos_activos?.actual || 0}`,
      variacion: `${reporteData.eventos_activos?.variacion >= 0 ? '+' : ''}${reporteData.eventos_activos?.variacion?.toFixed(1) || 0}%`,
      periodo: `Anteriores ${diasSeleccionados} días`,
      positivo: reporteData.eventos_activos?.variacion >= 0,
    },
    {
      titulo: "Promedio Visitas por Evento",
      valor: `${reporteData.promedio_visitas_evento?.actual || 0}`,
      variacion: `${reporteData.promedio_visitas_evento?.variacion >= 0 ? '+' : ''}${reporteData.promedio_visitas_evento?.variacion?.toFixed(1) || 0}%`,
      periodo: `Anteriores ${diasSeleccionados} días`,
      positivo: reporteData.promedio_visitas_evento?.variacion >= 0,
    },
  ] : [];

  // Preparar datos para gráficos Top 5
  const topEventosData = reporteData?.top_5_organizadores?.eventos || [];
  const topIngresosData = reporteData?.top_5_organizadores?.ingresos || [];

  return (
    <main className="p-6 space-y-8 font-manrope">
      {/* Título y Filtro de Períodos */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold font-manrope">Reporte de Organizadores</h1>
        
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
              <label className="text-sm font-semibold text-gray-700 mb-2 font-manrope">Seleccionar Período</label>
              
              {/* Opciones predefinidas */}
              {[7, 30, 90].map((dias) => (
                <button
                  key={dias}
                  onClick={() => handleSeleccionarPeriodo(dias)}
                  className="flex justify-between items-center px-3 py-2 rounded-md hover:bg-gray-100 text-sm text-black transition font-manrope"
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
              <label className="text-sm font-medium text-gray-700 font-manrope">Personalizado (días)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={diasPersonalizados}
                  onChange={(e) => setDiasPersonalizados(e.target.value)}
                  placeholder="Ej: 60"
                  className="border border-[#E4E4E7] text-black font-manrope"
                />
                <Button
                  className="bg-[#FFD700] text-black hover:bg-[#e5e5d6] font-manrope"
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
          <p className="text-gray-600 font-manrope">Cargando datos del reporte...</p>
        </div>
      ) : reporteData && kpis.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

          {/* Gráficos de Top 5 Organizadores */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Top 5 Organizadores por Ingresos */}
            {topIngresosData.length > 0 && (
              <Card className="shadow-md border-gray-200 font-manrope">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-gray-700 font-manrope">
                    Top 5 Organizadores por Ingresos
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={topIngresosData}
                      layout="vertical"
                      margin={{ left: 20 }}
                      style={{ fontFamily: '"Manrope Variable", sans-serif' }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        type="number" 
                        tick={{ fontFamily: '"Manrope Variable", sans-serif', fontSize: 12 }}
                        style={{ fontFamily: '"Manrope Variable", sans-serif' }}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="organizador" 
                        width={180}
                        tick={{ fontFamily: '"Manrope Variable", sans-serif', fontSize: 12 }}
                        style={{ fontFamily: '"Manrope Variable", sans-serif' }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`S/ ${value.toLocaleString()}`, "Ingresos"]} 
                        contentStyle={{ fontFamily: '"Manrope Variable", sans-serif', fontSize: '14px' }}
                        labelStyle={{ fontFamily: '"Manrope Variable", sans-serif' }}
                        itemStyle={{ fontFamily: '"Manrope Variable", sans-serif' }}
                      />
                      <Bar 
                        dataKey="ingresos" 
                        fill="#8b5cf6"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Top 5 Organizadores por Eventos Realizados */}
            {topEventosData.length > 0 && (
              <Card className="shadow-md border-gray-200 font-manrope">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-gray-700 font-manrope">
                    Top 5 Organizadores por Eventos Realizados
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={topEventosData}
                      layout="vertical"
                      margin={{ left: 20 }}
                      style={{ fontFamily: '"Manrope Variable", sans-serif' }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        type="number" 
                        tick={{ fontFamily: '"Manrope Variable", sans-serif', fontSize: 12 }}
                        style={{ fontFamily: '"Manrope Variable", sans-serif' }}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="organizador" 
                        width={180}
                        tick={{ fontFamily: '"Manrope Variable", sans-serif', fontSize: 12 }}
                        style={{ fontFamily: '"Manrope Variable", sans-serif' }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value}`, "Eventos"]} 
                        contentStyle={{ fontFamily: '"Manrope Variable", sans-serif', fontSize: '14px' }}
                        labelStyle={{ fontFamily: '"Manrope Variable", sans-serif' }}
                        itemStyle={{ fontFamily: '"Manrope Variable", sans-serif' }}
                      />
                      <Bar 
                        dataKey="eventos_realizados" 
                        fill="#10b981"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 font-manrope">No hay datos disponibles. Selecciona un período.</p>
        </div>
      )}
    </main>
  );
}
