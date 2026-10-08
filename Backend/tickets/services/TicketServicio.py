# Compatibility shim: Spanish-named re-export
from .TicketService import *

__all__ = [name for name in dir() if not name.startswith("_")]