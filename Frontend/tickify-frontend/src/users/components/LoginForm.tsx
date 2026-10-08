import { useState } from "react";
import { login } from "../services/AuthService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginForm() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await login({ username: correo, password });

      if (response.access_token) {
        const token = response.access_token.replace(/^Bearer\s+/i, "");
        localStorage.setItem("token", token);
        
        // ✅ GUARDAR MÉTODO DE AUTENTICACIÓN
        localStorage.setItem("auth_method", "credentials");

        if ((response as any).role) {
          localStorage.setItem("role", (response as any).role);
        }
        if ((response as any).user_id !== undefined && (response as any).user_id !== null) {
          localStorage.setItem("user_id", String((response as any).user_id));
        }
        
        const organizadorIdFromResp = (response as any).organizador_id ?? (response as any).organizadorId ?? (response as any).organizer_id ?? (response as any).organizerId ?? null;
        if (organizadorIdFromResp !== undefined && organizadorIdFromResp !== null) {
          localStorage.setItem("organizador_id", String(organizadorIdFromResp));
        }

        const returnedId = (response as any).user_id ?? (response as any).id ?? (response as any).userId ?? undefined;
        const organizadorId = organizadorIdFromResp ?? undefined;

        const unifiedUser = {
          id: returnedId,
          correo,
          rol: (response as any).role ?? undefined,
          organizador_id: organizadorId,
        } as any;
        
        if (organizadorId !== undefined && organizadorId !== null) {
          localStorage.setItem("organizador_id", String(organizadorId));
        }

        localStorage.setItem("user", JSON.stringify(unifiedUser));
        setUser(unifiedUser);

        setSuccess("Inicio de sesión exitoso. Redirigiendo...");

        const role = (response as any).role;
        
        if (role) {
          localStorage.setItem("role", role);
        }
        
        if ((response as any).user_id) {
          localStorage.setItem("user_id", String((response as any).user_id));
        }
        
        if (role === "ORGANIZADOR") {
          try {
            const meResponse = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/me`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            
            if (meResponse.ok) {
              const meData = await meResponse.json();
              
              if (meData.organizador_id) {
                const userWithOrg = {
                  ...meData,
                  organizador_id: meData.organizador_id,
                };
                localStorage.setItem("user", JSON.stringify(userWithOrg));
                localStorage.setItem("organizador_id", String(meData.organizador_id));
              }
            }
          } catch (err) {
            console.warn("No se pudo obtener /me después del login:", err);
          }
        }

        setTimeout(() => {
          if (role === "ORGANIZADOR") {
            window.location.href = "/organizerEvent";
          } else if (role === "ADMIN") {
            window.location.href = "/admin/eventos";
          } else {
            window.location.href = "/";
          }
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        setError("Usuario o contraseña incorrectos");
      } else {
        setError("Error en el servidor");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-80 mx-auto">
      <div>
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          placeholder="********"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}

      <Button type="submit" className="w-full text-secondary">
        Ingresar
      </Button>
    </form>
  );
}