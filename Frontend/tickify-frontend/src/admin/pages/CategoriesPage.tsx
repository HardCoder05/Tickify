import { useEffect, useState } from "react";
import Pagination from "@/events/components/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Trash2, Pencil, X, Check, Plus } from "lucide-react";
import type { Category } from "@/admin/services/CategoryService";
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from "@/admin/services/CategoryService";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function CategoriesPage() {
  const { error: showError, success } = useNotificationContext();
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Estados para el modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState({ nombre: "", descripcion: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Estados para el modal de creación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ nombre: "", descripcion: "" });
  const [savingCreate, setSavingCreate] = useState(false);

  // Estados para el modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState<number | null>(null);

  const categoriasPorPagina = 6;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("No se encontró token.");
      return;
    }
    loadCategorias();
  }, []);

  async function loadCategorias() {
    try {
      setLoading(true);
      const data = await getCategorias();
      setCategorias(data);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Filtrar categorías por búsqueda (solo por nombre)
  const categoriasFiltradas = categorias.filter((categoria) =>
    categoria.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPaginas = Math.ceil(categoriasFiltradas.length / categoriasPorPagina);
  const inicio = (currentPage - 1) * categoriasPorPagina;
  const categoriasVisibles = categoriasFiltradas.slice(inicio, inicio + categoriasPorPagina);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPaginas) setCurrentPage(newPage);
  };

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCurrentPage(1);
  }

  function handleEliminarCategoria(categoriaId: number) {
    setCategoriaAEliminar(categoriaId);
    setShowDeleteModal(true);
  }

  async function confirmarEliminarCategoria() {
    if (!categoriaAEliminar) return;

    try {
      await deleteCategoria(categoriaAEliminar);
      setCategorias((prev) => prev.filter((c) => c.id !== categoriaAEliminar));
      success("Categoría eliminada exitosamente");
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error al eliminar categoría:", error);
      showError("No se pudo eliminar la categoría");
    } finally {
      setCategoriaAEliminar(null);
    }
  }

  function handleEditarCategoria(categoria: Category) {
    setCategoriaEditando(categoria);
    setEditForm({
      nombre: categoria.nombre || "",
      descripcion: categoria.descripcion || "",
    });
    setShowEditModal(true);
  }

  async function handleGuardarCambios() {
    if (!categoriaEditando) return;

    const { nombre, descripcion } = editForm;

    // Validar campos obligatorios
    if (!nombre.trim() || !descripcion.trim()) {
      showError("Todos los campos son obligatorios");
      return;
    }

    // Verificar si el nombre ya existe (excluyendo la categoría actual)
    const nombreExiste = categorias.some(
      (c) => c.id !== categoriaEditando.id && c.nombre.toLowerCase() === nombre.trim().toLowerCase()
    );
    
    if (nombreExiste) {
      showError("El nombre de la categoría ya existe.");
      return;
    }

    try {
      setSavingEdit(true);
      const categoriaActualizada = await updateCategoria(categoriaEditando.id, { nombre, descripcion });

      setCategorias((prev) =>
        prev.map((c) =>
          c.id === categoriaEditando.id ? categoriaActualizada : c
        )
      );

      setShowEditModal(false);
      success("Categoría actualizada correctamente");
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      showError("No se pudo actualizar la categoría");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleCrearCategoria() {
    const { nombre, descripcion } = createForm;

    // Validar campos obligatorios
    if (!nombre.trim() || !descripcion.trim()) {
      showError("Todos los campos son obligatorios");
      return;
    }

    // Verificar si el nombre ya existe
    const nombreExiste = categorias.some(
      (c) => c.nombre.toLowerCase() === nombre.trim().toLowerCase()
    );
    
    if (nombreExiste) {
      showError("El nombre de la categoría ya existe.");
      return;
    }

    try {
      setSavingCreate(true);
      const nuevaCategoria = await createCategoria({ nombre, descripcion });

      setCategorias((prev) => [nuevaCategoria, ...prev]);

      setShowCreateModal(false);
      setCreateForm({ nombre: "", descripcion: "" });
      success("Categoría creada correctamente");
    } catch (error: any) {
      console.error("Error al crear categoría:", error);
      showError(error.message || "No se pudo crear la categoría");
    } finally {
      setSavingCreate(false);
    }
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold mb-6">Gestión de Categorías</h1>

      {/* Barra de búsqueda y botón de crear */}
      <div className="flex items-center gap-4 w-full">
        {/* Campo de búsqueda */}
        <form onSubmit={handleSearch} className="relative flex-grow max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E47] w-5 h-5" />
          <Input
            type="text"
            placeholder="Buscar categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 bg-[#F5F5E5] border-none rounded-full text-black placeholder-[#9E9E47] focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
          />
        </form>

        {/* Botón de crear categoría */}
        <Button
          variant="outline"
          onClick={() => setShowCreateModal(true)}
          className="border-[#E4E4E7] text-black flex items-center gap-2 px-5 py-3 text-base font-medium rounded-lg whitespace-nowrap ml-auto"
        >
          <Plus className="w-5 h-5" />
          Crear Categoría
        </Button>
      </div>

      {/* Tabla de categorías */}
      <div className="mt-6 border border-gray-300 rounded-lg overflow-hidden">
        <div className="grid bg-[#F5F5E5] font-semibold text-gray-700 py-3 px-6" style={{ gridTemplateColumns: "1fr 2fr 1fr 1fr" }}>
          <div>Nombre</div>
          <div>Descripción</div>
          <div>Fecha de Actualización</div>
          <div>Acciones</div>
        </div>

        {categoriasVisibles.map((categoria) => (
          <div
            key={categoria.id}
            className="grid items-center border-t border-gray-200 py-3 px-6"
            style={{ gridTemplateColumns: "1fr 2fr 1fr 1fr" }}
          >
            <div className="font-medium text-gray-800 truncate">{categoria.nombre}</div>
            <div className="text-gray-700 truncate" title={categoria.descripcion}>
              {categoria.descripcion}
            </div>
            <div className="text-gray-700">
              {new Date(categoria.fecha_actualizacion).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              })}
            </div>
            {/* Acciones */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => handleEditarCategoria(categoria)}
                className="bg-[#FFD700] hover:bg-[#e6c200] p-2 rounded-md"
                title="Editar categoría"
              >
                <Pencil className="w-4 h-4 text-black" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleEliminarCategoria(categoria.id)}
                className="bg-[#FFD700] hover:bg-[#e6c200] p-2 rounded-md"
                title="Eliminar categoría"
              >
                <Trash2 className="w-4 h-4 text-black" />
              </Button>
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

      {/* Modal de Creación de Categoría */}
      {showCreateModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-40 bg-black/50"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div className="mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Crear Nueva Categoría
              </h2>
              <p className="text-gray-600">
                Completa los campos para registrar una nueva categoría de público
              </p>
            </div>

            {/* Formulario */}
            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <Label className="text-sm text-gray-600 font-medium mb-1 block">
                  Nombre *
                </Label>
                <Input
                  type="text"
                  value={createForm.nombre}
                  onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                  className="w-full"
                  placeholder="Ej: Público General"
                  required
                />
              </div>

              {/* Descripción */}
              <div>
                <Label className="text-sm text-gray-600 font-medium mb-1 block">
                  Descripción *
                </Label>
                <Input
                  type="text"
                  value={createForm.descripcion}
                  onChange={(e) => setCreateForm({ ...createForm, descripcion: e.target.value })}
                  className="w-full"
                  placeholder="Ej: Evento abierto para todo público sin restricciones"
                  required
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 justify-end mt-8 pt-4 border-t">
                <Button
                  className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                  onClick={handleCrearCategoria}
                  disabled={savingCreate}
                >
                  <Check className="w-4 h-4" />
                  {savingCreate ? "Creando..." : "Crear Categoría"}
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
              ¿Eliminar categoría?
            </h2>

            {/* Mensaje */}
            <p className="text-gray-600 text-center mb-6">
              Esta acción eliminará permanentemente la categoría. Si existen eventos asociados, no podrán ser categorizados correctamente.
            </p>

            {/* Botones */}
            <div className="flex gap-3 justify-center">
              <Button
                className="bg-red-600 text-white hover:bg-red-700 px-6"
                onClick={confirmarEliminarCategoria}
              >
                Eliminar
              </Button>
              <Button
                variant="outline"
                className="px-6"
                onClick={() => {
                  setShowDeleteModal(false);
                  setCategoriaAEliminar(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Categoría */}
      {showEditModal && categoriaEditando && (
        <div
          className="fixed inset-0 flex items-center justify-center z-40 bg-black/50"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div className="mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Editar Categoría
              </h2>
              <p className="text-gray-600">
                Modifica los datos de <strong>{categoriaEditando.nombre}</strong>
              </p>
            </div>

            {/* Formulario */}
            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">
                  Nombre
                </label>
                <Input
                  type="text"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  className="w-full"
                  placeholder="Ingrese el nombre"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">
                  Descripción
                </label>
                <Input
                  type="text"
                  value={editForm.descripcion}
                  onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                  className="w-full"
                  placeholder="Ingrese la descripción"
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
    </main>
  );
}
