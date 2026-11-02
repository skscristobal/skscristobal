from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session 
from sqlalchemy import text as sql_text
from repositorios.repositorio_venta import BaseVentaRepository
from dependencias import get_venta_repository
from helper import column_exists
from database.database import get_db as get_sqlite_db
from typing import List
from pydantic import BaseModel, EmailStr
# Asegúrate de tener utils.email_sender o ajusta este import
from utils.email_sender import enviar_correo

class ProductoEmail(BaseModel):
    nombre: str
    cantidad: int
    precio: int

class ClienteEmail(BaseModel):
    nombre: str
    rut: str

class EmailRequest(BaseModel):
    email: EmailStr
    items: List[ProductoEmail]    # <--- Recibimos los productos
    cliente: ClienteEmail         # <--- Recibimos al cliente
    vendedor: str    


# ==========================================================
# CONFIGURACIÓN DEL ROUTER
# ==========================================================
router = APIRouter(prefix="/ventas", tags=["Ventas"])


# ==========================================================
# GET /ventas
# ==========================================================
@router.get(
    "/",
    summary="Listar todas las ventas",
    status_code=status.HTTP_200_OK,
    response_description="Lista completa de ventas registradas"
)
def get_ventas(
    repo: BaseVentaRepository = Depends(get_venta_repository)
):
    """
    Retorna una lista con **todas las ventas** registradas en el sistema.

    **Retorna:**
    * `200 OK`: Lista de objetos venta.
    * `500 Internal Server Error`: Si ocurre un error inesperado.
    """
    try:
        return repo.get_all_ventas()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al obtener ventas: {e}"
        )


# ==========================================================
# GET /ventas/{id_venta}
# ==========================================================
@router.get(
    "/{id_venta}",
    summary="Obtener una venta por ID",
    status_code=status.HTTP_200_OK,
    response_description="Datos detallados de la venta"
)
def get_venta_por_id(
    id_venta: int,
    repo: BaseVentaRepository = Depends(get_venta_repository)
):
    """
    Busca y retorna una venta específica utilizando su **ID numérico**.

    **Parámetros:**
    * `id_venta`: Identificador único de la venta.

    **Retorna:**
    * `200 OK`: Objeto venta encontrado.
    * `404 Not Found`: Si no existe venta con ese ID.
    * `500 Internal Server Error`: Error inesperado.
    """
    try:
        venta = repo.get_venta_by_id(id_venta)
        if not venta:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venta no encontrada")
        return venta
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al consultar la venta: {e}"
        )


# ==========================================================
# GET /ventas/cajeros
# ==========================================================
@router.get(
    "/cajeros",
    summary="Listar ventas filtradas por cajeros",
    status_code=status.HTTP_200_OK,
    response_description="Ventas realizadas por empleados 'cajero'"
)
def get_ventas_cajeros(
    repo: BaseVentaRepository = Depends(get_venta_repository)
):
    """
    Retorna una lista de ventas junto con el nombre del empleado, 
    **filtrando solo aquellas realizadas por cajeros**.

    **Retorna:**
    * `200 OK`: Lista filtrada correctamente.
    * `500 Internal Server Error`: Error al realizar la consulta.
    """
    try:
        return repo.get_ventas_cajeros()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al obtener ventas de cajeros: {e}"
        )


# ==========================================================
# GET /ventas/detalle
# ==========================================================
@router.get(
    "/detalle",
    summary="Listar detalle de empleado y cliente por venta",
    status_code=status.HTTP_200_OK,
    response_description="Ventas con nombres de actores involucrados"
)
def ventas_detalle(
    repo: BaseVentaRepository = Depends(get_venta_repository)
):
    """
    Retorna un reporte detallado incluyendo ID de Venta, Nombre del Empleado y Nombre del Cliente.
    
    **Retorna:**
    * `200 OK`: Lista detallada.
    * `500 Internal Server Error`: Error inesperado.
    """
    try:
        return repo.get_ventas_detalle()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al obtener detalle de ventas: {e}"
        )


