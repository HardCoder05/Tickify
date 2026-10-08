from fastapi import APIRouter

from compras.routes.Compras import router as compras_router
from events.routes.Eventos import router as eventos_router
from tickets.routes.Tickets import router as tickets_router
from users.routes.Login import login_router
from users.routes.Usuarios import router as usuarios_router

router = APIRouter()

router.include_router(login_router)
router.include_router(tickets_router)
router.include_router(compras_router)