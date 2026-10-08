import { useEffect, useState } from "react";
import {
  getUserByEmail,
  updateUserPassword,
  verifyPassword,
  updateUser
} from "@/users/services/AuthService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User as UserIcon, Eye, EyeOff } from "lucide-react";
import type { User as UserType } from "@/users/types/user";
import { Button } from "@/components/ui/button";
import { isValidPassword } from "@/users/utils/validation";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function AdminProfilePage() {
  const { error: showError, success } = useNotificationContext();
  const [user, setUser] = useState<UserType>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- Para edición del perfil ---
  const [editMode, setEditMode] = useState(false);
  const [editNombres, setEditNombres] = useState("");
  const [editApellidos, setEditApellidos] = useState("");
  const [editCorreo, setEditCorreo] = useState("");
  const [editTelefono, setEditTelefono] = useState("");

  // --- Password ---
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
          setUser(finalUserData);

          // Inicializar campos editables
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

  // --- Guardar cambios del perfil ---
  const handleSaveProfile = async () => {
    try {
      const updated = await updateUser(user!.id, {
        nombres: editNombres,
        apellidos: editApellidos,
        correo: editCorreo,
        telefono: editTelefono,
      });

      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);

      setEditMode(false);
      success("Perfil actualizado correctamente");
    } catch {
      showError("Error actualizando el perfil");
    }
  };

  // --- Cambio de contraseña ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user?.id || !user?.correo) return setError("Error de sesión.");

    if (!currentPassword) return setError("Debes ingresar tu contraseña actual.");
    if (newPassword !== confirmPassword) return setError("Las contraseñas no coinciden.");
    if (!isValidPassword(newPassword))
      return setError("La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número.");

    try {
      const isOldPasswordValid = await verifyPassword(user.correo, currentPassword);
      if (!isOldPasswordValid) return setError("La contraseña actual es incorrecta.");

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

  if (loading) return <div className="text-center mt-10">Cargando perfil...</div>;
  if (error) return <div className="text-center text-red-500 mt-10">{error}</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex justify-center items-center bg-[#fffef9] px-6 py-12">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-md p-10">

        {/* Encabezado */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 rounded-full bg-[#faf8e9] flex items-center justify-center mb-4 shadow-inner">
            <UserIcon className="w-10 h-10 text-gray-500" />
          </div>
          <h1 className="text-3xl font-semibold text-gray-800">Mi perfil</h1>

          <span className="mt-2 px-4 py-1 bg-red-600 text-white text-sm font-semibold rounded-full">
            Administrador
          </span>
        </div>

        {/* Botón editar */}
        <Button
          onClick={() => setEditMode(!editMode)}
          className="bg-primary text-black font-semibold rounded-full w-full sm:w-auto mb-6"
        >
          {editMode ? "Cancelar edición" : "Editar perfil"}
        </Button>

        {/* Datos del usuario */}
        <div className="space-y-6">
          {editMode ? (
            <>
              <div>
                <Label>Nombre</Label>
                <Input
                  value={editNombres}
                  onChange={(e) => setEditNombres(e.target.value)}
                />
              </div>

              <div>
                <Label>Apellidos</Label>
                <Input
                  value={editApellidos}
                  onChange={(e) => setEditApellidos(e.target.value)}
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  value={editCorreo}
                  onChange={(e) => setEditCorreo(e.target.value)}
                />
              </div>

              <div>
                <Label>Teléfono</Label>
                <Input
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
                <Label>Nombre</Label>
                <Input value={`${user.nombres} ${user.apellidos}`} disabled className="bg-[#fffef9]" />
              </div>

              <div>
                <Label>Email</Label>
                <Input value={user.correo} disabled className="bg-[#fffef9]" />
              </div>

              <div>
                <Label>Teléfono</Label>
                <Input value={user.telefono || ""} disabled className="bg-[#fffef9]" />
              </div>
            </>
          )}
        </div>

        {/* Cambio de contraseña */}
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
      </div>
    </div>
  );
}
