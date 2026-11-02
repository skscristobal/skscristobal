from database import Base

from .Empleado import Empleado
from .Proveedor import Proveedor


# Opcional: define __all__ para controlar 'from models import *'
__all__ = [
    "Base",
    "Empleado",
    "Proveedor",
]