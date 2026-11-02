from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from pymongo.database import Database
from pymongo import ReturnDocument
import models # Modelos de SQLAlchemy (para la implementación SQL)


# -----------------------------------------------------------------
# Los repositorios son los traductores, traduce la orden a mongo o sql dependiendo de la bd en la que nos encontramos
# -----------------------------------------------------------------

# -----------------------------------------------------------------
# 1. INTERFAZ (El "Contrato" Abstracto)
# Define qué funciones DEBEN existir en cualquier implementación.
# -----------------------------------------------------------------
class BaseProveedorRepository(ABC):
    """
    Clase base abstracta para el repositorio de Proveedores.
    Define los métodos obligatorios que deben implementar las clases concretas
    (para SQL, Mongo, etc.), asegurando una interfaz consistente.
    """

    @abstractmethod
    def get_all_proveedores(self):
        """
        Obtiene **todos** los proveedores registrados.
        """
        pass

    @abstractmethod
    def get_proveedor_by_id(self, id_proveedor: int):
        """
        Busca y retorna un **proveedor específico** por su `id_proveedor` numérico.

        ### Parámetros:
        - **`id_proveedor (int)`**: El ID numérico único del proveedor a buscar.
        """
        pass


    @abstractmethod
    def create_proveedor(self, data: dict):
        """
        Crea un **nuevo proveedor** en la base de datos.

        ### Parámetros:
        - **`data (dict)`**: Un diccionario con los datos del proveedor a crear
          (ej: `{'rut_proveedor': '...', 'correo': '...', ...}`).
          **No** incluye `id_proveedor` (se genera automáticamente).
          **En Mongo**, también inicializa `productos` y `facturas` como `[]`.
        """
        pass

    @abstractmethod
    def update_proveedor(self, id_proveedor: int, data: dict):
        """
        Actualiza los **datos principales** (correo, teléfono, etc.) de un proveedor existente.

        ### Parámetros:
        - **`id_proveedor (int)`**: El ID del proveedor a actualizar.
        - **`data (dict)`**: Un diccionario con los campos a actualizar
          (ej: `{'correo': 'nuevo@mail.com', 'telefono': '123'}`). **No** debe incluir `rut_proveedor`.
        """
        pass

    @abstractmethod
    def delete_proveedor(self, id_proveedor: int):
        """
        Elimina un **proveedor** de la base de datos por su `id_proveedor`.

        ### Parámetros:
        - **`id_proveedor (int)`**: El ID del proveedor a eliminar.
        """
        pass

    
    @abstractmethod
    def add_producto_anidado(self, id_proveedor: int, producto_data: dict):
        """
        [MONGO] Añade un **objeto producto** al array `productos` de un proveedor existente.
        """
        pass

    @abstractmethod
    def add_factura_anidada(self, id_proveedor: int, factura_data: dict):
        """
        [MONGO] Añade un **objeto factura** al array `facturas` de un proveedor existente.
        """
        pass

# -----------------------------------------------------------------
# 2. IMPLEMENTACIÓN CON SQLITE (SQLAlchemy) 
# -----------------------------------------------------------------
class SQLiteProveedorRepository(BaseProveedorRepository):
    def __init__(self, db: Session):
        """
        Inicializa el repositorio con una **sesión de SQLAlchemy**.

        ### Parámetros:
        - **`db (Session)`**: La sesión de base de datos inyectada por FastAPI.
        """
        self.db = db

    def get_all_proveedores(self):
        """
        Obtiene todos los proveedores usando `db.query`.

        ### Retorna:
        - **`List[models.Proveedor]`**: Lista de objetos Proveedor de SQLAlchemy.
        """
        return self.db.query(models.Proveedor).all()

    def get_proveedor_by_id(self, id_proveedor: int):
        """
        Busca un proveedor por su `id_proveedor` (PK en SQL).

        ### Retorna:
        - **`models.Proveedor | None`**: El objeto Proveedor si se encuentra, o `None`.
        """
        return self.db.query(models.Proveedor).filter(models.Proveedor.id_proveedor == id_proveedor).first()

    def create_proveedor(self, data: dict):
        """
        Crea un nuevo registro en la tabla `Proveedor`.
        SQLAlchemy maneja el autoincremento del `id_proveedor` y la unicidad de `rut_proveedor`.

        ### Retorna:
        - **`models.Proveedor`**: El objeto Proveedor recién creado.
        ### Lanza:
        - **`IntegrityError`**: Si `rut_proveedor` ya existe o si hay violación de FK.
        """

        nuevo_proveedor = models.Proveedor(**data)
        self.db.add(nuevo_proveedor)
        self.db.commit()
        self.db.refresh(nuevo_proveedor)
        return nuevo_proveedor

    def update_proveedor(self, id_proveedor: int, data: dict):
        """
        Busca un proveedor por ID y actualiza sus campos (excluyendo `id_proveedor` y `rut_proveedor`).

        ### Retorna:
        - **`models.Proveedor | None`**: El objeto Proveedor actualizado si se encontró, o `None`.
        """
        proveedor = self.get_proveedor_by_id(id_proveedor)
        if not proveedor:
            return None 

        proveedor.rut_proveedor = data["rut_proveedor"] 
        proveedor.correo = data["correo"]
        proveedor.telefono = data["telefono"]
        proveedor.direccion = data["direccion"]
        proveedor.nombre_empresa = data["nombre_empresa"]
  

        self.db.commit()
        self.db.refresh(proveedor)
        return proveedor

    def delete_proveedor(self, id_proveedor: int):
        """
        Busca un proveedor por ID y lo elimina.

        ### Retorna:
        - **`bool`**: `True` si se eliminó correctamente, `False` si no se encontró.
        ### Lanza:
        - **`IntegrityError`**: Si hay violación de FK (ej. facturas asociadas) y no hay `cascade`.
        """
        proveedor = self.get_proveedor_by_id(id_proveedor)
        if not proveedor:
            return False 

        self.db.delete(proveedor)
        self.db.commit()
        return True 

    
    def add_producto_anidado(self, id_proveedor: int, producto_data: dict):
        """Función no aplicable al modelo relacional."""
        raise NotImplementedError("Esta función solo es para Mongo (datos anidados)")

    def add_factura_anidada(self, id_proveedor: int, factura_data: dict):
        """Función no aplicable al modelo relacional."""
        raise NotImplementedError("Esta función solo es para Mongo (datos anidados)")

