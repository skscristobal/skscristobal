from pymongo import MongoClient
from pymongo.server_api import ServerApi
import os

# -----------------------------------------------------------------
# 1. CONFIGURACIÓN
# -----------------------------------------------------------------
from dotenv import load_dotenv
load_dotenv()

# La URI de conexión se lee desde la variable de entorno MONGO_DB_URL (ver .env.example)
uri = os.environ.get("MONGO_DB_URL")

# Nombre de la base de datos principal
DB_NAME = "elVecino"

# -----------------------------------------------------------------
# 2. INICIALIZACIÓN DEL CLIENTE
# -----------------------------------------------------------------
client = None
db = None

try:
    # Conexión moderna con ServerApi
    client = MongoClient(uri, server_api=ServerApi('1'))
    
    # Verificación rápida 
    client.admin.command('ping')
    print(f"✅ Conectado a MongoDB Atlas (Base: {DB_NAME})")

    # Selección de Base de Datos
    db = client[DB_NAME]
    

except Exception as e:
    print(f"❌ Error fatal al conectar a MongoDB: {e}")
    client = None
    db = None

# -----------------------------------------------------------------
# 3. DEPENDENCIA (Dependency Injection)
# -----------------------------------------------------------------
def get_mongo_db():
    """
    Retorna la instancia de la base de datos MongoDB.
    Lanza error si la conexión no se estableció al inicio.
    """
    if db is None:
        raise ConnectionError("La conexión a MongoDB no está disponible.")
    return db