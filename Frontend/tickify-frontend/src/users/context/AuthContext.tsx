import { createContext, useContext, useState, useEffect } from "react";
import { getUserByEmail } from "../services/AuthService";
import { jwtDecode } from "jwt-decode";
import type { User } from "../types/user";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          // Obtener el usuario desde el token
          const decoded: any = jwtDecode(token);
          const email = decoded.sub;

          getUserByEmail(email)
            .then((u) => {
              // Normalizar el rol (puede venir como string o como {value: string})
              const normalizedUser = {
                ...u,
                rol: typeof u.rol === 'string' ? u.rol : (u.rol as any)?.value || u.rol
              };
              setUser(normalizedUser);
              localStorage.setItem("user", JSON.stringify(normalizedUser));
            })
            .catch(() => setUser(null))
            .finally(() => setLoading(false));

        } catch {
          setUser(null);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const logout = () => {
    // Limpiar todos los datos de autenticación
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    localStorage.removeItem("organizador_id");
    setUser(null);

    // Forzar recarga completa para limpiar estado
    window.location.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return context;
};

