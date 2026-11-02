from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

# =========================
#  ENTIDAD: Proveedor
# =========================

class Proveedor(Base):
    __tablename__ = "Proveedor"

    id_proveedor = Column(Integer, primary_key=True, autoincrement=True)  # PK
    id_empleado = Column(Integer, ForeignKey("Empleado.id_empleado"))  # FK → Empleado
    rut_proveedor = Column(String)
    correo = Column(String)
    telefono = Column(String)
    direccion = Column(String)
    nombre_empresa = Column(String)
    
    
    empleado = relationship("Empleado", back_populates="proveedores")