import { useLocation, useNavigate } from "react-router-dom";
import { aplicarDescuento, createCompra, simularPago } from "../services/PurcharseService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import type { User } from "../types/user";
import { ArrowLeft } from "lucide-react";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function PurchaseSummaryPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { error: showError, warning } = useNotificationContext();

  const {
    tipo,  // "asientos" o "tickets"
    items, // tickets sin asiento
    asientos, // cuando se compran asientos
    tarifaId,
    eventoFechaId,
    evento,
    total,
    tarifaPrecio, // 👈 CORRECCIÓN: Desestructurar tarifaPrecio
  } = state || {};

  const [codigoDescuento, setCodigoDescuento] = useState("");
  const [loading, setLoading] = useState(false);
  const [descuentoAplicado, setDescuentoAplicado] = useState<number>(0);
  const [mensajeDescuento, setMensajeDescuento] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState("transferencia");

  // ============================================================
  //   CALCULO DEL TOTAL PARA COMPRAS DE ASIENTOS
  // ============================================================

  // ============================================================
  // CALCULO DEL TOTAL PARA COMPRAS DE ASIENTOS
  // ============================================================

  const totalAsientos = useMemo(() => {
    // Usa la variable desestructurada 'tarifaPrecio'
    if (tipo !== "asientos" || !asientos) return total;
    return asientos.length * (tarifaPrecio || 0); // 👈 CORRECCIÓN: Usar tarifaPrecio directamente
  }, [tipo, asientos, total, tarifaPrecio]); // 👈 Dependencia añadida para consistencia

  const totalFinal = (totalAsientos - descuentoAplicado).toFixed(2);


  // ============================================================
  //   AGRUPACIÓN DE ITEMS (para compra sin asientos)
  // ============================================================

  const groupedItems = useMemo(() => {
    if (!items) return [];

    const map = new Map();
    for (const item of items) {
      const key = `${item.tarifa_id}-${item.zona_id}`;
      if (!map.has(key)) {
        map.set(key, {
          tarifa_nombre: item.tarifa_nombre,
          zona_nombre: item.zona_nombre,
          precio_unitario: item.precio_pagado,
          cantidad: 0,
        });
      }
      map.get(key).cantidad += 1;
    }
    return Array.from(map.values());
  }, [items]);


  // ============================================================
  //   APLICAR DESCUENTO
  // ============================================================

  const handleAplicarDescuento = async () => {
    try {
      if (!codigoDescuento.trim()) {
        setMensajeDescuento("Ingresa un código válido");
        return;
      }

      const cantidadTotal = tipo === "asientos" ? asientos.length : items.length;

      const response = await aplicarDescuento(
        evento.id,
        totalAsientos,
        codigoDescuento,
        cantidadTotal
      );

      const descuento = totalAsientos - Number(response.nuevo_precio);

      setDescuentoAplicado(descuento);
      setMensajeDescuento("✔ Descuento aplicado correctamente");
    } catch (err) {
      console.error(err);
      setMensajeDescuento("❌ Código inválido o expirado");
      setDescuentoAplicado(0);
    }
  };


  // ============================================================
  //   CONFIRMAR COMPRA
  // ============================================================

  const handleConfirmarCompra = async () => {
    try {
      setLoading(true);

      const usuario: User = JSON.parse(localStorage.getItem("user") || "{}");

      if (!usuario.id) {
        warning("Inicia sesión para continuar.");
        return navigate("/login");
      }

      // Payload base
      const compraPayload: any = {
        usuario_id: usuario.id,
        metodo_pago: metodoPago,
        codigo_descuento: codigoDescuento || "",
        tickets: [],
      };

      // Compra con asientos
      if (tipo === "asientos") {
        compraPayload.tickets = asientos.map((a: any) => ({
          evento_fecha_id: eventoFechaId,
          tarifa_id: tarifaId,
          asiento_fecha_id: a.id,
        }));
      }

      // Compra normal
      else {
        compraPayload.tickets = items.map((i: any) => ({
          evento_fecha_id: i.evento_fecha_id,
          tarifa_id: i.tarifa_id,
          asiento_fecha_id: 0,
        }));
      }

      const compra = await createCompra(compraPayload);

      await simularPago(
        compra.id,
        metodoPago,
        Number(totalFinal),
        true
      );

      navigate(`/compra-exitosa/${compra.id}`);
    } catch (err: any) {
      console.error("❌ Error compra:", err);
      showError(err?.message || "Error al procesar la compra");
    } finally {
      setLoading(false);
    }
  };


  if (!evento) {
    return <div className="p-6 text-center">No se encontró información del evento.</div>;
  }

  // ============================================================
  //   RENDER
  // ============================================================

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Volver */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-sm text-gray-600 mb-4 hover:text-black"
      >
        <ArrowLeft size={18} className="mr-1" /> Volver
      </button>

      <Card className="shadow-md">
        <CardContent className="p-6 space-y-8">
          <h2 className="text-3xl font-bold">Resumen de compra</h2>

          {/* Info evento */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold text-lg">{evento.nombre}</p>
                <p className="text-gray-600 text-sm">{evento.lugar}</p>
                <p className="text-gray-500 text-sm">
                  {new Date(evento.fecha_inicio).toLocaleDateString()} •{" "}
                  {new Date(evento.fecha_inicio).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <p className="font-semibold text-black">S/ {totalAsientos.toFixed(2)}</p>
            </div>

            {/* Items para tickets normales */}
            {tipo !== "asientos" && (
              <div className="mt-3 space-y-1">
                {groupedItems.map((i, idx) => (
                  <p key={idx} className="text-sm">
                    {i.tarifa_nombre} ({i.zona_nombre}) — Cant: {i.cantidad}
                  </p>
                ))}
              </div>
            )}

            {/* Lista de asientos seleccionados */}
            {tipo === "asientos" && (
              <div className="mt-4">
                <p className="font-semibold text-sm mb-2">Asientos seleccionados:</p>
                <div className="flex flex-wrap gap-2">
                  {asientos.map((s: any) => (
                    <span key={s.id} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm">
                      Fila {s.fila} — #{s.numero}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Código descuento */}
          <div>
            <Label className="font-semibold">Código de descuento</Label>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Ingresa tu código"
                value={codigoDescuento}
                onChange={(e) => setCodigoDescuento(e.target.value)}
              />
              <Button className="bg-black text-white" onClick={handleAplicarDescuento}>
                Aplicar
              </Button>
            </div>

            {mensajeDescuento && (
              <p className="text-sm mt-1 text-gray-600">{mensajeDescuento}</p>
            )}
          </div>

          {/* Método de pago */}
          <div>
            <Label className="font-semibold block mb-2">Método de Pago</Label>
            <div className="space-y-2">
              {["tarjeta", "transferencia", "paypal"].map((met) => (
                <label key={met} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="metodo"
                    value={met}
                    checked={metodoPago === met}
                    onChange={(e) => setMetodoPago(e.target.value)}
                  />
                  <span>{met.charAt(0).toUpperCase() + met.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="border-t pt-4 text-sm">
            <div className="flex justify-between font-semibold">
              <span>Subtotal</span>
              <span>S/ {totalAsientos.toFixed(2)}</span>
            </div>

            {descuentoAplicado > 0 && (
              <div className="flex justify-between text-green-600 font-medium mt-1">
                <span>Descuento</span>
                <span>- S/ {descuentoAplicado.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-lg mt-3">
              <span>Total Final</span>
              <span>S/ {totalFinal}</span>
            </div>
          </div>

          <Button
            onClick={handleConfirmarCompra}
            disabled={loading}
            className="w-full bg-black text-white py-6 text-base hover:bg-gray-800"
          >
            {loading ? "Procesando..." : "Confirmar compra"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