# ==========================================================
# GET /ventas/clientes-empleados
# ==========================================================
@router.get(
    "/clientes-empleados",
    summary="Listar ventas con detalle completo",
    status_code=status.HTTP_200_OK,
    response_description="Ventas con ID, Total, Cliente y Empleado"
)
def get_ventas_clientes_empleados(
    repo: BaseVentaRepository = Depends(get_venta_repository)
):
    """
    Retorna la lista maestra de ventas con toda la información relacional.
    
    **Retorna:**
    * `200 OK`: Reporte completo.
    * `500 Internal Server Error`: Error inesperado.
    """
    try:
        return repo.get_ventas_clientes_empleados()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al obtener listado completo: {e}"
        )


# ==========================================================
# POST /ventas
# ==========================================================
@router.post(
    "/",
    summary="Crear una nueva venta",
    status_code=status.HTTP_201_CREATED,
    response_description="Venta creada exitosamente"
)
def create_venta(
    total_venta: int,
    id_empleado: int,
    fecha_venta: str,
    metodo_de_pago: str,
    rut_cliente: str = None, 
    repo: BaseVentaRepository = Depends(get_venta_repository)
):
    """
    Registra una **nueva venta** en el sistema.

    **Parámetros:**
    * `total_venta`: Monto total de la transacción.
    * `id_empleado`: ID del empleado que realiza la venta.
    * `fecha_venta`: Fecha de la transacción (YYYY-MM-DD).
    * `metodo_de_pago`: Forma de pago.
    * `rut_cliente`: Identificador del cliente.

    **Retorna:**
    * `201 Created`: Venta creada correctamente.
    * `400 Bad Request`: Faltan datos obligatorios.
    * `404 Not Found`: Si Empleado o Cliente no existen (Error de clave foránea).
    * `409 Conflict`: Si el ID de venta generado ya existe.
    * `500 Internal Server Error`: Error inesperado.
    """
    try:
        if not all([total_venta is not None, id_empleado is not None, fecha_venta, metodo_de_pago]):
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Faltan campos obligatorios.")

        data = {
            "id_empleado": id_empleado,
            "total_venta": total_venta,
            "fecha_venta": fecha_venta,
            "metodo_de_pago": metodo_de_pago,
            "rut_cliente": rut_cliente
        }

        nueva_venta = repo.create_venta(data)
        return {"message": "Venta creada correctamente", "venta": nueva_venta}

    except HTTPException: raise
    except Exception as e:
        str_error = str(e).upper()
        
        if "FOREIGN KEY" in str_error:
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Error de integridad: El Cliente o Empleado proporcionado no existe."
            )
        
        if "DUPLICATE" in str_error or "UNIQUE" in str_error or "E11000" in str_error:
             raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Conflicto: El ID de venta generado ya existe."
            )
                                 
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al crear la venta: {e}"
        )


# ==========================================================
# POST /ventas/{id}/cliente (Paso 2: Asignar Cliente - FALTABA ESTO)
# ==========================================================
@router.post("/{id_venta}/cliente", status_code=status.HTTP_200_OK)
def asignar_cliente_venta(
    id_venta: int,
    rut_cliente: str,
    nombre_completo: str,
    direccion: str,
    celular: str,
    correo: str,
    fecha_de_nacimiento: str,
    repo: BaseVentaRepository = Depends(get_venta_repository)
):
    """
    Asigna los datos completos del cliente a una venta existente (Mongo).
    """
    try:
        cliente_data = {
            "rut_cliente": rut_cliente,
            "nombre_completo": nombre_completo,
            "direccion": direccion,
            "celular": celular,
            "correo": correo,
            "fecha_de_nacimiento": fecha_de_nacimiento
        }
        
        venta_actualizada = repo.assign_cliente_to_venta(id_venta, cliente_data)
        
        if not venta_actualizada:
            raise HTTPException(status_code=404, detail="Venta no encontrada para asignar cliente.")
            
        return {"message": "Cliente asignado correctamente", "venta": venta_actualizada}

    except HTTPException: raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al asignar cliente: {e}")


# ==========================================================
# DELETE /ventas/{id_venta}
# ==========================================================
@router.delete(
    "/{id_venta}",
    summary="Eliminar una venta por ID",
    status_code=status.HTTP_200_OK,
    response_description="Confirmación de eliminación"
)
def delete_venta(
    id_venta: int,
    repo: BaseVentaRepository = Depends(get_venta_repository)
):
    """
    Elimina una venta del registro permanentemente.

    **Retorna:**
    * `200 OK`: Mensaje de éxito.
    * `404 Not Found`: Si la venta no existe.
    * `500 Internal Server Error`: Error al eliminar.
    """
    try:
        eliminado = repo.delete_venta(id_venta)
        if not eliminado:
            raise HTTPException(status_code=404, detail="Venta no encontrada")

        return {"message": f"Venta con ID {id_venta} eliminada correctamente"}
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al eliminar la venta: {e}"
        )



