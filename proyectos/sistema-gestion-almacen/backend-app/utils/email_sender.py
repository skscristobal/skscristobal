from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from typing import List, Dict, Any
import os
from dotenv import load_dotenv
from fpdf import FPDF

load_dotenv()

# Configuración de conexión (Gmail)
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("SMTP_USER"),
    MAIL_PASSWORD=os.getenv("SMTP_PASS"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("SMTP_PORT", "587")),
    MAIL_SERVER=os.getenv("SMTP_HOST", "smtp-relay.brevo.com"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

def limpiar_texto(texto):
    """Limpia caracteres para FPDF (Latin-1)."""
    if texto is None: return ""
    return str(texto).encode('latin-1', 'replace').decode('latin-1')

def generar_pdf_boleta(venta_obj, items, cliente, vendedor):
    """Genera PDF con estilo de Boleta Electrónica Chilena (Recuadro Rojo)."""
    print("📄 Generando PDF estilo SII...")
    try:
        pdf = FPDF(format='A4')
        pdf.add_page()
        
        # --- 1. RECUADRO ROJO (RUT Y FOLIO) ---
        pdf.set_draw_color(204, 0, 0) # Rojo oscuro
        pdf.set_line_width(1)
        # Rectángulo centrado: x=60, y=10, w=90, h=30
        pdf.rect(60, 10, 90, 30)
        
        # Texto dentro del recuadro
        pdf.set_xy(60, 13)
        pdf.set_font("Arial", 'B', 12)
        pdf.set_text_color(0, 0, 0) # Negro
        pdf.cell(90, 6, limpiar_texto("R.U.T.: 77.777.777-7"), 0, 1, 'C')
        
        pdf.set_x(60)
        pdf.set_font("Arial", 'B', 14)
        pdf.cell(90, 8, limpiar_texto("BOLETA ELECTRÓNICA"), 0, 1, 'C')
        
        pdf.set_x(60)
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(90, 8, limpiar_texto(f"N° {venta_obj.id_venta}"), 0, 1, 'C')
        
        # --- 2. DATOS DEL EMISOR ---
        pdf.set_xy(10, 45)
        pdf.set_font("Arial", '', 10)
        pdf.cell(0, 5, limpiar_texto(f"{venta_obj.fecha_venta}"), 0, 1, 'C')
        
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(0, 6, limpiar_texto("ALMACÉN EL VECINO"), 0, 1, 'C')
        
        pdf.set_font("Arial", 'B', 10)
        pdf.cell(0, 6, limpiar_texto(f"**M. PAGO**: {venta_obj.metodo_de_pago.upper()}"), 0, 1, 'C')
        pdf.ln(5)

        # --- 3. TABLA DE PRODUCTOS ---
        # Línea separadora superior
        pdf.set_draw_color(0, 0, 0)
        pdf.set_line_width(0.2)
        pdf.line(40, pdf.get_y(), 170, pdf.get_y())
        pdf.ln(1)
        
        # Encabezados
        pdf.set_font("Arial", 'B', 10)
        pdf.set_fill_color(245, 245, 245) # Fondo gris muy suave
        pdf.set_x(40)
        pdf.cell(80, 8, limpiar_texto("Artículo"), 0, 0, 'L', True)
        pdf.cell(20, 8, limpiar_texto("Cant."), 0, 0, 'C', True)
        pdf.cell(30, 8, limpiar_texto("Total"), 0, 1, 'R', True)
        
        pdf.line(40, pdf.get_y(), 170, pdf.get_y())
        pdf.ln(2)
        
        # Items
        pdf.set_font("Arial", '', 10)
        for item in items:
            total_item = int(item.precio) * int(item.cantidad)
            pdf.set_x(40)
            pdf.cell(80, 6, limpiar_texto(item.nombre), 0, 0, 'L')
            pdf.cell(20, 6, limpiar_texto(str(item.cantidad)), 0, 0, 'C')
            pdf.cell(30, 6, limpiar_texto(f"${total_item}"), 0, 1, 'R')
            
        pdf.ln(2)
        pdf.line(40, pdf.get_y(), 170, pdf.get_y())
        
        # --- 4. TOTALES (NETO / IVA / TOTAL) ---
        total = int(venta_obj.total_venta)
        iva = int(total * 0.19 / 1.19) # Cálculo inverso del IVA incluido
        neto = total - iva
        
        pdf.ln(3)
        
        # Neto
        pdf.set_x(40)
        pdf.cell(100, 5, "NETO:", 0, 0, 'R')
        pdf.cell(30, 5, limpiar_texto(f"${neto}"), 0, 1, 'R')
        
        # IVA
        pdf.set_x(40)
        pdf.cell(100, 5, "IVA (19%):", 0, 0, 'R')
        pdf.cell(30, 5, limpiar_texto(f"${iva}"), 0, 1, 'R')
        
        # Total Grande
        pdf.set_font("Arial", 'B', 14)
        pdf.set_x(40)
        pdf.cell(100, 8, "TOTAL:", 0, 0, 'R')
        pdf.cell(30, 8, limpiar_texto(f"${total}"), 0, 1, 'R')
        
        pdf.line(40, pdf.get_y(), 170, pdf.get_y()) # Línea final
        
        # --- 5. FOOTER (Vendedor y Cliente) ---
        pdf.ln(8)
        pdf.set_font("Arial", '', 9)
        pdf.cell(0, 5, limpiar_texto(f"Vendedor: {vendedor}"), 0, 1, 'C')
        pdf.ln(3)
        
        nombre_cli = cliente.get('nombre') or 'N/A'
        rut_cli = cliente.get('rut') or 'N/A'
        
        pdf.set_font("Arial", 'B', 10)
        pdf.cell(0, 5, "CLIENTE", 0, 1, 'C')
        pdf.set_font("Arial", '', 10)
        pdf.cell(0, 5, limpiar_texto(nombre_cli), 0, 1, 'C')
        pdf.cell(0, 5, limpiar_texto(rut_cli), 0, 1, 'C')
        
        # Línea inferior "Gracias"
        pdf.ln(5)
        pdf.line(60, pdf.get_y(), 150, pdf.get_y())
        pdf.ln(2)
        pdf.cell(0, 5, "Gracias por su compra", 0, 1, 'C')
        
        # Guardar
        filename = f"boleta_{venta_obj.id_venta}.pdf"
        pdf.output(filename)
        return filename

    except Exception as e:
        print(f"⚠️ ERROR generando PDF: {e}")
        return None

async def enviar_correo(
    destinatario: EmailStr, 
    venta_obj: Any, 
    items: List[Any], 
    cliente: Dict, 
    vendedor: str
) -> bool:
    
    archivo_pdf = None
    archivo_pdf = generar_pdf_boleta(venta_obj, items, cliente, vendedor)
    
    try:
        print(f"📧 Enviando a {destinatario}...")
        
        # Cálculos para el HTML
        total = int(venta_obj.total_venta)
        iva = int(total * 0.19 / 1.19)
        neto = total - iva
        
        filas_html = ""
        for item in items:
            t_item = int(item.precio) * int(item.cantidad)
            filas_html += f"""
            <tr>
                <td style="padding:8px;border-bottom:1px solid #eee;">{item.nombre}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">{item.cantidad}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${t_item}</td>
            </tr>"""

        html_content = f"""
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;">
            <div style="background:#2c3e50;color:white;padding:15px;text-align:center;">
                <h2 style="margin:0;">Boleta N° {venta_obj.id_venta}</h2>
                <p style="margin:0;font-size:12px;">Almacén El Vecino</p>
            </div>
            <div style="padding:20px;">
                <p>Hola <strong>{cliente.get('nombre')}</strong>, aquí está tu boleta:</p>
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead style="color:#666;">
                        <tr><th align="left">Producto</th><th>Cant.</th><th align="right">Total</th></tr>
                    </thead>
                    <tbody>{filas_html}</tbody>
                </table>
                <hr style="border-top:1px dashed #ccc;margin:15px 0;">
                <div style="text-align:right;font-size:12px;color:#666;">
                    <p style="margin:2px;">Neto: ${neto}</p>
                    <p style="margin:2px;">IVA (19%): ${iva}</p>
                    <p style="margin:5px 0;font-size:16px;font-weight:bold;color:#27ae60;">Total: ${total}</p>
                </div>
            </div>
        </div>
        """

        adjuntos = [archivo_pdf] if archivo_pdf else []

        message = MessageSchema(
            subject=f"Boleta Electronica N {venta_obj.id_venta}",
            recipients=[destinatario],
            body=html_content,
            subtype=MessageType.html,
            attachments=adjuntos
        )

        fm = FastMail(conf)
        await fm.send_message(message)
        print("🚀 Correo enviado!")
        return True

    except Exception as e:
        print(f"❌ ERROR CRÍTICO: {e}")
        return False
    
    finally:
        if archivo_pdf and os.path.exists(archivo_pdf):
            try: os.remove(archivo_pdf)
            except: pass