from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError 
from repositorios.repositorio_producto import BaseProductoRepository
from dependencias import get_producto_repository
from typing import Optional

# ==========================================================
# CONFIGURACIÓN DEL ROUTER
# ==========================================================
router = APIRouter(prefix="/productos", tags=["Productos"])


# ==========================================================
# GET /productos
# ==========================================================
@router.get(
    "/",
    summary="Listar todos los productos",
    status_code=status.HTTP_200_OK,
    response_description="Lista de inventario completo"
)
def get_productos(
    repo: BaseProductoRepository = Depends(get_producto_repository)
):
    """
    Retorna una lista con **todos los productos** registrados en el inventario.
    """
    try:
        return repo.get_all_productos()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al obtener productos: {e}"
        )


# ==========================================================
# GET /productos/{sku}
# ==========================================================
@router.get(
    "/{sku}",
    summary="Obtener un producto por SKU",
    status_code=status.HTTP_200_OK,
    response_description="Detalles del producto"
)
def get_producto_by_sku(
    sku: int,
    repo: BaseProductoRepository = Depends(get_producto_repository)
):
    """
    Busca y retorna un producto específico utilizando su **SKU**.
    """
    try:
        producto = repo.get_producto_by_sku(sku)
        if not producto:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        return producto
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al buscar producto: {e}"
        )


# ==========================================================
# POST /productos (VERSIÓN ÚNICA Y FINAL)
# ==========================================================
@router.post("/", summary="Crear nuevo producto", status_code=status.HTTP_201_CREATED)
def create_producto(
    sku: int,
    nombre: str,
    descripcion: str,
    precio: int,
    stock: int,
    categoria: str,
    marca: str,
    proveedor: str, 
    imagen: str = None, # <--- CAMPO NUEVO: Recibe la URL de la nube
    repo: BaseProductoRepository = Depends(get_producto_repository),
):
    try:
        data = {
            "sku": sku,
            "nombre": nombre,
            "descripcion": descripcion,
            "precio": precio,
            "stock": stock,
            "categoria": categoria,
            "marca": marca,
            "proveedor": proveedor,
            "imagen": imagen # <--- LO GUARDAMOS EN MONGO
        }
        nuevo = repo.create_producto(data)
        return {"message": "Producto creado correctamente", "producto": nuevo}

    except Exception as e:
        if "Conflicto" in str(e) or "UNIQUE" in str(e).upper():
            raise HTTPException(status_code=409, detail="El SKU ya existe.")
        raise HTTPException(status_code=500, detail=f"Error al crear el producto: {e}")


# ==========================================================
# PUT /productos/{sku} (VERSIÓN ÚNICA Y FINAL)
# ==========================================================
@router.put("/{sku}", summary="Actualizar producto completo", status_code=status.HTTP_200_OK)
def update_producto_completo(
    sku: int,
    # Usamos Optional para indicar que estos campos no son obligatorios
    nombre: Optional[str] = None,
    descripcion: Optional[str] = None,
    precio: Optional[int] = None,
    stock: Optional[int] = None,
    categoria: Optional[str] = None,
    marca: Optional[str] = None,
    proveedor: Optional[str] = None,
    imagen: Optional[str] = None, # <--- CAMPO NUEVO
    repo: BaseProductoRepository = Depends(get_producto_repository)
):
    try:
        data = {}
        if nombre is not None: data["nombre"] = nombre
        if descripcion is not None: data["descripcion"] = descripcion
        if precio is not None: data["precio"] = precio
        if stock is not None: data["stock"] = stock
        if categoria is not None: data["categoria"] = categoria
        if marca is not None: data["marca"] = marca
        if proveedor is not None: data["proveedor"] = proveedor
        if imagen is not None: data["imagen"] = imagen # <--- SI LLEGA, LO ACTUALIZAMOS

        if not data:
             raise HTTPException(status_code=400, detail="No se enviaron datos para actualizar.")

        producto_actualizado = repo.update_producto(sku, data)

        if not producto_actualizado:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        return {"message": "Producto actualizado correctamente", "producto": producto_actualizado}

    except HTTPException: raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar producto: {e}")
    

# ==========================================================
# DELETE /productos/{sku}
# ==========================================================
@router.delete(
    "/{sku}",
    summary="Eliminar un producto por SKU",
    status_code=status.HTTP_200_OK,
    response_description="Confirmación de eliminación"
)
def delete_producto(
    sku: int,
    repo: BaseProductoRepository = Depends(get_producto_repository)
):
    """
    Elimina un producto del inventario permanentemente.
    """
    try:
        eliminado = repo.delete_producto(sku)
        
        if not eliminado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"No se encontró ningún producto con SKU {sku}"
            )

        return {"message": f"Producto con SKU {sku} eliminado correctamente"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al eliminar el producto: {e}"
        )