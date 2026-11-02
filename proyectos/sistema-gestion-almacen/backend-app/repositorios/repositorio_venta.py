from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from pymongo.database import Database
from pymongo import ReturnDocument
import models # Modelos de SQLAlchemy (para la implementación SQL)
from sqlalchemy import desc, asc, func # Para ordenar y sumar en SQL

# -----------------------------------------------------------------
# Los repositorios son los traductores, traduce la orden a mongo o sql dependiendo de la bd en la que nos encontramos
# -----------------------------------------------------------------

# -----------------------------------------------------------------
# 1. INTERFAZ 
# -----------------------------------------------------------------
class BaseVentaRepository(ABC):
    """
    Clase base abstracta para el repositorio de Ventas.
    Define los métodos obligatorios para interactuar con los datos de ventas,
    independientemente de la base de datos subyacente (SQL o Mongo).
    """

    @abstractmethod
    def get_all_ventas(self):
        """
        Obtiene **todas** las ventas registradas.
        """
        pass

    @abstractmethod
    def get_venta_by_id(self, id_venta: int):
        """
        Busca y retorna una **venta específica** por su `id_venta` numérico.

        ### Parámetros:
        - **`id_venta (int)`**: El ID numérico único de la venta a buscar.
        """
        pass

    @abstractmethod
    def create_venta(self, data: dict):
        """
        Crea una **nueva venta** en la base de datos.

        ### Parámetros:
        - **`data (dict)`**: Diccionario con los datos básicos de la venta (`id_empleado`, `rut_cliente`, `total_venta`, `fecha_venta`, `metodo_de_pago`).
          - **Modo SQL**: Espera que `rut_cliente` exista en la tabla Cliente.
          - **Modo Mongo**: Guarda la venta sin el objeto `cliente` completo inicialmente.
        """
        pass

    @abstractmethod
    def delete_venta(self, id_venta: int):
        """
        Elimina una **venta** de la base de datos por su `id_venta`.

        ### Parámetros:
        - **`id_venta (int)`**: El ID de la venta a eliminar.
        """
        pass

    # --- Funciones de JOIN y Agregación ---

    @abstractmethod
    def get_ventas_cajeros(self):
        """
        Obtiene las ventas realizadas **solo por empleados con rol 'cajero'**.
        Incluye datos básicos de la venta y el nombre del cajero.
        """
        pass

    @abstractmethod
    def get_ventas_detalle(self):
        """
        Obtiene un **detalle** de todas las ventas, incluyendo el nombre del **empleado**
        y el nombre del **cliente** asociados.
        """
        pass

    @abstractmethod
    def get_ventas_clientes_empleados(self):
        """
        Obtiene una lista completa de ventas con el **nombre del cliente**,
        **nombre del empleado** y el **total** de cada venta.
        """
        pass

    @abstractmethod
    def get_ventas_ordenadas(self, orden: str = "desc"):
        """
        Obtiene todas las ventas **ordenadas por fecha**.

        ### Parámetros:
        - **`orden (str)`**: 'asc' para ascendente (más antiguas primero),
                           'desc' para descendente (más recientes primero). Por defecto 'desc'.
        """
        pass

    @abstractmethod
    def get_ventas_por_fecha(self, fecha: str):
        """
        Obtiene todas las ventas de una **fecha específica** y calcula el **total vendido** ese día.

        ### Parámetros:
        - **`fecha (str)`**: La fecha a consultar (formato YYYY-MM-DD).
        """
        pass

    # --- Función específica para asignar cliente anidado (Mongo) ---
    @abstractmethod
    def assign_cliente_to_venta(self, id_venta: int, cliente_data: dict):
        """
        **[MONGO]** Asigna o actualiza el **objeto cliente anidado** dentro de una venta existente.

        ### Parámetros:
        - **`id_venta (int)`**: El ID de la venta a modificar.
        - **`cliente_data (dict)`**: Diccionario con los datos completos del cliente a asignar/actualizar.
        """
        pass




