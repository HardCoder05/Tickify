import { useEffect, useState } from "react";
import {
  getUserByEmail,
  updateUserPassword,
  getOrganizerByUserId,
  verifyPassword,
  updateUser
} from "../services/AuthService";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User as UserIcon, Eye, EyeOff } from "lucide-react";
import type { User as UserType } from "../types/user";
import { Button } from "@/components/ui/button";
//import { useNavigate } from "react-router-dom";
import { isValidPassword } from "../utils/validation";

export default function UserProfilePage() {
  //const navigate = useNavigate();
  const { success, error: showError } = useNotificationContext();
  const [user, setUser] = useState<UserType>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ DETECTAR MÉTODO DE AUTENTICACIÓN
  const [authMethod, setAuthMethod] = useState<string>("");

  // Edición del perfil
  const [editMode, setEditMode] = useState(false);
  const [editNombres, setEditNombres] = useState("");
  const [editApellidos, setEditApellidos] = useState("");
  const [editCorreo, setEditCorreo] = useState("");
  const [editTelefono, setEditTelefono] = useState("");

  // Password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        // ✅ LEER MÉTODO DE AUTENTICACIÓN
        const method = localStorage.getItem("auth_method") || "";
        setAuthMethod(method);

        const userData = localStorage.getItem("user");
        if (!userData) {
          setError("No se encontró información del usuario");
          setLoading(false);
          return;
        }

        const localUser = JSON.parse(userData);
        let finalUserData = localUser;

        try {
          const serverUser = await getUserByEmail(localUser.correo);
          finalUserData = { ...finalUserData, ...serverUser };

          if (serverUser.rol?.toUpperCase() === "ORGANIZADOR") {
            try {
              const organizador_id = localStorage.getItem("organizador_id");
              const organizerData = await getOrganizerByUserId(Number(organizador_id));
              finalUserData = { ...finalUserData, ...organizerData };
            } catch {
              // No hacer nada si falla obtener datos de organizador
            }
          }

          setUser(finalUserData);
          setEditNombres(finalUserData.nombres || "");
          setEditApellidos(finalUserData.apellidos || "");
          setEditCorreo(finalUserData.correo || "");
          setEditTelefono(finalUserData.telefono || "");

        } catch {
          setUser(localUser);
        }
      } catch {
        setError("Error al cargar los datos del usuario");
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  const handleSaveProfile = async () => {
    try {
      const updated = await updateUser(user!.id, {
        nombres: editNombres,
        apellidos: editApellidos,
        correo: editCorreo,
        telefono: editTelefono,
      });

      if (!updated.nombres || !updated.apellidos || !updated.correo || !updated.telefono) {
        showError("Los campos Nombre, Apellidos, Correo y Teléfono no pueden estar vacíos.");
        return;
      }

      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);

      setEditMode(false);
      success("Perfil actualizado correctamente");
    } catch {
      showError("Error actualizando el perfil");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user?.id || !user?.correo) return setError("Error de sesión.");

    if (!currentPassword) {
      showError("Por favor, ingresa la contraseña actual.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Las nuevas contraseñas no coinciden.");
      return;
    }

    if (!isValidPassword(newPassword)) {
      showError("La nueva contraseña no cumple con los requisitos mínimos de seguridad.");
      return;
    }

    try {
      const isOldPasswordValid = await verifyPassword(user.correo, currentPassword);
      if (!isOldPasswordValid) {
        showError("La contraseña actual es incorrecta.");
        return;
      }

      await updateUserPassword(user.id, newPassword);

      success("Contraseña actualizada correctamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);

    } catch {
      setError("Ocurrió un error al actualizar la contraseña.");
    }
  };

  //const handleOrganizerRequest = () => navigate("/organizer-request");

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#fffef9]">
        <div className="w-14 h-14 border-4 border-gray-300 border-t-primary rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 font-medium text-lg">Cargando perfil...</p>
      </div>
    );
  if (error) return <div className="text-center text-red-500 mt-10">{error}</div>;
  if (!user) return null;

  const isOrganizer = user.rol?.toUpperCase() === "ORGANIZADOR";
  // ✅ MOSTRAR CAMBIO DE CONTRASEÑA SOLO SI SE LOGUEÓ CON CREDENCIALES
  const canChangePassword = authMethod === "credentials";

  return (
    <div className="min-h-screen flex justify-center items-center bg-[#fffef9] px-6 py-12">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-md p-10">

        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 rounded-full bg-[#faf8e9] flex items-center justify-center mb-4 shadow-inner">
            <UserIcon className="w-10 h-10 text-gray-500" />
          </div>
          <h1 className="text-3xl font-semibold text-gray-800">Mi perfil</h1>

          {isOrganizer && (
            <span className="mt-2 px-4 py-1 bg-primary text-black text-sm font-semibold rounded-full">
              Organizador
            </span>
          )}
        </div>

        <Button
          onClick={() => setEditMode(!editMode)}
          className="bg-primary text-black font-semibold rounded-full w-full sm:w-auto mb-6"
        >
          {editMode ? "Cancelar edición" : "Editar perfil"}
        </Button>

        <div className="space-y-6">
          {editMode ? (
            <>
              <div>
                <Label htmlFor="edit-nombres">Nombre</Label>
                <Input
                  id="edit-nombres"
                  value={editNombres}
                  onChange={(e) => setEditNombres(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="edit-apellidos">Apellidos</Label>
                <Input
                  id="edit-apellidos"
                  value={editApellidos}
                  onChange={(e) => setEditApellidos(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="edit-correo">Email</Label>
                <Input
                  id="edit-correo"
                  value={editCorreo}
                  onChange={(e) => setEditCorreo(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="edit-telefono">Teléfono</Label>
                <Input
                  id="edit-telefono"
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                />
              </div>

              <Button
                className="bg-green-600 text-white rounded-full w-full hover:text-black"
                onClick={handleSaveProfile}
              >
                Guardar cambios
              </Button>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={`${user.nombres} ${user.apellidos}`} disabled className="bg-[#fffef9]" />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.correo} disabled className="bg-[#fffef9]" />
              </div>

              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" value={user.telefono || ""} disabled className="bg-[#fffef9]" />
              </div>
            </>
          )}

          {isOrganizer && (
            <div className="bg-yellow-50 p-4 rounded-xl space-y-4 border border-yellow-100">
              <h3 className="font-semibold text-yellow-800">Datos de Organización</h3>

              <div>
                <Label>Email Corporativo</Label>
                <Input value={user.correo_organizacional || "-"} disabled className="bg-white" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Razón Social</Label>
                  <Input value={user.razon_social || "-"} disabled className="bg-white" />
                </div>
                <div>
                  <Label>RUC</Label>
                  <Input value={user.ruc || "-"} disabled className="bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>DNI Representante</Label>
                  <Input value={user.dni || "-"} disabled className="bg-white" />
                </div>
                <div>
                  <Label>Sector</Label>
                  <Input value={user.sector || "-"} disabled className="bg-white" />
                </div>
              </div>

              <div>
                <Label>Dirección</Label>
                <Input value={user.direccion || "-"} disabled className="bg-white" />
              </div>

              <div>
                <Label>Motivación</Label>
                <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                  {user.motivacion || "-"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/*!isOrganizer && (
          <Button
            className="bg-primary text-black font-semibold rounded-full px-6 mt-6 w-full sm:w-auto"
            onClick={handleOrganizerRequest}
          >
            Solicitar cuenta de Organizador
          </Button>
        )*/}

        {/* ✅ MOSTRAR CAMBIO DE CONTRASEÑA SOLO SI USAS CREDENCIALES */}
        {canChangePassword && (
          <div className="mt-10 border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Seguridad</h2>

            {!showPasswordForm ? (
              <Button
                onClick={() => setShowPasswordForm(true)}
                className="bg-primary text-black font-semibold rounded-full px-6"
              >
                Cambiar contraseña
              </Button>
            ) : (
              <form className="space-y-4 bg-gray-50 p-6 rounded-xl border" onSubmit={handleSubmit}>

                <div>
                  <Label>Contraseña actual</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPass ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label>Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label>Confirmar nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border">
                    ⚠️ {error}
                  </div>
                )}

                <div className="flex gap-4 pt-2">
                  <Button
                    type="submit"
                    className="bg-primary text-black font-semibold rounded-full px-6"
                  >
                    Actualizar
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full px-6"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setNewPassword("");
                      setConfirmPassword("");
                      setCurrentPassword("");
                      setError("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ✅ MENSAJE INFORMATIVO SI SE LOGUEÓ CON GOOGLE */}
        {!canChangePassword && authMethod === "google" && (
          <div className="mt-10 border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Seguridad</h2>
            <div className="bg-blue-50 text-blue-700 p-4 rounded-lg border border-blue-200">
              <p className="text-sm">
                Iniciaste sesión con Google. La gestión de tu contraseña se realiza desde tu cuenta de Google.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}