import { useState, useEffect } from "react"; // Importar useEffect
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { register } from "../services/AuthService";
import { isValidEmail, isValidEmailCorporate, isValidPassword, isValidRUC } from "../utils/validation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Toast } from "flowbite-react";
import { HiCheck, HiExclamation } from "react-icons/hi";

export default function RegisterForm() {
  const navigate = useNavigate();
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rol, setRol] = useState("cliente");
  const [ruc, setRuc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [dni, setDni] = useState("");
  const [direccion, setDireccion] = useState("");
  const [correoOrganizacional, setCorreoOrganizacional] = useState("");
  const [motivacion, setMotivacion] = useState("");
  const [sector, setSector] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    // Si el toast está visible...
    if (toast) {
      // ...crea un temporizador para ocultarlo después de 3 segundos
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000); // 3000ms = 3 segundos

      // Limpia el temporizador si el componente se desmonta o el toast cambia
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setToast({ message: "Las contraseñas no coinciden", type: "error" });
      return;
    }

    if (!isValidPassword(password)) {
      setToast({ message: "La contraseña debe tener al menos 8 caracteres", type: "error" });
      return;
    }

    // Validaciones específicas según el rol
    if (rol === "organizador") {
      if (!isValidEmailCorporate(correoOrganizacional)) {
        setToast({ message: "El correo organizacional no es válido", type: "error" });
        return;
      }

      if (!isValidRUC(Number(ruc))) {
        setToast({ message: "El RUC no es válido", type: "error" });
        return;
      }

      if (!ruc || !razonSocial || !dni || !direccion || !motivacion || !sector) {
        setToast({ message: "Todos los campos de organizador son obligatorios", type: "error" });
        return;
      }
    }

    const data: any = {
      nombres,
      apellidos,
      telefono,
      password,
      rol: rol.toUpperCase(),
    };

    //console.log("🔵 RegisterForm - Preparando datos:", { ...data, password: "***" });

    if (rol === "organizador") {
      data.correo = correo;
      data.correo_organizacional = correoOrganizacional;
      data.ruc = ruc;
      data.razon_social = razonSocial;
      data.dni = dni;
      data.direccion = direccion;
      data.motivacion = motivacion;
      data.sector = sector;
    } else {
      data.correo = correo;
    }

    try {
      //console.log("🔵 RegisterForm - Enviando registro...");
      const res = await register(data);
      //console.log("✅ RegisterForm - Registro exitoso:", res);

      // Toast de éxito
      setToast({ message: "Registro exitoso. Serás redirigido.", type: "success" });

      // Esperamos un momento antes de redirigir para que el usuario vea el toast
      setTimeout(() => {
        navigate("/login");
      }, 2000); // 2 segundos

    } catch (err: any) {
      // Extraer el mensaje de error del backend
      let message = "Error en el registro";
      
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        
        // Si detail es un array (error 422 de FastAPI/Pydantic)
        if (Array.isArray(detail) && detail.length > 0) {
          message = detail[0].msg || detail[0].message || "Error de validación";
        } 
        // Si detail es un string (error 400 personalizado)
        else if (typeof detail === "string") {
          // Aplicar mensajes personalizados para casos específicos
          if (detail.includes("ruc") || detail.includes("RUC") || detail.includes("organizadores_ruc_key")) {
            message = "El RUC ya se encuentra registrado";
          } else if (detail.includes("correo") && detail.includes("registrado")) {
            message = "El correo ya se encuentra registrado";
          } else {
            // Usar el mensaje específico del backend
            message = detail;
          }
        }
      }

      setToast({ message, type: "error" });
    }
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto p-4">
      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <Toast>
            {toast.type === "success" ? (
              <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-500">
                <HiCheck className="h-5 w-5" />
              </div>
            ) : (
              <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500">
                <HiExclamation className="h-5 w-5" />
              </div>
            )}

            <div className="ml-3 text-sm font-normal">{toast.message}</div>

            {/* Botón para cerrar manualmente el toast */}
            <button
              type="button"
              className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8"
              onClick={() => setToast(null)}
              aria-label="Close"
            >
              <span className="sr-only">Close</span>
              ✕
            </button>
          </Toast>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mx-auto">
        <div>
          <Label htmlFor="rol" className="mb-2">Registrarme como</Label>
          <RadioGroup value={rol} onValueChange={setRol} className="flex gap-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cliente" id="cliente" />
              <Label htmlFor="cliente">Cliente</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="organizador" id="organizador" />
              <Label htmlFor="organizador">Organizador</Label>
            </div>
          </RadioGroup>
        </div>

        <div>
          <Label htmlFor="nombres" className="mb-2">Nombres</Label>
          <Input
            id="nombres"
            type="text"
            placeholder="Juan"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="apellidos" className="mb-2">Apellidos</Label>
          <Input
            id="apellidos"
            type="text"
            placeholder="Pérez"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="telefono" className="mb-2">Número Telefónico</Label>
          <Input
            id="telefono"
            type="tel"
            placeholder="+51 999999999"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="correo" className="mb-2">
            {rol === "organizador" ? "Correo Personal" : "Correo Electrónico"}
          </Label>
          <Input
            id="correo"
            type="email"
            placeholder="name@example.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
          />
          {/* Si el correo es inválido, mostrar un mensaje de error */}
          {correo && !isValidEmail(correo) && (
            <p className="text-red-500 text-sm mt-1">Correo electrónico no válido</p>
          )}
        </div>

        {/* Campos extra si es organizador */}
        {rol === "organizador" && (
          <>
            <div>
              <Label htmlFor="correo_organizacional" className="mb-2">
                Correo Organizacional
              </Label>
              <Input
                id="correo_organizacional"
                type="email"
                placeholder="name@organizacion.com"
                value={correoOrganizacional}
                onChange={(e) => setCorreoOrganizacional(e.target.value)}
                required
              />
              {correoOrganizacional && !isValidEmail(correoOrganizacional) && (
                <p className="text-red-500 text-sm mt-1">Correo organizacional no válido</p>
              )}
            </div>

            <div>
              <Label htmlFor="ruc" className="mb-2">RUC</Label>
              <Input
                id="ruc"
                type="text"
                placeholder="20123456789"
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="razon_social" className="mb-2">Razón Social</Label>
              <Input
                id="razon_social"
                type="text"
                placeholder="Eventos SAC"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="dni" className="mb-2">DNI</Label>
              <Input
                id="dni"
                type="text"
                placeholder="12345678"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="direccion" className="mb-2">Dirección</Label>
              <Input
                id="direccion"
                type="text"
                placeholder="Av. Siempre Viva 123"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="sector" className="mb-2">Sector</Label>
              <Input
                id="sector"
                type="text"
                placeholder="Ej: Tecnología, Educación, Entretenimiento"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="motivacion" className="mb-2">Motivación</Label>
              <Input
                id="motivacion"
                type="text"
                placeholder="Quiero organizar eventos porque..."
                value={motivacion}
                onChange={(e) => setMotivacion(e.target.value)}
                required
              />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="password" className="mb-2">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="mb-2">Confirmar Contraseña</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="********"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full">
          Registrar
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => navigate(-1)}
        >
          Cancelar
        </Button>
      </form>
    </div>
  );
}