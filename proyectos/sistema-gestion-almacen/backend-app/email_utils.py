from fastapi_mail import FastMail, MessageSchema, MessageType
from email_config import conf
from pydantic import EmailStr
from typing import List

async def send_daily_sales_report(destinatarios: List[EmailStr], reporte_texto: str):
    message = MessageSchema(
        subject="Reporte Diario de Ventas",
        recipients=destinatarios,  # Lista de correos
        body=reporte_texto,
        subtype=MessageType.plain
    )

    fm = FastMail(conf)
    await fm.send_message(message)