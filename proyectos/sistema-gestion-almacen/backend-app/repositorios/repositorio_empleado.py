from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from models.Empleado import Empleado 

# -----------------------------------------------------------------
# 1. INTERFAZ 
# -----------------------------------------------------------------
class BaseEmpleadoRepository(ABC):
    @abstractmethod
    def get_all_empleados(self): pass
    @abstractmethod
    def get_empleado_by_id(self, id_empleado: int): pass
    @abstractmethod
    def create_empleado(self, data: dict): pass
    @abstractmethod
    def update_empleado(self, id_empleado: int, data: dict): pass
    @abstractmethod
    def delete_empleado(self, id_empleado: int): pass
    @abstractmethod
    def get_by_usuario(self, usuario: str): pass

# -----------------------------------------------------------------
# 2. IMPLEMENTACIÓN CON SQLITE
# -----------------------------------------------------------------
class SQLiteEmpleadoRepository(BaseEmpleadoRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_all_empleados(self):
        return self.db.query(Empleado).all()

    def get_empleado_by_id(self, id_empleado: int):
        return self.db.query(Empleado).filter(Empleado.id_empleado == id_empleado).first()

    def create_empleado(self, data: dict):
        """
        Guarda el empleado en la base de datos.
        Asume que la contraseña ya viene encriptada dentro de 'data'.
        """
        nuevo_empleado = Empleado(**data)

        self.db.add(nuevo_empleado)
        self.db.commit()
        self.db.refresh(nuevo_empleado)
        
        return nuevo_empleado

    def update_empleado(self, id_empleado: int, data: dict):
        empleado = self.get_empleado_by_id(id_empleado)
        if not empleado: return None
        
        for key, value in data.items():
            setattr(empleado, key, value)

        self.db.commit()
        self.db.refresh(empleado)
        return empleado

    def delete_empleado(self, id_empleado: int):
        empleado = self.get_empleado_by_id(id_empleado)
        if not empleado: return False 
        
        self.db.delete(empleado)
        self.db.commit()
        return True 

    def get_by_usuario(self, usuario: str):
        # Busca el empleado por nombre de usuario (usado en el Login)
        return self.db.query(Empleado).filter(Empleado.usuario == usuario).first()
    
    def login(self, usuario: str, contrasena: str):
        # Método legacy (no se usa con la nueva seguridad en el Router), 
        # se mantiene vacío para cumplir con la interfaz abstracta si es necesario.
        pass