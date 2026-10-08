import { Link, useNavigate } from "react-router";
import { useEffect } from "react";
import LoginForm from "../components/LoginForm";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { login_google } from "../services/AuthService";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { error: showError } = useNotificationContext();

  useEffect(() => {
    // Procesar token de Google OAuth PRIMERO
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      console.log("🔵 Procesando token de Google OAuth desde hash");
      const params = new URLSearchParams(hash.substring(1));
      const tokenParam = params.get("access_token");
      
      if (tokenParam) {
        console.log("✅ Token encontrado en hash");
        const token = tokenParam.replace(/^Bearer\s+/i, "");
        localStorage.setItem("token", token);
        
        // ✅ GUARDAR MÉTODO DE AUTENTICACIÓN - GOOGLE
        localStorage.setItem("auth_method", "google");
        
        window.history.replaceState(null, "", window.location.pathname);
        
        (async () => {
          try {
            console.log("🔄 Obteniendo datos del usuario...");
            const { getCurrentUser } = await import("../services/AuthService");
            const user = await getCurrentUser();
            localStorage.setItem("user", JSON.stringify(user));
            
            const role = (user as any)?.rol?.value ?? (user as any)?.rol ?? (user as any)?.role;
            console.log("✅ Usuario autenticado con Google, rol:", role);
            
            if (role === "ORGANIZADOR") {
              navigate("/organizerEvent", { replace: true });
            } else if (role === "ADMIN") {
              navigate("/admin/eventos", { replace: true });
            } else {
              navigate("/", { replace: true });
            }
          } catch (e) {
            console.error("❌ Error al obtener usuario:", e);
            showError("Error al autenticar con Google. Por favor intenta de nuevo.");
            navigate("/", { replace: true });
          }
        })();
        return;
      }
    }

    // Si el usuario ya está logueado, redirigir según su rol
    if (!loading && user) {
      const role = user.rol;
      if (role === "ORGANIZADOR") {
        navigate("/organizerEvent");
      } else if (role === "ADMIN") {
        navigate("/admin/eventos");
      } else {
        navigate("/");
      }
      return;
    }

    // Fallback: query string
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      const token = tokenParam.replace(/^Bearer\s+/i, "");
      localStorage.setItem("token", token);
      
      // ✅ GUARDAR MÉTODO DE AUTENTICACIÓN - GOOGLE
      localStorage.setItem("auth_method", "google");
      
      (async () => {
        try {
          const { getCurrentUser } = await import("../services/AuthService");
          const user = await getCurrentUser();
          localStorage.setItem("user", JSON.stringify(user));
          const role = (user as any)?.rol?.value ?? (user as any)?.rol ?? (user as any)?.role;
          if (role === "ORGANIZADOR") navigate("/organizerEvent");
          else if (role === "ADMIN") navigate("/admin/eventos");
          else navigate("/");
        } catch (e) {
          navigate("/");
        }
      })();
    }
  }, [navigate, user, loading, showError]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      <div className="w-full lg:w-1/2 bg-secondary text-white flex flex-col justify-between p-8 lg:p-10">
        <h1 className="text-lg font-bold">⌘ Tickify</h1>
        <p className="text-base mt-6 lg:mt-0">
          Disfruta el festival de Música en Lima este 10 de Septiembre en el
          Teatro de Lima
        </p>
      </div>

      <div className="w-full h-screen lg:w-1/2 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold mb-2 text-center">Bienvenido a Tickify</h2>
          <p className="text-gray-600 mb-6 text-center">Ingresa tu usuario</p>

          <LoginForm />

          <div className="flex items-center my-4 w-80 justify-center mx-auto">
            <hr className="flex-grow border-gray-300" />
            <span className="px-2 text-gray-500">o</span>
            <hr className="flex-grow border-gray-300" />
          </div>

          <Button
            variant="outline"
            className="w-80 border-gray-300 text-gray-700 flex items-center justify-center gap-2 text-center mx-auto"
            onClick={login_google}
          >
            Ingresa con Google
            <Mail className="w-4 h-4" />
          </Button>

          <div className="mt-4 text-center text-sm text-gray-600 flex flex-col gap-2">
            <p>
              ¿No tienes cuenta?{" "}
              <Link to="/register" className="text-muted-foreground font-medium hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}