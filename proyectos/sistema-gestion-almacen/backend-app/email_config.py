import os
from fastapi_mail import ConnectionConfig
from dotenv import load_dotenv

# Cargar .env si existe (para local), en Render no hará nada malo
load_dotenv()

# --- BLOQUE DE DEPURACIÓN (Míralo en los logs de Render) ---
smtp_user = os.environ.get("SMTP_USER")
smtp_pass = os.environ.get("SMTP_PASS")
smtp_port = os.environ.get("SMTP_PORT", "587")
smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")

print(f"📧 DEBUG MAIL CONFIG:")
print(f"   - User: {smtp_user}") 
print(f"   - Pass: {'******' if smtp_pass else 'None (ERROR)'}")
print(f"   - Port: {smtp_port}")
print(f"   - Host: {smtp_host}")

load_dotenv()
# -----------------------------------------------------------

# email_config.py
import os

# Asegúrate de tener estas variables en tu entorno o archivo .env
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