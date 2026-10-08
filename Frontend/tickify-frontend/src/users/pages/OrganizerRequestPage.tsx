import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textArea";
import { register } from "../services/AuthService";
import { isValidEmailCorporate, isValidPassword } from "../utils/validation";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function OrganizerRequestPage() {
  const { success, error: showError } = useNotificationContext();
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    telefono: "",
    correo: "",
    password: "",
    confirmPassword: "",
    ruc: "",
    razon_social: "",
    dni: "",
    direccion: "",
    correo_organizacional: "",
    motivacion: "",
    sector: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      showError("Las contraseñas no coinciden");
      return;
    }

    if (!isValidPassword(formData.password)) {
      showError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (!formData.correo.includes("@")) {
      showError("Correo electrónico personal no válido");
      return;
    }

    if (!isValidEmailCorporate(formData.correo_organizacional)) {
      showError("Por favor ingresa un correo corporativo válido (no se aceptan correos gratuitos como gmail, outlook, yahoo, etc.)");
      return;
    }

    if (!formData.ruc || !formData.razon_social || !formData.dni || !formData.direccion || !formData.motivacion || !formData.sector) {
      showError("Todos los campos son obligatorios");
      return;
    }

    const data = {
      nombres: formData.nombres,
      apellidos: formData.apellidos,
      telefono: formData.telefono,
      correo: formData.correo,
      password: formData.password,
      rol: "organizador",
      ruc: formData.ruc,
      razon_social: formData.razon_social,
      dni: formData.dni,
      direccion: formData.direccion,
      correo_organizacional: formData.correo_organizacional,
      motivacion: formData.motivacion,
      sector: formData.sector,
    };

    try {
      await register(data);
      success("Solicitud de registro enviada correctamente");
      setFormData({
        nombres: "",
        apellidos: "",
        telefono: "",
        correo: "",
        password: "",
        confirmPassword: "",
        ruc: "",
        razon_social: "",
        dni: "",
        direccion: "",
        correo_organizacional: "",
        motivacion: "",
        sector: "",
      });
    } catch (err: any) {
      let detail = err.response?.data?.detail;
      let message = "Error en el registro";

      if (typeof detail === "string") {
        if (detail.includes("ruc") || detail.includes("RUC") || detail.includes("organizadores_ruc_key")) {
          message = "El RUC ya se encuentra registrado";
        } else if (detail.includes("correo")) {
          message = "El correo ya se encuentra registrado";
        } else {
          message = detail; // mensaje limpio
        }
      }

      showError(message);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfdfb] flex justify-center items-center px-6 py-12">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-lg p-10">
        <h1 className="text-3xl font-semibold text-center mb-2">Solicitud para Organizador</h1>
        <p className="text-center text-gray-500 mb-8">
          Completa este formulario para registrarte como organizador de eventos. Nuestro equipo revisará tu solicitud en 2–3 días hábiles.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información personal */}
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Información Personal</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombres">Nombres *</Label>
                <Input
                  id="nombres"
                  name="nombres"
                  value={formData.nombres}
                  onChange={handleChange}
                  placeholder="Ej: María"
                  required
                />
              </div>
              <div>
                <Label htmlFor="apellidos">Apellidos *</Label>
                <Input
                  id="apellidos"
                  name="apellidos"
                  value={formData.apellidos}
                  onChange={handleChange}
                  placeholder="Ej: Jiménez"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="dni">DNI *</Label>
                <Input
                  id="dni"
                  name="dni"
                  value={formData.dni}
                  onChange={handleChange}
                  placeholder="12345678"
                  required
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono *</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="+51 999 888 777"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="correo">Email Personal *</Label>
              <Input
                id="correo"
                name="correo"
                type="email"
                value={formData.correo}
                onChange={handleChange}
                placeholder="nombre@ejemplo.com"
                required
              />
            </div>

            <div className="mt-4">
              <Label htmlFor="direccion">Dirección *</Label>
              <Input
                id="direccion"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                placeholder="Av. Siempre Viva 123, Lima"
                required
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Seguridad</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">Contraseña *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="********"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres</p>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="********"
                  required
                />
              </div>
            </div>
          </div>

          {/* Información de empresa */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Información de la Empresa/Organización</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="razon_social">Nombre de la Empresa u Organización *</Label>
                <Input
                  id="razon_social"
                  name="razon_social"
                  value={formData.razon_social}
                  onChange={handleChange}
                  placeholder="Ej: Eventos SAC"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ruc">RUC *</Label>
                  <Input
                    id="ruc"
                    name="ruc"
                    value={formData.ruc}
                    onChange={handleChange}
                    placeholder="20123456789"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sector">Sector *</Label>
                  <Input
                    id="sector"
                    name="sector"
                    value={formData.sector}
                    onChange={handleChange}
                    placeholder="Ej: Tecnología, Educación"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="correo_organizacional">Email Corporativo *</Label>
                <Input
                  id="correo_organizacional"
                  name="correo_organizacional"
                  type="email"
                  value={formData.correo_organizacional}
                  onChange={handleChange}
                  placeholder="nombre@empresa.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  No se aceptan correos gratuitos (gmail, outlook, yahoo, etc.)
                </p>
              </div>

              <div>
                <Label htmlFor="motivacion">¿Por qué quieres ser organizador? *</Label>
                <Textarea
                  id="motivacion"
                  name="motivacion"
                  value={formData.motivacion}
                  onChange={handleChange}
                  placeholder="Cuéntanos sobre tu experiencia y motivación para organizar eventos..."
                  rows={4}
                  required
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-8 bg-black text-white hover:bg-gray-800"
          >
            Enviar solicitud
          </Button>
        </form>
      </div>
    </div>
  );
}