# ==========================================================
# GET /ventas/ordenadas
# ==========================================================
@router.get(
    "/ordenadas/",
    summary="Listar ventas ordenadas por fecha",
    status_code=status.HTTP_200_OK
)
def get_ventas_ordenadas(
    repo: BaseVentaRepository = Depends(get_venta_repository),
    orden: str = "desc"
):
    """
    Lista las ventas ordenadas cronológicamente.

    **Parámetros:**
    * `orden`: 'asc' (Ascendente) o 'desc' (Descendente).

    **Retorna:**
    * `200 OK`: Lista ordenada retornada.
    * `404 Not Found`: No hay ventas registradas.
    * `500 Internal Server Error`: Error interno.
    """
    try:
        orden_valido = orden.lower() if orden.lower() in ["asc", "desc"] else "desc"
        resultados = repo.get_ventas_ordenadas(orden_valido)
        if not resultados:
            raise HTTPException(status_code=404, detail="No hay ventas registradas.")
        return resultados
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al ordenar ventas: {e}"
        )


# ==========================================================
# GET /ventas/por-fecha
# ==========================================================
@router.get(
    "/por-fecha/",
    summary="Obtener ventas y total de un día",
    status_code=status.HTTP_200_OK
)
def get_ventas_por_fecha(
    fecha: str,
    repo: BaseVentaRepository = Depends(get_venta_repository)
):
    """
    Reporte diario de ventas. Retorna el total recaudado y el detalle.
    Busca todas las ventas que COMIENCEN con la fecha indicada (ignorando la hora).

    **Parámetros:**
    * `fecha`: YYYY-MM-DD

    **Retorna:**
    * `200 OK`: Ventas y total del día encontrados.
    * `404 Not Found`: No hay ventas para esa fecha.
    * `500 Internal Server Error`: Error interno.
    """
    try:
        resultado = repo.get_ventas_por_fecha(fecha)

        # Si la lista de ventas está vacía, lanzamos 404
        if not resultado["ventas"]:
            raise HTTPException(status_code=404, detail=f"No se encontraron ventas para la fecha {fecha}.")

        return {
            "message": f"Ventas del {fecha}",
            "total_dia": resultado["total_dia"],
            "ventas": resultado["ventas"]
        }
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al obtener ventas por fecha: {e}"
        )
    
# ==========================================================
# POST /ventas/{id}/enviar-correo (Enviar Boleta)
# ==========================================================    
@router.post("/{id_venta}/enviar-correo", status_code=status.HTTP_200_OK)
async def enviar_boleta_por_correo( # <--- 1. AGREGAR 'async' AQUÍ
    id_venta: int,
    datos: EmailRequest,
    repo: BaseVentaRepository = Depends(get_venta_repository)
):
    # 1. Verificar que la venta existe
    venta = repo.get_venta_by_id(id_venta)
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    # Helper para convertir dict a objeto si es necesario
    class VentaObj:
        def __init__(self, d):
            self.id_venta = d.get('id_venta') if isinstance(d, dict) else d.id_venta
            self.total_venta = d.get('total_venta') if isinstance(d, dict) else d.total_venta
            self.fecha_venta = d.get('fecha_venta') if isinstance(d, dict) else d.fecha_venta
            self.metodo_de_pago = d.get('metodo_de_pago') if isinstance(d, dict) else d.metodo_de_pago

    venta_obj = VentaObj(venta)

    # 2. Enviar el correo con TODOS los datos
    # La función enviar_correo ahora es async, así que debemos esperarla
    exito = await enviar_correo( # <--- 2. AGREGAR 'await' AQUÍ
        destinatario=datos.email,
        venta_obj=venta_obj,
        items=datos.items,           # Pasamos la lista
        cliente=datos.cliente.dict(), # Pasamos el cliente
        vendedor=datos.vendedor      # Pasamos el vendedor
    )
    
    if not exito:
        raise HTTPException(status_code=500, detail="Error al enviar el correo.")

    return {"message": f"Boleta enviada a {datos.email}"}