# routers/ventas.py (o routers/reportes.py)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.database import get_db
from repositorios.repositorio_venta import BaseVentaRepository
from dependencias import get_venta_repository
from email_utils import send_daily_sales_report # Importa la función de envío
from datetime import date



router = APIRouter(prefix="/reportes", tags=["Reportes"]) # Nuevo prefijo si prefieres

@router.post("/enviar-reporte-diario")
async def enviar_reporte_diario(
    email_destino: str, # Opcional: pasar el email destino o usar uno fijo
    repo: BaseVentaRepository = Depends(get_venta_repository)
):
    """
    Genera y envía un reporte de las ventas realizadas en el día actual a la dirección de correo especificada.
    **Retorna:**
    
    * `200 OK`: Mensaje confirmando el envío exitoso o indicando que no hubo ventas para reportar.
    * `500 Internal Server Error`: Si ocurre un error al generar el reporte o enviar el correo.
    """
    try:
        fecha_hoy = date.today().strftime("%Y-%m-%d")
        
        # 1. Obtener ventas del día usando tu repositorio existente
        datos_ventas = repo.get_ventas_por_fecha(fecha_hoy)
        ventas = datos_ventas["ventas"]
        total_dia = datos_ventas["total_dia"]

        if not ventas:
             return {"message": f"No hay ventas registradas para hoy ({fecha_hoy}). No se envió correo."}

        # 2. Formatear el reporte (Texto simple o HTML)
        reporte = f"Reporte de Ventas - {fecha_hoy}\n\n"
        reporte += f"Total Vendido: ${total_dia}\n"
        reporte += f"Cantidad de Ventas: {len(ventas)}\n\n"
        reporte += "Detalle de Ventas:\n"
        for v in ventas:
            # Ajusta según los campos de tu objeto venta (SQL o Mongo)
            id_venta = v.get("id_venta") if isinstance(v, dict) else v.id_venta
            total = v.get("total_venta") if isinstance(v, dict) else v.total_venta
            reporte += f"- Venta #{id_venta}: ${total}\n"

        # 3. Enviar el correo
        await send_daily_sales_report([email_destino], reporte)

        return {"message": f"Reporte enviado correctamente a {email_destino}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al enviar el reporte: {e}")
