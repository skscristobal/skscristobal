from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from database.database import Base

# =========================
#  ENTIDAD: Empleado
# =========================

class Empleado(Base):
    __tablename__ = "Empleado"

    id_empleado = Column(Integer, primary_key=True, autoincrement=True) # PK
    nombre = Column(String)
    rut_empleado = Column(String, unique=True) # Único por persona
    telefono = Column(String)
    correo = Column(String)
    direccion = Column(String)
    fecha_de_ingreso = Column(String)
    
    # Datos de acceso y Rol
    rol = Column(String) # 'cajero' o 'administrador'
    usuario = Column(String, unique=True) # <--- IMPORTANTE: Debe ser único para el login
    contrasena = Column(String)


    # 1. Un Empleado gestiona muchos Proveedores
    proveedores = relationship("Proveedor", back_populates="empleado")

 