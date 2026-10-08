import { useEffect, useState } from "react";
import Pagination from "@/events/components/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Search, Settings2, Check, Trash2, Pencil, X, UserPlus, Info, UserCheck } from "lucide-react";
import type { User } from "@/users/types/user";
import { getUsuarios, searchUsuariosByName, filterUsuariosByRol, deleteUsuario, updateUsuarioRol, updateUsuario, changePassword, createUsuario, getSolicitudDetalles, reactivarUsuario } from "@/admin/services/UserService"; // USANDO FUNCIÓN
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function UsersPage() {
  const { error: showError, success } = useNotificationContext();
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [rolSeleccionado, setRolSeleccionado] = useState<string | null>(null);
  const [mostrarEliminados, setMostrarEliminados] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estados para el modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ nombres: "", apellidos: "", correo: "", telefono: "", password: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Estados para el modal de creación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    nombres: "",
    apellidos: "",
    telefono: "",
    correo: "",
    password: "",
    confirmPassword: "",
    rol: "CLIENTE",
    ruc: "",
    razon_social: "",
    dni: "",
    direccion: "",
    correo_organizacional: "",
    motivacion: "",
    sector: "",
  });
  const [savingCreate, setSavingCreate] = useState(false);

  // Estados para el modal de detalles de organizador
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [organizadorInfo, setOrganizadorInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Estado para el modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<number | null>(null);

  const usuariosPorPagina = 6;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("No se encontró token.");
      return;
    }
    loadUsuarios();
  }, []);

  // Efecto para búsqueda automática cuando cambia searchTerm, rolSeleccionado o mostrarEliminados
  useEffect(() => {
    const timerId = setTimeout(() => {
      realizarBusqueda();
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timerId);
  }, [searchTerm, rolSeleccionado, mostrarEliminados]);

  async function realizarBusqueda() {
    setCurrentPage(1);

    if (searchTerm.trim() === "" && !rolSeleccionado) {
      loadUsuarios();
      return;
    }

    try {
      setLoading(true);

      const data = await getUsuarios({
        nombre: searchTerm.trim() || undefined,
        rol: rolSeleccionado ? rolSeleccionado.toUpperCase() : undefined,
        inactivos: mostrarEliminados,
      });

      setUsuarios(data);
    } catch (err) {
      console.error("Error al buscar usuarios:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsuarios() {
    try {
      setLoading(true);
      const data = await getUsuarios({ inactivos: mostrarEliminados });
      setUsuarios(data);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const totalPaginas = Math.ceil(usuarios.length / usuariosPorPagina);
  const inicio = (currentPage - 1) * usuariosPorPagina;
  const usuariosVisibles = usuarios.slice(inicio, inicio + usuariosPorPagina);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPaginas) setCurrentPage(newPage);
  };

  // async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
  //   e.preventDefault();
  //   if (searchTerm.trim() === "") {
  //     loadUsuarios();
  //     return;
  //   }

  //   try {
  //     setLoading(true);
  //     const results = await searchUsuariosByName(searchTerm); // USANDO FUNCIÓN (por implementar funcionalidad)
  //     setUsuarios(results);
  //   } catch (err) {
  //     console.error("Error al buscar usuarios:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCurrentPage(1);

    if (searchTerm.trim() === "" && !rolSeleccionado) {
      loadUsuarios();
      return;
    }

    try {
      setLoading(true);

      // Combinar búsqueda y filtro de rol (convertir rol a mayúsculas)
      const data = await getUsuarios({
        nombre: searchTerm.trim() || undefined,
        rol: rolSeleccionado ? rolSeleccionado.toUpperCase() : undefined,
      });

      setUsuarios(data);
    } catch (err) {
      console.error("Error al buscar usuarios:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filtro por rol
  const [loadingFiltro, setLoadingFiltro] = useState(false);

  async function handleFilterByRol(rol: string) {
    try {
      setLoadingFiltro(true);
      setCurrentPage(1);

      // Toggle: si ya está seleccionado, deseleccionar
      const nuevoRol = rolSeleccionado === rol ? null : rol;
      setRolSeleccionado(nuevoRol);

      // Llamar al backend con búsqueda y nuevo filtro (convertir rol a mayúsculas)
      const data = await getUsuarios({
        nombre: searchTerm.trim() || undefined,
        rol: nuevoRol ? nuevoRol.toUpperCase() : undefined,
      });

      setUsuarios(data);
    } catch (error) {
      console.error("Error al filtrar por rol:", error);
    } finally {
      setLoadingFiltro(false);
    }
  }

  function handleEliminarUsuario(usuarioId: number) {
    setUsuarioAEliminar(usuarioId);
    setShowDeleteModal(true);
  }

  async function confirmarEliminarUsuario() {
    if (!usuarioAEliminar) return;

    try {
      await deleteUsuario(usuarioAEliminar);
      // Actualizar la lista después de eliminar
      setUsuarios((prev) => prev.filter((u) => u.id !== usuarioAEliminar));
      success("Usuario desactivado correctamente");
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      showError("No se pudo desactivar el usuario");
    } finally {
      setUsuarioAEliminar(null);
    }
  }

  async function handleReactivarUsuario(usuarioId: number) {
    try {
      await reactivarUsuario(usuarioId);
      // Recargar la lista de usuarios
      loadUsuarios();
      success("Usuario reactivado correctamente");
    } catch (error) {
      console.error("Error al reactivar usuario:", error);
      showError("No se pudo reactivar el usuario");
    }
  }

  function capitalizar(str: string) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function handleEditarUsuario(usuario: User) {
    setUsuarioEditando(usuario);
    setEditForm({
      nombres: usuario.nombres || "",
      apellidos: usuario.apellidos || "",
      correo: usuario.correo || "",
      telefono: usuario.telefono || "",
      password: "",
    });
    setShowEditModal(true);
  }

  async function handleGuardarCambios() {
    if (!usuarioEditando) return;

    try {
      setSavingEdit(true);

      // Actualizar datos básicos del usuario
      const { nombres, apellidos, correo, telefono, password } = editForm;
      await updateUsuario(usuarioEditando.id, { nombres, apellidos, correo, telefono });

      // Si se proporcionó una nueva contraseña, cambiarla
      if (password.trim()) {
        await changePassword(usuarioEditando.id, password);
      }

      // Actualizar la lista local
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === usuarioEditando.id ? { ...u, nombres, apellidos, correo, telefono } : u
        )
      );

      setShowEditModal(false);
      success("Usuario actualizado correctamente");
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      showError("No se pudo actualizar el usuario");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleCrearUsuario() {
    const { password, confirmPassword, rol, ...resto } = createForm;

    // Validaciones
    if (password !== confirmPassword) {
      showError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 8) {
      showError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (rol === "ORGANIZADOR" && (!createForm.ruc || !createForm.razon_social || !createForm.dni || !createForm.direccion || !createForm.correo_organizacional || !createForm.motivacion || !createForm.sector)) {
      showError("Todos los campos de organizador son obligatorios");
      return;
    }

    try {
      setSavingCreate(true);

      const data: any = {
        nombres: resto.nombres,
        apellidos: resto.apellidos,
        telefono: resto.telefono,
        correo: resto.correo,
        password,
        rol,
      };

      if (rol === "ORGANIZADOR") {
        data.ruc = createForm.ruc;
        data.razon_social = createForm.razon_social;
        data.dni = createForm.dni;
        data.direccion = createForm.direccion;
        data.correo_organizacional = createForm.correo_organizacional;
        data.motivacion = createForm.motivacion;
        data.sector = createForm.sector;
      }

      const nuevoUsuario = await createUsuario(data);

      // Agregar a la lista local
      setUsuarios((prev) => [nuevoUsuario, ...prev]);

      setShowCreateModal(false);
      // Resetear formulario
      setCreateForm({
        nombres: "",
        apellidos: "",
        telefono: "",
        correo: "",
        password: "",
        confirmPassword: "",
        rol: "CLIENTE",
        ruc: "",
        razon_social: "",
        dni: "",
        direccion: "",
        correo_organizacional: "",
        motivacion: "",
        sector: "",
      });
      success("Usuario creado correctamente");
    } catch (error: any) {
      console.error("Error al crear usuario:", error);
      showError(error.message || "No se pudo crear el usuario");
    } finally {
      setSavingCreate(false);
    }
  }

  async function handleVerDetallesOrganizador(usuarioId: number) {
    try {
      setLoadingInfo(true);
      const detalles = await getSolicitudDetalles(usuarioId);
      setOrganizadorInfo(detalles);
      setShowInfoModal(true);
    } catch (error: any) {
      const errorMessage = error.message || "No se pudo obtener la información del organizador";
      console.error(errorMessage);
      showError(errorMessage);
    } finally {
      setLoadingInfo(false);
    }
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold mb-6">Gestión de Usuarios</h1>

      {/* Barra de búsqueda y filtros */}
      <div className="flex items-center gap-4 w-full">
        {/* Campo de búsqueda */}
        <div className="relative flex-grow max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E47] w-5 h-5" />
          <Input
            type="text"
            placeholder="Buscar usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 bg-[#F5F5E5] border-none rounded-full text-black placeholder-[#9E9E47] focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
          />
        </div>

        {/* Botón de filtro por rol */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="border-[#E4E4E7] text-black flex items-center gap-2 px-5 py-3 text-base font-medium rounded-lg whitespace-nowrap"
            >
              <Settings2 className="w-5 h-5" />
              Filtrar por Rol
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 bg-white border border-gray-200 shadow-lg rounded-lg">
            <div className="flex flex-col gap-2">
              {["Admin", "Organizador", "Cliente"].map((rol) => (
                <button
                  key={rol}
                  onClick={() => handleFilterByRol(rol)}
                  className="flex justify-between items-center px-3 py-2 rounded-md hover:bg-gray-100 text-sm text-black transition"
                >
                  {rol}
                  {rolSeleccionado === rol && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Botón para mostrar usuarios eliminados */}
        <Button
          variant="outline"
          onClick={() => {
            setMostrarEliminados(!mostrarEliminados);
            setSearchTerm("");
            setRolSeleccionado(null);
          }}
          className={`border-[#E4E4E7] text-black flex items-center gap-2 px-5 py-3 text-base font-medium rounded-lg whitespace-nowrap ${
            mostrarEliminados ? "bg-red-100 hover:bg-red-200" : ""
          }`}
        >
          <Trash2 className="w-5 h-5" />
          {mostrarEliminados ? "Ocultar Eliminados" : "Ver Eliminados"}
        </Button>

        {/* Botón de crear usuario */}
        <Button
          variant="outline"
          onClick={() => setShowCreateModal(true)}
          className="border-[#E4E4E7] text-black flex items-center gap-2 px-5 py-3 text-base font-medium rounded-lg whitespace-nowrap ml-auto"
        >
          <UserPlus className="w-5 h-5" />
          Crear Usuario
        </Button>
      </div>

      {/* Tabla de usuarios */}
      <div className="mt-6 border border-gray-300 rounded-lg overflow-hidden">
        <div className="grid bg-[#F5F5E5] font-semibold text-gray-700 py-3 px-6" style={{ gridTemplateColumns: "1.5fr 2fr 1fr 1fr 1fr" }}>
          <div>Nombre</div>
          <div>Correo Electrónico</div>
          <div>Teléfono</div>
          <div>Rol</div>
          <div>Acciones</div>
        </div>

        {usuariosVisibles.map((usuario) => (
          <div
            key={usuario.id}
            className="grid items-center border-t border-gray-200 py-3 px-6"
            style={{ gridTemplateColumns: "1.5fr 2fr 1fr 1fr 1fr" }}
          >
            <div className="font-medium text-gray-800 truncate">
              {usuario.nombres} {usuario.apellidos}
            </div>
            <div className="text-gray-700 truncate" title={usuario.correo}>{usuario.correo}</div>
            <div className="text-gray-700 truncate">{usuario.telefono}</div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-fit border-gray-300 text-black text-sm bg-white hover:bg-gray-100"
                >
                  {capitalizar(usuario.rol)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2 bg-white border border-gray-200 shadow-lg rounded-lg">
                <div className="flex flex-col gap-2">
                  {["Admin", "Organizador", "Cliente"].map((rol) => (
                    <button
                      key={rol}
                      onClick={async () => {
                        try {
                          await updateUsuarioRol(usuario.id, rol.toUpperCase());
                          // Actualizar el estado local
                          setUsuarios((prev) =>
                            prev.map((u) =>
                              u.id === usuario.id ? { ...u, rol: rol.toUpperCase() } : u
                            )
                          );
                        } catch (error) {
                          console.error("Error al actualizar rol:", error);
                          showError("Error al actualizar el rol del usuario");
                        }
                      }}
                      className="flex justify-between items-center px-3 py-2 rounded-md hover:bg-gray-100 text-sm text-black transition"
                    >
                      {rol}
                      {capitalizar(usuario.rol) === rol && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {/* Acciones */}
            <div className="flex gap-2">
              {!mostrarEliminados ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => handleEditarUsuario(usuario)}
                    className="bg-[#FFD700] hover:bg-[#e6c200] p-2 rounded-md"
                    title="Editar usuario"
                  >
                    <Pencil className="w-4 h-4 text-black" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleEliminarUsuario(usuario.id)}
                    className="bg-[#FFD700] hover:bg-[#e6c200] p-2 rounded-md"
                    title="Desactivar usuario"
                  >
                    <Trash2 className="w-4 h-4 text-black" />
                  </Button>
                  {usuario.rol.toUpperCase() === "ORGANIZADOR" && (
                    <Button
                      variant="ghost"
                      onClick={() => handleVerDetallesOrganizador(usuario.id)}
                      className="bg-[#FFD700] hover:bg-[#e6c200] p-2 rounded-md"
                      title="Ver detalles del organizador"
                    >
                      <Info className="w-4 h-4 text-black" />
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => handleReactivarUsuario(usuario.id)}
                  className="bg-green-500 hover:bg-green-600 p-2 rounded-md"
                  title="Reactivar usuario"
                >
                  <UserCheck className="w-4 h-4 text-white" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Paginación */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPaginas}
        onPageChange={handlePageChange}
      />

      {/* Modal de Creación de Usuario */}
      {showCreateModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-40 bg-black/50"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full max-h-screen overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div className="mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Crear Nuevo Usuario
              </h2>
              <p className="text-gray-600">
                Completa los campos para registrar un nuevo usuario en el sistema
              </p>
            </div>

            {/* Formulario */}
            <div className="space-y-4">
              {/* Rol */}
              <div>
                <Label htmlFor="rol" className="text-sm text-gray-600 font-medium mb-2 block">
                  Registrar como
                </Label>
                <RadioGroup
                  value={createForm.rol}
                  onValueChange={(value) => setCreateForm({ ...createForm, rol: value })}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CLIENTE" id="create-cliente" />
                    <Label htmlFor="create-cliente">Cliente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ORGANIZADOR" id="create-organizador" />
                    <Label htmlFor="create-organizador">Organizador</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ADMIN" id="create-admin" />
                    <Label htmlFor="create-admin">Admin</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Nombres */}
              <div>
                <Label className="text-sm text-gray-600 font-medium mb-1 block">
                  Nombres *
                </Label>
                <Input
                  type="text"
                  value={createForm.nombres}
                  onChange={(e) => setCreateForm({ ...createForm, nombres: e.target.value })}
                  className="w-full"
                  placeholder="Juan"
                  required
                />
              </div>

              {/* Apellidos */}
              <div>
                <Label className="text-sm text-gray-600 font-medium mb-1 block">
                  Apellidos *
                </Label>
                <Input
                  type="text"
                  value={createForm.apellidos}
                  onChange={(e) => setCreateForm({ ...createForm, apellidos: e.target.value })}
                  className="w-full"
                  placeholder="Pérez"
                  required
                />
              </div>

              {/* Teléfono */}
              <div>
                <Label className="text-sm text-gray-600 font-medium mb-1 block">
                  Teléfono *
                </Label>
                <Input
                  type="tel"
                  value={createForm.telefono}
                  onChange={(e) => setCreateForm({ ...createForm, telefono: e.target.value })}
                  className="w-full"
                  placeholder="+51 999999999"
                  required
                />
              </div>

              {/* Correo */}
              <div>
                <Label className="text-sm text-gray-600 font-medium mb-1 block">
                  {createForm.rol === "ORGANIZADOR" ? "Correo Personal *" : "Correo Electrónico *"}
                </Label>
                <Input
                  type="email"
                  value={createForm.correo}
                  onChange={(e) => setCreateForm({ ...createForm, correo: e.target.value })}
                  className="w-full"
                  placeholder="ejemplo@correo.com"
                  required
                />
              </div>

              {/* Campos extra para Organizador */}
              {createForm.rol === "ORGANIZADOR" && (
                <>
                  <div>
                    <Label className="text-sm text-gray-600 font-medium mb-1 block">
                      Correo Organizacional *
                    </Label>
                    <Input
                      type="email"
                      value={createForm.correo_organizacional}
                      onChange={(e) => setCreateForm({ ...createForm, correo_organizacional: e.target.value })}
                      className="w-full"
                      placeholder="name@organizacion.com"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-gray-600 font-medium mb-1 block">
                      RUC *
                    </Label>
                    <Input
                      type="text"
                      value={createForm.ruc}
                      onChange={(e) => setCreateForm({ ...createForm, ruc: e.target.value })}
                      className="w-full"
                      placeholder="20123456789"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-gray-600 font-medium mb-1 block">
                      Razón Social *
                    </Label>
                    <Input
                      type="text"
                      value={createForm.razon_social}
                      onChange={(e) => setCreateForm({ ...createForm, razon_social: e.target.value })}
                      className="w-full"
                      placeholder="Eventos SAC"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-gray-600 font-medium mb-1 block">
                      DNI *
                    </Label>
                    <Input
                      type="text"
                      value={createForm.dni}
                      onChange={(e) => setCreateForm({ ...createForm, dni: e.target.value })}
                      className="w-full"
                      placeholder="12345678"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-gray-600 font-medium mb-1 block">
                      Dirección *
                    </Label>
                    <Input
                      type="text"
                      value={createForm.direccion}
                      onChange={(e) => setCreateForm({ ...createForm, direccion: e.target.value })}
                      className="w-full"
                      placeholder="Av. Siempre Viva 123"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-gray-600 font-medium mb-1 block">
                      Sector *
                    </Label>
                    <Input
                      type="text"
                      value={createForm.sector}
                      onChange={(e) => setCreateForm({ ...createForm, sector: e.target.value })}
                      className="w-full"
                      placeholder="Ej: Tecnología, Educación"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-gray-600 font-medium mb-1 block">
                      Motivación *
                    </Label>
                    <Input
                      type="text"
                      value={createForm.motivacion}
                      onChange={(e) => setCreateForm({ ...createForm, motivacion: e.target.value })}
                      className="w-full"
                      placeholder="Quiero organizar eventos porque..."
                      required
                    />
                  </div>
                </>
              )}

              {/* Contraseña */}
              <div>
                <Label className="text-sm text-gray-600 font-medium mb-1 block">
                  Contraseña *
                </Label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full"
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </div>

              {/* Confirmar Contraseña */}
              <div>
                <Label className="text-sm text-gray-600 font-medium mb-1 block">
                  Confirmar Contraseña *
                </Label>
                <Input
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                  className="w-full"
                  placeholder="Repite la contraseña"
                  required
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 justify-end mt-8 pt-4 border-t">
                <Button
                  className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                  onClick={handleCrearUsuario}
                  disabled={savingCreate}
                >
                  <Check className="w-4 h-4" />
                  {savingCreate ? "Creando..." : "Crear Usuario"}
                </Button>
                <Button
                  className="bg-gray-600 text-white hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => setShowCreateModal(false)}
                  disabled={savingCreate}
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Información de Organizador */}
      {showInfoModal && organizadorInfo && (
        <div
          className="fixed inset-0 flex items-center justify-center z-40 bg-black/50"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full max-h-screen overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div className="mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Detalles del Organizador
              </h2>
              <p className="text-gray-600">
                Información de la solicitud del organizador
              </p>
            </div>

            {/* Información */}
            <div className="space-y-4">
              {/* DNI */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">
                  DNI
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800">
                  {organizadorInfo.dni || "N/A"}
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">
                  Teléfono
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800">
                  {organizadorInfo.telefono || "N/A"}
                </div>
              </div>

              {/* RUC */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">
                  RUC
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800">
                  {organizadorInfo.ruc || "N/A"}
                </div>
              </div>

              {/* Razón Social */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">
                  Razón Social
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800">
                  {organizadorInfo.razon_social || "N/A"}
                </div>
              </div>

              {/* Correo Organizacional */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">
                  Correo Organizacional
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800">
                  {organizadorInfo.correo_organizacional || "N/A"}
                </div>
              </div>

              {/* Dirección */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">
                  Dirección
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800">
                  {organizadorInfo.direccion || "N/A"}
                </div>
              </div>

              {/* Sector */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">
                  Sector
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800">
                  {organizadorInfo.sector || "N/A"}
                </div>
              </div>

              {/* Motivación */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">
                  Motivación
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800">
                  {organizadorInfo.motivacion || "N/A"}
                </div>
              </div>

              {/* Botón de cerrar */}
              <div className="flex gap-3 justify-end mt-8 pt-4 border-t">
                <Button
                  className="bg-gray-600 text-white hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => setShowInfoModal(false)}
                >
                  <X className="w-4 h-4" />
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Usuario */}
      {showEditModal && usuarioEditando && (
        <div
          className="fixed inset-0 flex items-center justify-center z-40 bg-black/50"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full max-h-screen overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div className="mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Editar Usuario
              </h2>
              <p className="text-gray-600">
                Modifica los datos de <strong>{usuarioEditando.nombres} {usuarioEditando.apellidos}</strong>
              </p>
            </div>

            {/* Formulario */}
            <div className="space-y-4">
              {/* Nombres */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">
                  Nombres
                </label>
                <Input
                  type="text"
                  value={editForm.nombres}
                  onChange={(e) => setEditForm({ ...editForm, nombres: e.target.value })}
                  className="w-full"
                  placeholder="Ingrese los nombres"
                />
              </div>

              {/* Apellidos */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">
                  Apellidos
                </label>
                <Input
                  type="text"
                  value={editForm.apellidos}
                  onChange={(e) => setEditForm({ ...editForm, apellidos: e.target.value })}
                  className="w-full"
                  placeholder="Ingrese los apellidos"
                />
              </div>

              {/* Correo */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">
                  Correo Electrónico
                </label>
                <Input
                  type="email"
                  value={editForm.correo}
                  onChange={(e) => setEditForm({ ...editForm, correo: e.target.value })}
                  className="w-full"
                  placeholder="ejemplo@correo.com"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">
                  Teléfono
                </label>
                <Input
                  type="tel"
                  value={editForm.telefono}
                  onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                  className="w-full"
                  placeholder="999999999"
                />
              </div>

              {/* Contraseña (Opcional) */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">
                  Nueva Contraseña (opcional)
                </label>
                <Input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full"
                  placeholder="Dejar en blanco para mantener la actual"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 justify-end mt-8 pt-4 border-t">
                <Button
                  className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                  onClick={handleGuardarCambios}
                  disabled={savingEdit}
                >
                  <Check className="w-4 h-4" />
                  {savingEdit ? "Guardando..." : "Aceptar"}
                </Button>
                <Button
                  className="bg-gray-600 text-white hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => setShowEditModal(false)}
                  disabled={savingEdit}
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-40 bg-black/50"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icono de advertencia */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Título */}
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
              ¿Eliminar usuario?
            </h2>

            {/* Mensaje */}
            <p className="text-gray-600 text-center mb-6">
              El usuario será desactivado temporalmente. Podrás reactivarlo más adelante si lo deseas.
            </p>

            {/* Botones */}
            <div className="flex gap-3 justify-center">
              <Button
                className="bg-red-600 text-white hover:bg-red-700 px-6"
                onClick={confirmarEliminarUsuario}
              >
                Eliminar
              </Button>
              <Button
                variant="outline"
                className="px-6"
                onClick={() => {
                  setShowDeleteModal(false);
                  setUsuarioAEliminar(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}