import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Clock, Users } from "lucide-react";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { updateEventoFecha, createEventoFecha, deleteEventoFecha } from "../services/EventService";

interface ScheduleModalProps {
    eventId: number;
    fechas: any[];
    onClose: () => void;
    onUpdate: () => void;
}

export default function ScheduleModal({ eventId, fechas, onClose, onUpdate }: ScheduleModalProps) {
    const { success, error: showError, confirm } = useNotificationContext();
    const [schedules, setSchedules] = useState<any[]>([]);
    const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
    const [newSchedule, setNewSchedule] = useState({
        fecha: '',
        horaInicio: '',
        horaFin: '',
        capacidad: 0
    });

    useEffect(() => {
        setSchedules(fechas.map(f => ({ ...f })));
    }, [fechas]);

    const handleEditClick = (schedule: any) => {
        const start = new Date(schedule.fecha_inicio);
        const end = new Date(schedule.fecha_fin);
        
        setEditingSchedule({
            ...schedule,
            fecha: start.toISOString().split('T')[0],
            horaInicio: start.toTimeString().slice(0, 5),
            horaFin: end.toTimeString().slice(0, 5),
            capacidad: schedule.capacidad_maxima
        });
    };

    const handleCancelEdit = () => {
        setEditingSchedule(null);
    };

    const handleSaveEdit = async () => {
        if (!editingSchedule) return;

        try {
            // Validaciones
            if (!editingSchedule.fecha || !editingSchedule.horaInicio || !editingSchedule.horaFin) {
                showError('Completa todos los campos');
                return;
            }

            const fechaInicio = new Date(`${editingSchedule.fecha}T${editingSchedule.horaInicio}`);
            const fechaFin = new Date(`${editingSchedule.fecha}T${editingSchedule.horaFin}`);

            if (fechaFin <= fechaInicio) {
                showError('La hora de fin debe ser posterior a la hora de inicio');
                return;
            }

            // Llamar al endpoint PUT /api/v1/eventos/fechas/{fecha_id}
            await updateEventoFecha(editingSchedule.id, {
                fecha_inicio: fechaInicio.toISOString(),
                fecha_fin: fechaFin.toISOString()
            });
            
            success('Horario actualizado exitosamente');
            
            // Actualizar localmente
            const updated = schedules.map(s => 
                s.id === editingSchedule.id 
                    ? {
                        ...s,
                        fecha_inicio: fechaInicio.toISOString(),
                        fecha_fin: fechaFin.toISOString()
                    }
                    : s
            );
            setSchedules(updated);
            setEditingSchedule(null);
            onUpdate(); // Refrescar datos del padre
        } catch (err: any) {
            console.error('Error al guardar cambios:', err);
            if (err.response?.status === 401) {
                showError('Sesión expirada. Por favor, inicia sesión nuevamente.');
            } else if (err.code === 'ERR_NETWORK') {
                showError('Error de conexión. Verifica que el servidor esté corriendo y que tu sesión sea válida.');
            } else {
                showError(err.response?.data?.detail || 'No se pudieron guardar los cambios');
            }
        }
    };

    const handleDeleteSchedule = async (fechaId: number) => {
        const confirmed = await confirm({
            title: 'Eliminar horario',
            message: '¿Estás seguro de eliminar este horario?',
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            type: 'danger'
        });
        if (!confirmed) return;
        try {
            await deleteEventoFecha(fechaId);
            success('Horario eliminado exitosamente');
            
            // Actualizar localmente
            const updated = schedules.filter(s => s.id !== fechaId);
            setSchedules(updated);
            onUpdate(); // Refrescar datos del padre
        } catch (err: any) {
            console.error('Error al eliminar horario:', err);
            if (err.response?.status === 401) {
                showError('Sesión expirada. Por favor, inicia sesión nuevamente.');
            } else if (err.code === 'ERR_NETWORK') {
                showError('Error de conexión. Verifica que el servidor esté corriendo.');
            } else {
                showError(err.response?.data?.detail || 'No se pudo eliminar el horario');
            }
        }
    };

    const handleAddSchedule = async () => {
        if (!newSchedule.fecha || !newSchedule.horaInicio || !newSchedule.horaFin) {
            showError('Completa todos los campos del nuevo horario');
            return;
        }

        const fechaInicio = new Date(`${newSchedule.fecha}T${newSchedule.horaInicio}`);
        const fechaFin = new Date(`${newSchedule.fecha}T${newSchedule.horaFin}`);

        if (fechaFin <= fechaInicio) {
            showError('La hora de fin debe ser posterior a la hora de inicio');
            return;
        }

        try {
            // Llamar al endpoint POST /api/v1/eventos/{evento_id}/fechas
            const nuevaFecha = await createEventoFecha(eventId, {
                fecha_inicio: fechaInicio.toISOString(),
                fecha_fin: fechaFin.toISOString()
            });

            success('Horario agregado exitosamente');
            
            // Agregar localmente
            setSchedules([...schedules, nuevaFecha]);
            setNewSchedule({ fecha: '', horaInicio: '', horaFin: '', capacidad: 0 });
            onUpdate(); // Refrescar datos del padre
        } catch (err: any) {
            console.error('Error al agregar horario:', err);
            if (err.response?.status === 401) {
                showError('Sesión expirada. Por favor, inicia sesión nuevamente.');
            } else if (err.code === 'ERR_NETWORK') {
                showError('Error de conexión. Verifica que el servidor esté corriendo y que tu sesión sea válida.');
            } else {
                showError(err.response?.data?.detail || 'No se pudo agregar el horario');
            }
        }
    };

    const handleSave = async () => {
        try {
            // Aquí llamarías al endpoint PUT para actualizar cada fecha
            showError('Funcionalidad de guardado en desarrollo');
        } catch (err) {
            console.error('Error al guardar horarios:', err);
            showError('No se pudieron guardar los cambios');
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">{editingSchedule ? 'Editar Horario' : 'Modificar Horarios del Evento'}</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {editingSchedule ? 'Modifica los detalles del horario seleccionado' : 'Agrega, edita o elimina los horarios disponibles para tu evento'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="p-6 overflow-y-auto flex-1">
                    {editingSchedule ? (
                        /* Formulario de edición individual */
                        <div className="space-y-6">
                            {/* Mostrar info del horario a editar */}
                            <div className="border rounded-lg p-4 flex items-center gap-4 bg-blue-50">
                                {/* Date Badge */}
                                <div className="w-14 h-14 bg-blue-100 rounded-md flex flex-col items-center justify-center text-blue-600 shrink-0">
                                    <div className="text-lg font-semibold">{new Date(editingSchedule.fecha).getDate()}</div>
                                    <div className="text-xs">{new Date(editingSchedule.fecha).toLocaleDateString('es-PE', { month: 'short' })}</div>
                                </div>

                                {/* Schedule Info */}
                                <div className="flex-1">
                                    <div>
                                        <label className="text-xs text-gray-600">Horario Actual</label>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="w-4 h-4 text-gray-600" />
                                            <span>{editingSchedule.horaInicio} - {editingSchedule.horaFin}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                                <input
                                    type="date"
                                    value={editingSchedule.fecha}
                                    onChange={(e) => setEditingSchedule({ ...editingSchedule, fecha: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Hora de Inicio</label>
                                    <input
                                        type="time"
                                        value={editingSchedule.horaInicio}
                                        onChange={(e) => setEditingSchedule({ ...editingSchedule, horaInicio: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Hora de Fin</label>
                                    <input
                                        type="time"
                                        value={editingSchedule.horaFin}
                                        onChange={(e) => setEditingSchedule({ ...editingSchedule, horaFin: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <Button
                                    onClick={handleCancelEdit}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Cancelar Edición
                                </Button>
                                <Button
                                    onClick={handleSaveEdit}
                                    className="flex-1 bg-yellow-400 text-black hover:bg-yellow-500"
                                >
                                    Guardar Cambios
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* Vista de lista de horarios */
                        <>
                            {/* Lista de horarios existentes */}
                            <div className="space-y-4 mb-6">
                                {schedules.map((schedule, index) => {
                                    const start = new Date(schedule.fecha_inicio);
                                    const end = new Date(schedule.fecha_fin);
                                    const day = start.getDate();
                                    const month = start.toLocaleDateString('es-PE', { month: 'short' });

                                    return (
                                        <div key={schedule.id || `new-${index}`} className="border rounded-lg p-4 flex items-center gap-4">
                                            {/* Date Badge */}
                                            <div className="w-14 h-14 bg-blue-50 rounded-md flex flex-col items-center justify-center text-blue-600 shrink-0">
                                                <div className="text-lg font-semibold">{day}</div>
                                                <div className="text-xs">{month}</div>
                                            </div>

                                            {/* Schedule Info */}
                                            <div className="flex-1 grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs text-gray-600">Horario</label>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Clock className="w-4 h-4 text-gray-600" />
                                                        <span>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-600">Capacidad</label>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Users className="w-4 h-4 text-gray-600" />
                                                        <span>{schedule.capacidad_maxima} ({schedule.aforo_disponible || schedule.capacidad_maxima} disponibles)</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleEditClick(schedule)}
                                                    className="p-2 hover:bg-gray-100 rounded-md"
                                                    title="Editar horario"
                                                >
                                                    <Edit2 className="w-4 h-4 text-gray-600" />
                                                </button>
                                                <button 
                                                    onClick={() => schedule.id && handleDeleteSchedule(schedule.id)}
                                                    className="p-2 hover:bg-red-50 rounded-md"
                                                    title="Eliminar horario"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Agregar nuevo horario */}
                            <div className="border-t pt-6">
                                <h3 className="font-medium mb-4">Agregar Nuevo Horario</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Fecha</label>
                                        <input
                                            type="date"
                                            value={newSchedule.fecha}
                                            onChange={(e) => setNewSchedule({ ...newSchedule, fecha: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-md"
                                            placeholder="dd/mm/aaaa"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Hora de Inicio</label>
                                            <input
                                                type="time"
                                                value={newSchedule.horaInicio}
                                                onChange={(e) => setNewSchedule({ ...newSchedule, horaInicio: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Hora de Fin</label>
                                            <input
                                                type="time"
                                                value={newSchedule.horaFin}
                                                onChange={(e) => setNewSchedule({ ...newSchedule, horaFin: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-md"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleAddSchedule}
                                        className="mt-4 bg-yellow-400 text-black hover:bg-yellow-500"
                                    >
                                        Agregar Horario
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer - Solo mostrar cuando no estamos editando */}
                {!editingSchedule && (
                    <div className="p-6 border-t flex items-center justify-end gap-3">
                        <Button onClick={onClose} variant="outline">
                            Cerrar
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
