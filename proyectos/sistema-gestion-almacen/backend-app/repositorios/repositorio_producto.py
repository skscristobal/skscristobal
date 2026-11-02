from abc import ABC, abstractmethod
from pymongo.database import Database
from pymongo import ReturnDocument
import models
from servicios import eliminar_imagen_cloudinary

# -----------------------------------------------------------------
# 1. INTERFAZ
# -----------------------------------------------------------------
class BaseProductoRepository(ABC):
    @abstractmethod
    def get_all_productos(self): pass
    @abstractmethod
    def get_producto_by_sku(self, sku: int): pass
    @abstractmethod
    def create_producto(self, data: dict): pass
    @abstractmethod
    def update_stock(self, sku: int, nuevo_stock: int): pass
    @abstractmethod
    def update_precio(self, sku: int, nuevo_precio: int): pass
    # 👇 NUEVO MÉTODO PARA EDITAR TODO
    @abstractmethod
    def update_producto(self, sku: int, data: dict): pass
    @abstractmethod
    def delete_producto(self, sku: int): pass
    @abstractmethod
    def delete_all_productos(self): pass

# -----------------------------------------------------------------
# 2. IMPLEMENTACIÓN MONGO
# -----------------------------------------------------------------
class MongoProductoRepository(BaseProductoRepository):
    def __init__(self, db: Database):
        self.collection = db["productos"]
        try:
            self.collection.create_index("sku", unique=True)
        except Exception as e:
            print(f"Aviso Mongo: {e}")

    def get_all_productos(self):
        cursor = self.collection.find({}, {"_id": 0})
        return list(cursor)

    def get_producto_by_sku(self, sku: int):
        return self.collection.find_one({"sku": sku}, {"_id": 0})

    def create_producto(self, data: dict):
        if self.get_producto_by_sku(data["sku"]):
            raise Exception("Conflicto: El SKU ya existe.")
        result = self.collection.insert_one(data)
        return self.collection.find_one({"_id": result.inserted_id}, {"_id": 0})

    def update_stock(self, sku: int, nuevo_stock: int):
        return self.collection.find_one_and_update(
            {"sku": sku}, {"$set": {"stock": nuevo_stock}},
            return_document=ReturnDocument.AFTER, projection={"_id": 0}
        )

    def update_precio(self, sku: int, nuevo_precio: int):
        return self.collection.find_one_and_update(
            {"sku": sku}, {"$set": {"precio": nuevo_precio}},
            return_document=ReturnDocument.AFTER, projection={"_id": 0}
        )

    def update_producto(self, sku: int, data: dict):
        # 1. Antes de actualizar, buscamos el producto actual para ver si tenía foto
        producto_actual = self.get_producto_by_sku(sku)
        
        if producto_actual:
            url_vieja = producto_actual.get("imagen")
            url_nueva = data.get("imagen")

            # 2. Lógica de limpieza:
            # Si existía una imagen vieja Y estamos enviando una imagen nueva distinta...
            if url_vieja and url_nueva and url_vieja != url_nueva:
                print(f"🔄 Cambio de imagen detectado. Borrando anterior: {url_vieja}")
                eliminar_imagen_cloudinary(url_vieja)

        # 3. Procedemos con la actualización normal
        return self.collection.find_one_and_update(
            {"sku": sku}, 
            {"$set": data}, 
            return_document=ReturnDocument.AFTER, 
            projection={"_id": 0}
        )

    def delete_producto(self, sku: int):
        result = self.collection.delete_one({"sku": sku})
        return result.deleted_count > 0

    def delete_all_productos(self):
        result = self.collection.delete_many({})
        return result.deleted_count
    
    def delete_producto(self, sku: int):
        # 1. Buscar el producto primero para obtener la URL de la imagen
        producto = self.get_producto_by_sku(sku)
        
        if producto:
            url_imagen = producto.get("imagen")
            
            # 2. Si tiene imagen, intentamos borrarla de la nube
            if url_imagen:
                eliminar_imagen_cloudinary(url_imagen)

        # 3. Proceder a eliminar el registro de la BD
        result = self.collection.delete_one({"sku": sku})
        return result.deleted_count > 0