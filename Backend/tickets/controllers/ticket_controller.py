"""
Compat shim (deprecated): keep compatibility for imports that reference
`tickets.controllers.ticket_controller`. Prefer using `TicketController` (PascalCase)
which contains the canonical DB CRUD functions.

This module re-exports the functions from the PascalCase controller so older
imports keep working while the codebase is moved to the PascalCase convention.
"""
from .TicketController import *  # re-export all CRUD helpers

__all__ = [name for name in dir() if not name.startswith("_")]
