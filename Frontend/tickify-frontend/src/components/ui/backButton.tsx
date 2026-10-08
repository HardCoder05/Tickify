import { useNavigate } from "react-router-dom"
import { ChevronLeft  } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BackButtonProps {
  to?: string // ruta opcional
}

export default function BackButton({ to }: BackButtonProps) {
  const navigate = useNavigate()
    const handleClick = () => {
    if (to) {
      navigate(to) // navega a la ruta indicada
    } else {
      navigate(-1) // vuelve a la página anterior
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="flex items-center border-0 "
      onClick={handleClick} // vuelve a la página anterior
    >
      <ChevronLeft  size={16} />
      Volver
    </Button>
  )
}
