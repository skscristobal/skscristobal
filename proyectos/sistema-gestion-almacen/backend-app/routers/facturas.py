from fastapi import APIRouter, Depends, HTTPException, status
from repositorios.repositorio_factura import BaseFacturaRepository
from dependencias import get_factura_repository

# ==========================================================
# CONFIGURACIÓN DEL ROUTER
# ==========================================================
router = APIRouter(prefix="/facturas", tags=["Facturas"])


# ==========================================================
# GET /facturas
# ==========================================================
@router.get(
    "/",
    summary="Listar todas las facturas emitidas",
    response_description="Lista completa de facturas registradas",
    status_code=status.HTTP_200_OK,
)
def get_facturas(
    repo: BaseFacturaRepository = Depends(get_factura_repository)
):
    """
    Retorna una lista con **todas las facturas** registradas en el sistema.

    **Retorna:**
    * `200 OK`: Lista de objetos factura.
    * `500 Internal Server Error`: Si ocurre un error inesperado al consultar la base de datos.
    """
    try:
        facturas = repo.get_all_facturas()
        return facturas
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al obtener facturas: {e}"
        )


# ==========================================================
# GET /facturas/{id_factura}
# ==========================================================
@router.get(
    "/{id_factura}",
    summary="Obtener factura por ID",
    response_description="Datos completos de la factura",
    status_code=status.HTTP_200_OK,
)
def get_factura(
    id_factura: int,
    repo: BaseFacturaRepository = Depends(get_factura_repository)
):
    """
    Busca y retorna una factura específica utilizando su **ID numérico**.

    **Parámetros:**
    * `id_factura`: Identificador único de la factura.

    **Retorna:**
    * `200 OK`: Datos de la factura encontrada.
    * `404 Not Found`: Si la factura no existe.
    * `500 Internal Server Error`: Error inesperado.
    """
    try:
        factura = repo.get_factura_by_id(id_factura)
        if not factura:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        return factura
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al consultar factura: {e}"
        )


# ==========================================================
# POST /facturas
# ==========================================================
@router.post(
    "/",
    summary="Crear nueva factura",
    response_description="Factura creada correctamente",
    status_code=status.HTTP_201_CREATED,
)
def create_factura(
    id_proveedor: int,
    giro: int,
    fecha_emision: str,
    forma_de_pago: str,
    repo: BaseFacturaRepository = Depends(get_factura_repository),
):
    """
    Registra una **nueva factura** en el sistema.

    **Validaciones:**
    * Verifica que el `id_proveedor` exista (Integridad Referencial).

    **Parámetros:**
    * `id_proveedor`: ID del proveedor asociado.
    * `giro`: Monto o tipo de giro.
    * `fecha_emision`: Fecha en formato YYYY-MM-DD.
    * `forma_de_pago`: Descripción del método de pago.

    **Retorna:**
    * `201 Created`: Objeto de la factura creada.
    * `400 Bad Request`: Si faltan campos obligatorios.
    * `404 Not Found`: Si el proveedor indicado no existe.
    * `500 Internal Server Error`: Error inesperado.
    """
    try:
        if not all([id_proveedor, giro, fecha_emision, forma_de_pago]):
            raise HTTPException(status_code=400, detail="Faltan campos obligatorios.")

        data = {
            "id_proveedor": id_proveedor,
            "giro": giro,
            "fecha_emision": fecha_emision,
            "forma_de_pago": forma_de_pago,
        }

        nueva_factura = repo.create_factura(data)
        return {"msg": "Factura creada correctamente", "factura": nueva_factura}

    except HTTPException: raise 
    except Exception as e:
        # Manejo de error de Clave Foránea (Integridad Referencial)
        if "FOREIGN KEY" in str(e).upper():
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Error de integridad: El Proveedor (id_proveedor) proporcionado no existe."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al crear factura: {e}"
        )


# ==========================================================
# PUT /facturas/{id_factura}
# ==========================================================
@router.put(
    "/{id_factura}",
    summary="Actualizar factura existente",
    response_description="Factura actualizada correctamente",
    status_code=status.HTTP_200_OK,
)
def update_factura(
    id_factura: int,
    id_proveedor: int,
    giro: int,
    fecha_emision: str,
    forma_de_pago: str,
    repo: BaseFacturaRepository = Depends(get_factura_repository),
):
    """
    Actualiza la información de una factura existente.

    **Retorna:**
    * `200 OK`: Factura actualizada.
    * `404 Not Found`: Si la factura no existe o el proveedor nuevo no es válido.
    * `500 Internal Server Error`: Error inesperado.
    """
    try:
        data = {
            "id_proveedor": id_proveedor,
            "giro": giro,
            "fecha_emision": fecha_emision,
            "forma_de_pago": forma_de_pago,
        }

        factura_actualizada = repo.update_factura(id_factura, data)

        if not factura_actualizada:
            raise HTTPException(status_code=404, detail="Factura no encontrada")

        return {"msg": "Factura actualizada correctamente", "facturaActualizada": factura_actualizada}
    except HTTPException: raise
    except Exception as e:
        if "FOREIGN KEY" in str(e).upper():
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Error de integridad: El Proveedor (id_proveedor) proporcionado no existe."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al actualizar factura: {e}"
        )


# ==========================================================
# DELETE /facturas/{id_factura}
# ==========================================================
@router.delete(
    "/{id_factura}",
    summary="Eliminar factura por ID",
    response_description="Confirmación de eliminación",
    status_code=status.HTTP_200_OK,
)
def delete_factura(
    id_factura: int,
    repo: BaseFacturaRepository = Depends(get_factura_repository)
):
    """
    Elimina una factura del sistema permanentemente.

    **Retorna:**
    * `200 OK`: Mensaje de éxito.
    * `404 Not Found`: Si la factura no existe.
    * `500 Internal Server Error`: Error al eliminar.
    """
    try:
        eliminada = repo.delete_factura(id_factura)

        if not eliminada:
            raise HTTPException(status_code=404, detail="Factura no encontrada")

        return {"msg": f"Factura con ID {id_factura} eliminada correctamente"}
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al eliminar factura: {e}"
        )