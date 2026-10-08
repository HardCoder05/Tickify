import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Dropdown from "@/components/ui/dropdown";
import { cn } from "@/lib/utils"

interface TypeSelectorProps {
  className?: string
  initialTipo?: string
  nombre: string
  descripcion: string
  onTipoChange?: (tipo: string) => void
}

export default function TypeSelector({className, nombre, descripcion, initialTipo, onTipoChange }: TypeSelectorProps) {
  const [tipo, setTipo] = useState(initialTipo) // primera opción seleccionada
  const navigate = useNavigate()

  const handleChange = (value: string) => {
    setTipo(value)

    // Si el padre provee un callback, lo usamos para controlar el tipo
    if (onTipoChange) {
      onTipoChange(value)
      return
    }

    // Redirige según la opción seleccionada (comportamiento antiguo)
    switch (value) {
      case "Evento único":
        navigate("/organizerEvent/createEvent",  { state: { nombre, descripcion } })
        break
      case "Evento recurrente":
        navigate("/organizerEvent/createCurrentEvent",  { state: { nombre, descripcion }} )
        break
      default:
        break
    }
  }

  return (
    <div className="max-w-xs">
      <Dropdown
        options={["Evento único", "Evento recurrente"]}
        value={tipo}
        onChange={handleChange}
        className={className}
      />
    </div>
  )
}
