# repositorios/repositorio_stock.py

from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from pymongo.database import Database
from pymongo import ReturnDocument, DESCENDING
import models 
from datetime import datetime

# --- 1. INTERFAZ (Sin cambios) ---
class BaseStockRepository(ABC):
    
    @abstractmethod
    def create_movimiento(self, data: dict):
        pass

    @abstractmethod
    def get_historial_por_sku(self, sku: int):
        pass

# --- 2. IMPLEMENTACIÓN CON SQLITE (¡MODIFICADA!) ---
class SQLiteStockRepository(BaseStockRepository):
    def __init__(self, db: Session):
        self.db = db

    def _convert_to_dict(self, mov_obj):
        """Helper para convertir un objeto StockMovimiento a un dict."""
        if not mov_obj:
            return None
        return {
            "id_movimiento": mov_obj.id_movimiento,
            "sku": mov_obj.sku,
            "fecha": mov_obj.fecha.isoformat(), # Convertimos datetime a string
            "tipo": mov_obj.tipo,
            "cantidad": mov_obj.cantidad,
            "motivo": mov_obj.motivo,
            "stock_resultante": mov_obj.stock_resultante
        }

    def create_movimiento(self, data: dict):
        # 'fecha' se añade automáticamente por 'server_default' en el modelo
        nuevo_movimiento = models.StockMovimiento(
            sku=data["sku"],
            tipo=data["tipo"],
            cantidad=data["cantidad"],
            motivo=data["motivo"],
            stock_resultante=data["stock_resultante"]
        )
        self.db.add(nuevo_movimiento)
        self.db.commit()
        self.db.refresh(nuevo_movimiento)
        # Convertimos el objeto a un dict
        return self._convert_to_dict(nuevo_movimiento)

    def get_historial_por_sku(self, sku: int):
        movimientos_obj = (
            self.db.query(models.StockMovimiento)
            .filter(models.StockMovimiento.sku == sku)
            .order_by(models.StockMovimiento.fecha.desc())
            .all()
        )
        # Convertimos cada objeto a un dict
        return [self._convert_to_dict(m) for m in movimientos_obj]

# --- 3. IMPLEMENTACIÓN CON MONGO (Sin cambios) ---
class MongoStockRepository(BaseStockRepository):
    def __init__(self, db: Database):
        self.collection = db["stock_movimientos"] 
        self.counters = db["counters"]
        self.collection.create_index("sku") 
        self.collection.create_index([("fecha", DESCENDING)])

    def _get_next_id_movimiento(self):
        result = self.counters.find_one_and_update(
            {"_id": "movimiento_id"}, {"$inc": {"seq": 1}},
            upsert=True, return_document=ReturnDocument.AFTER
        )
        return result["seq"]

    def create_movimiento(self, data: dict):
        data["id_movimiento"] = self._get_next_id_movimiento()
        data["fecha"] = datetime.now().isoformat() 
        
        result = self.collection.insert_one(data)
        documento_creado = self.collection.find_one(
            {"_id": result.inserted_id},
            {"_id": 0}
        )
        return documento_creado

    def get_historial_por_sku(self, sku: int):
        cursor = (
            self.collection.find({"sku": sku}, {"_id": 0})
            .sort("fecha", DESCENDING)
        )
        return list(cursor)