# -----------------------------------------------------------------
# 3. IMPLEMENTACIÓN CON MONGO (PyMongo)
# Opera sobre documentos JSON en la colección `ventas`.
# -----------------------------------------------------------------
class MongoVentaRepository(BaseVentaRepository):
    def __init__(self, db: Database):
        """
        Inicializa el repositorio con la **conexión de PyMongo**.
        Asegura que exista un **índice único** en `id_venta`.

        ### Parámetros:
        - **`db (Database)`**: La conexión a la base de datos MongoDB inyectada.
        """
        self.collection = db["ventas"]
        self.counters = db["counters"]
        self.db = db
        try:
            self.collection.create_index("id_venta", unique=True)
            print("Índice único en 'id_venta' asegurado.")
        except Exception as e:
            print(f"Aviso: No se pudo crear/verificar índice único en 'id_venta': {e}")

    def _get_next_id_venta(self):
        """
        (Helper Interno) Simula **autoincremento** para `id_venta` usando `counters`.

        ### Retorna:
        - **`int`**: El siguiente ID numérico disponible.
        """
        result = self.counters.find_one_and_update(
            {"_id": "venta_id"}, {"$inc": {"seq": 1}},
            upsert=True, return_document=ReturnDocument.AFTER
        )
        return result["seq"]

    def get_all_ventas(self):
        """
        Obtiene todos los documentos de `ventas`, **excluyendo** `_id`.

        ### Retorna:
        - **`List[dict]`**: Lista de diccionarios (ventas).
        """
        cursor = self.collection.find({}, {"_id": 0})
        return list(cursor)

    def get_venta_by_id(self, id_venta: int):
        """
        Busca un documento por `id_venta` numérico, **excluyendo** `_id`.

        ### Retorna:
        - **`dict | None`**: El diccionario de la venta si se encuentra, o `None`.
        """
        venta = self.collection.find_one({"id_venta": id_venta}, {"_id": 0})
        return venta

    def create_venta(self, data: dict):
        """
        Crea un nuevo documento de venta solo con sus datos básicos.
        Genera el `id_venta` usando el contador.
        **NO** guarda `rut_cliente` inicialmente. El objeto 'cliente' completo
        se añadirá después con 'assign_cliente_to_venta'.

        ### Retorna:
        - **`dict`**: El diccionario de la venta creada (sin `_id`, sin `rut_cliente`, sin objeto `cliente`).
        ### Lanza:
        - **`pymongo.errors.DuplicateKeyError`**: Si `id_venta` ya existe.
        """
        data["id_venta"] = self._get_next_id_venta()
        # --- ¡CAMBIO AQUÍ! ---
        # Aseguramos que solo los campos básicos de Venta se guarden
        data_mongo = {
            "id_venta": data["id_venta"],
            "id_empleado": data["id_empleado"],
            # "rut_cliente": data["rut_cliente"], # <-- ELIMINADO de la inserción inicial
            "total_venta": data["total_venta"],
            "fecha_venta": data["fecha_venta"],
            "metodo_de_pago": data["metodo_de_pago"],
            # No incluimos el campo "cliente" aquí tampoco
        }
        # --- FIN DEL CAMBIO ---
        result = self.collection.insert_one(data_mongo)

        # Busca y devuelve el documento recién insertado (sin _id)
        documento_creado = self.collection.find_one(
            {"_id": result.inserted_id},
            {"_id": 0}
        )
        return documento_creado

    def delete_venta(self, id_venta: int):
        """
        Busca una venta por `id_venta` y la elimina.

        ### Retorna:
        - **`bool`**: `True` si se eliminó, `False` si no se encontró.
        """
        result = self.collection.delete_one({"id_venta": id_venta})
        return result.deleted_count > 0

    # --- Implementación de JOINs ($lookup) y Agregación (Mongo) ---
    def get_ventas_cajeros(self):
        """Usa `$lookup` a `empleados` y filtra por rol."""
        pipeline = [
            {"$lookup": {"from": "empleados", "localField": "id_empleado",
                          "foreignField": "id_empleado", "as": "empleado_info"}},
            {"$unwind": "$empleado_info"},
            {"$match": {"empleado_info.rol": "cajero"}},
            {"$project": {"_id": 0, "id_venta": 1, "fecha_venta": 1,
                          "total_venta": 1, "cajero": "$empleado_info.nombre"}}
        ]
        return list(self.collection.aggregate(pipeline))

    def get_ventas_detalle(self):
        """Usa `$lookup` a `empleados`, accede a `cliente` anidado (si existe)."""
        pipeline = [
            {"$lookup": {"from": "empleados", "localField": "id_empleado",
                          "foreignField": "id_empleado", "as": "empleado_info"}},
            {"$unwind": "$empleado_info"},
            {"$project": {
                "_id": 0, "id_venta": 1, "empleado": "$empleado_info.nombre",
                # Accede al campo anidado 'cliente', si no existe devuelve null/None
                "cliente": {"$ifNull": ["$cliente.nombre_completo", None]}
             }}
        ]
        return list(self.collection.aggregate(pipeline))

    def get_ventas_clientes_empleados(self):
        """Usa `$lookup` a `empleados`, accede a `cliente` anidado (si existe)."""
        pipeline = [
            {"$lookup": {"from": "empleados", "localField": "id_empleado",
                          "foreignField": "id_empleado", "as": "empleado_info"}},
            {"$unwind": "$empleado_info"},
            {"$project": {
                "_id": 0, "id_venta": 1,
                "cliente": {"$ifNull": ["$cliente.nombre_completo", None]}, # Campo anidado
                "empleado": "$empleado_info.nombre",
                "total_venta": 1
             }}
        ]
        return list(self.collection.aggregate(pipeline))

    def get_ventas_ordenadas(self, orden: str = "desc"):
        """Obtiene ventas ordenadas por fecha, **excluyendo** `_id`."""
        sort_order = 1 if orden.lower() == "asc" else -1
        cursor = self.collection.find({}, {"_id": 0}).sort("fecha_venta", sort_order)
        return list(cursor)

    def get_ventas_por_fecha(self, fecha: str):
        """
        Busca ventas ignorando la hora exacta usando Regex.
        """
        # Filtro: Que el campo fecha_venta EMPIECE con 'YYYY-MM-DD'
        query = {"fecha_venta": {"$regex": f"^{fecha}"}}

        # 1. Obtener las ventas (Lista)
        ventas = list(self.collection.find(query, {"_id": 0}))

        # 2. Calcular el total (Agregación)
        pipeline = [
            {"$match": query}, # Usamos el mismo filtro Regex
            {"$group": {"_id": None, "total": {"$sum": "$total_venta"}}}
        ]
        total_res = list(self.collection.aggregate(pipeline))
        total_dia = total_res[0]["total"] if total_res else 0

        return {"ventas": ventas, "total_dia": total_dia}

    def assign_cliente_to_venta(self, id_venta: int, cliente_data: dict):
        update_result = self.collection.update_one(
            {"id_venta": id_venta},
            {"$set": {"cliente": cliente_data}}
        )
        if update_result.matched_count == 0:
            return None 
        return self.get_venta_by_id(id_venta)