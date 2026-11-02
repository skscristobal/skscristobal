from fastapi import Depends
from sqlalchemy.orm import Session
from pymongo.database import Database

# Importamos los getters de conexión
from database.database import get_db as get_sqlite_db
from database.database_mongo import get_mongo_db

# Importamos las implementaciones ESPECÍFICAS que usaremos

# Grupo SQL
from repositorios.repositorio_empleado import BaseEmpleadoRepository, SQLiteEmpleadoRepository
from repositorios.repositorio_proveedor import BaseProveedorRepository, SQLiteProveedorRepository

# Grupo Mongo
from repositorios.repositorio_producto import BaseProductoRepository, MongoProductoRepository
from repositorios.repositorio_factura import BaseFacturaRepository, MongoFacturaRepository
from repositorios.repositorio_venta import BaseVentaRepository, MongoVentaRepository
# 👇 AGREGAMOS LA IMPORTACIÓN DEL REPOSITORIO DE STOCK
from repositorios.repositorio_stock import BaseStockRepository, MongoStockRepository

# -----------------------------------------------------------------
# DEPENDENCIAS HÍBRIDAS
# Cada función devuelve el repositorio de la BD que le corresponde
# -----------------------------------------------------------------

# --- ENTIDADES SQL ---

def get_empleado_repository(db: Session = Depends(get_sqlite_db)) -> BaseEmpleadoRepository:
    return SQLiteEmpleadoRepository(db)

def get_proveedor_repository(db: Session = Depends(get_sqlite_db)) -> BaseProveedorRepository:
    return SQLiteProveedorRepository(db)


# --- ENTIDADES MONGO ---

def get_producto_repository(db: Database = Depends(get_mongo_db)) -> BaseProductoRepository:
    return MongoProductoRepository(db)

def get_factura_repository(db: Database = Depends(get_mongo_db)) -> BaseFacturaRepository:
    return MongoFacturaRepository(db)

def get_venta_repository(db: Database = Depends(get_mongo_db)) -> BaseVentaRepository:
    return MongoVentaRepository(db)

# 👇 AGREGAMOS LA FUNCIÓN QUE FALTABA
def get_stock_repository(db: Database = Depends(get_mongo_db)) -> BaseStockRepository:
    return MongoStockRepository(db)