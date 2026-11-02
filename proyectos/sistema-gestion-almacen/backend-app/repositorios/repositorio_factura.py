# En: repositories/factura_repository.py

from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from pymongo.database import Database
from pymongo import ReturnDocument
import models

# -----------------------------------------------------------------
# 1. INTERFAZ
# -----------------------------------------------------------------
class BaseFacturaRepository(ABC):
    @abstractmethod
    def get_all_facturas(self): pass
    @abstractmethod
    def get_factura_by_id(self, id_factura: int): pass
    @abstractmethod
    def create_factura(self, data: dict): pass
    # ... (update, delete si los necesitas) ...

# -----------------------------------------------------------------
# 2. IMPLEMENTACIÓN MONGO (La Principal)
# -----------------------------------------------------------------
class MongoFacturaRepository(BaseFacturaRepository):
    def __init__(self, db: Database):
        self.collection = db["facturas"] # Colección independiente
        self.counters = db["counters"]
        try:
            self.collection.create_index("id_factura", unique=True)
            print("Índice único en 'id_factura' asegurado (Mongo).")
        except Exception as e:
            print(f"Aviso Mongo: {e}")

    def _get_next_id_factura(self):
        result = self.counters.find_one_and_update(
            {"_id": "factura_id"}, {"$inc": {"seq": 1}},
            upsert=True, return_document=ReturnDocument.AFTER
        )
        return result.get("seq", 1)

    def get_all_facturas(self):
        cursor = self.collection.find({}, {"_id": 0})
        return list(cursor)

    def get_factura_by_id(self, id_factura: int):
        return self.collection.find_one({"id_factura": id_factura}, {"_id": 0})

    def create_factura(self, data: dict):
        # Genera ID propio
        data["id_factura"] = self._get_next_id_factura()
        
        result = self.collection.insert_one(data)
        return self.collection.find_one({"_id": result.inserted_id}, {"_id": 0})

