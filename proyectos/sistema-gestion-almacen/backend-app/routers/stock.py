# routers/stock.py

from fastapi import APIRouter, Depends, HTTPException, status, Form
from pydantic import BaseModel
from typing import List, Optional # ¡Importante!

# Importamos AMBOS repositorios y dependencias que necesitamos
from repositorios.repositorio_stock import BaseStockRepository
from repositorios.repositorio_producto import BaseProductoRepository
from dependencias import get_stock_repository, get_producto_repository


# ==========================================================
# 1. Definición de Schemas Pydantic
# ==========================================================

class StockMovimientoSchema(BaseModel):
    id_movimiento: Optional[int] = None # Es opcional, Mongo usa _id
    sku: int
    fecha: str # Usamos string para la fecha (formato ISO)
    tipo: str
    cantidad: int
    motivo: Optional[str] = None
    stock_resultante: int

    class Config:
        # ¡AQUÍ ESTÁ LA CORRECCIÓN DEFINITIVA!
        # Eliminamos 'orm_mode = True' y 'from_attributes = True'.
        # Dejamos la Config vacía (pass), que es lo correcto para
        # leer diccionarios de MongoDB.
        pass 

# ==========================================================
# 2. Definición del Router
# ==========================================================
router = APIRouter(
    prefix="/stock",
    tags=["Stock (Movimientos)"]
)

# ==========================================================
# GET /stock/historial/{sku}
# ==========================================================
@router.get(
    "/historial/{sku}",
    response_model=List[StockMovimientoSchema], 
    summary="Obtener historial de movimientos por SKU",
    response_description="Una lista de todos los movimientos de stock (entradas/salidas) de un producto."
)
def get_historial_por_sku(
    sku: int,
    repo_stock: BaseStockRepository = Depends(get_stock_repository)
):
    """
    Obtiene la lista de todos los movimientos de stock (entradas/salidas)
    para un producto específico, ordenados por fecha más reciente primero.

    ### Parámetros:
    - **`sku (int)`**: El SKU del producto a consultar (viene en la URL).

    ### Retorna:
    - **`200 OK`**: La lista del historial (puede ser una lista vacía si no hay movimientos).
    - **`500 Internal Server Error`**: Si ocurre un error inesperado al consultar la base de datos.
    """
    try:
        historial = repo_stock.get_historial_por_sku(sku)
        # Con la Config corregida, Pydantic ahora SÍ 
        # sabrá leer el diccionario de Mongo y mostrará los datos.
        return historial
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener historial de stock: {e}"
        )

# ==========================================================
# POST /stock/movimiento
# ==========================================================
@router.post(
    "/movimiento",
    response_model=StockMovimientoSchema, # <-- Reactivado para que se vea bien en los docs
    summary="Registrar un nuevo movimiento de stock (Entrada/Salida)",
    response_description="El objeto del movimiento de stock recién creado."
)
def registrar_movimiento(
    # --- Datos del formulario ---
    sku: int = Form(...),
    tipo: str = Form(..., description="Debe ser 'Entrada' o 'Salida'"),
    cantidad: int = Form(..., description="Número positivo (ej: 100)"),
    motivo: Optional[str] = Form(None),
    
    # --- ¡Inyectamos AMBOS repositorios! ---
    repo_stock: BaseStockRepository = Depends(get_stock_repository),
    repo_producto: BaseProductoRepository = Depends(get_producto_repository)
):
    """
    Registra un nuevo movimiento de stock (Entrada o Salida).
    Esta operación es crítica:
    1. Busca el producto por SKU.
    2. Calcula el nuevo stock.
    3. Actualiza el campo 'stock' en la entidad Producto.
    4. Registra el movimiento en la entidad StockMovimiento.

    ### Parámetros (Form Data):
    - **`sku (int)`**: SKU del producto a modificar.
    - **`tipo (str)`**: Debe ser "Entrada" o "Salida".
    - **`cantidad (int)`**: La cantidad (siempre un número positivo).
    - **`motivo (str)`**: (Opcional) La razón del movimiento (ej. "Compra a proveedor" o "Venta ID: 124").

    ### Retorna:
    - **`200 OK`**: El objeto del movimiento creado (validado por el schema).
    - **`400 Bad Request`**: Si el tipo es inválido o la cantidad es 0 o negativa.
    - **`404 Not Found`**: Si el producto (SKU) no existe.
    - **`409 Conflict`**: Si se intenta una "Salida" y no hay stock suficiente.
    """
    
    # 1. Validar tipo
    if tipo not in ["Entrada", "Salida"]:
        raise HTTPException(status_code=400, detail="El tipo debe ser 'Entrada' o 'Salida'")
        
    if cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser un número positivo mayor a 0")

    try:
        # 2. Buscar producto y stock actual
        producto = repo_producto.get_producto_by_sku(sku)
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto con SKU {sku} no encontrado")
        
        stock_actual = getattr(producto, 'stock', None) or producto.get('stock')
        
        # 3. Calcular nuevo stock
        cantidad_ajustada = 0
        if tipo == "Entrada":
            cantidad_ajustada = cantidad
            nuevo_stock = stock_actual + cantidad
        else: # "Salida"
            cantidad_ajustada = -cantidad # Guardamos el negativo
            nuevo_stock = stock_actual - cantidad
            
            if nuevo_stock < 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, 
                    detail=f"No se puede registrar la salida. Stock insuficiente (Actual: {stock_actual}, Salida: {cantidad})"
                )

        # 4. Actualizar el stock en el Producto
        repo_producto.update_stock(sku, nuevo_stock)
        
        # 5. Registrar el movimiento en el historial
        data_movimiento = {
            "sku": sku,
            "tipo": tipo,
            "cantidad": cantidad_ajustada, # Guardamos +100 o -100
            "motivo": motivo,
            "stock_resultante": nuevo_stock # Guardamos el stock final
        }
        movimiento_creado = repo_stock.create_movimiento(data_movimiento)
        
        return movimiento_creado

    except HTTPException:
        raise # Re-lanza los errores 404, 400, 409
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar movimiento: {e}"
        )