import os
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
import bcrypt 
from dotenv import load_dotenv
from pathlib import Path

# 1. Configurar ruta del .env (para que lo encuentre siempre)
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# ==========================================================
# CONFIGURACIÓN DE SEGURIDAD
# ==========================================================

# 2. Leer la clave del entorno
SECRET_KEY = os.getenv("SECRET_KEY")

# Validación de seguridad: Si no hay clave, detenemos el servidor
if not SECRET_KEY:
    raise RuntimeError("Falta la variable SECRET_KEY en el archivo .env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# ----------------------------------------------------------
# 1. Encriptar Contraseña (Hash)
# ----------------------------------------------------------
def get_password_hash(password: str) -> str:
    """
    Recibe una contraseña en texto plano y retorna su hash seguro (Bcrypt).
    """
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

# ----------------------------------------------------------
# 2. Verificar Contraseña (Login)
# ----------------------------------------------------------
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Compara una contraseña plana con el hash almacenado en la BD.
    Retorna True si coinciden, False si no.
    """
    try:
        pwd_bytes = plain_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

# ----------------------------------------------------------
# 3. Crear Token de Acceso (JWT)
# ----------------------------------------------------------
def create_access_token(data: dict):
    """
    Genera un Token JWT firmado con la clave secreta y tiempo de expiración.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # Usamos la SECRET_KEY que cargamos del .env
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt