"""Deprecated: compra_service was moved to `compras.services.compra_service`.

This module kept here previously during refactor. The canonical implementation
is at `compras.services.compra_service`. Keep using that module; this file is
left as a no-op placeholder to avoid accidental imports bringing business
logic into the `tickets` package.
"""

from warnings import warn

warn("tickets.services.compra_service is deprecated; use compras.services.compra_service instead", DeprecationWarning)
