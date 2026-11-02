from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware 
from database.database import engine, Base 
from database import database_mongo 
import models 
import os
import uvicorn
from servicios import obtener_url_firmada 

from routers import (
    empleados, proveedores, productos, ventas, 
    facturas, reporte, stock, upload 
)

app = FastAPI(title="El vecino-Backend (Híbrido)")

URL_DEL_FRONTEND = "https://proyecto-almacen-ici324-frontend.onrender.com"

# CORS
origins = [
    "http://localhost:4321",
    "http://127.0.0.1:4321",
    "*"  # <--- AÑADE ESTO (Permite acceso desde cualquier lugar)
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# --- EVENTO DE ARRANQUE ---
@app.on_event("startup")
async def startup_event():
    print("🚀 Iniciando Sistema Híbrido (SQL + Mongo)")
    
    # 1. Iniciar SQL
    print("🛠️  Verificando tablas SQL...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas SQL listas.")

    # 2. Iniciar Mongo
    print("🛠️  Conectando a Mongo...")
    if database_mongo.db is None:
        print("❌ FATAL: No se pudo conectar a MongoDB.")
    else:
        print("✅ Conexión Mongo exitosa.")

# --- RUTAS BASE ---
@app.get("/")
def root():
    return {
        "info": "Backend Híbrido: SQL (Empleados/Prov) + Mongo (Productos/Ventas)",
        "status": "🟢 En línea"
    }

# ==========================================================
# 👁️ ENDPOINT: OBTENER LINK DE IMAGEN (CORREGIDO)
# ==========================================================
@app.get("/obtener-imagen/{nombre_archivo:path}", tags=["Utilidades"], summary="Obtener URL temporal de imagen")
def get_image_url(nombre_archivo: str):
    """
    Genera una URL temporal (firmada) para visualizar una imagen privada almacenada en S3.
    
    **Retorna:**
    * `200 OK`: JSON conteniendo la URL temporal de acceso y un mensaje de éxito.
    * `404 Not Found`: Si no se pudo generar el enlace (generalmente por nombre de archivo incorrecto o error en credenciales).
    """
    # LLAMAMOS A LA FUNCIÓN QUE IMPORTAMOS DE SERVICIOS
    url = obtener_url_firmada(nombre_archivo)
    
    if not url:
        raise HTTPException(
            status_code=404, 
            detail="No se pudo generar el link. Verifica credenciales o nombre del archivo."
        )

    return {
        "msg": "URL generada con éxito",
        "url": url
    }

# --- INCLUIR ROUTERS ---
app.include_router(empleados.router)
app.include_router(proveedores.router)
app.include_router(productos.router)
app.include_router(ventas.router)
app.include_router(facturas.router)
app.include_router(reporte.router)
app.include_router(stock.router)
app.include_router(upload.router)

# ======= DESPLIEGUE =======
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
