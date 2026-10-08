import { Navigate } from "react-router-dom";
import { useAuth } from "@/users/context/AuthContext";
import type { JSX } from "react/jsx-runtime";

interface ProtectedRouteProps {
  children: JSX.Element;
  roles?: string[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Mientras se valida el usuario
  if (loading) {
    return <div>Cargando...</div>; // Puedes poner un spinner
  }

  // No autenticado
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si se requieren roles específicos
  if (roles && roles.length > 0) {
    const userRole = user.rol;
    if (!roles.includes(userRole)) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
