import boto3
import os
from dotenv import load_dotenv
from pathlib import Path
from fastapi import UploadFile, HTTPException
import cloudinary
import cloudinary.uploader

# 1. Construir la ruta exacta al archivo .env
# Esto busca el archivo .env en la MISMA carpeta donde está servicios.py
env_path = Path(__file__).parent / ".env"

# 2. Cargar variables desde esa ruta específica
load_dotenv(dotenv_path=env_path)

# 3. Obtener credenciales
# NOTA: Asegúrate de que en tu archivo .env se llamen IGUAL que aquí dentro de las comillas
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME") # <--- En tu foto se llamaba BUCKET_NAME (sin AWS_)
REGION = os.getenv("REGION")           # <--- En tu foto se llamaba REGION (sin AWS_)

# 4. Validar que existan (para que no falle silenciosamente)
if not all([AWS_ACCESS_KEY, AWS_SECRET_KEY, BUCKET_NAME, REGION]):
    # Imprimimos para ver cuál falta
    print(f"DEBUG CLAVES: Access={bool(AWS_ACCESS_KEY)}, Secret={bool(AWS_SECRET_KEY)}, Bucket={bool(BUCKET_NAME)}, Region={bool(REGION)}")
    raise RuntimeError("Faltan las credenciales de AWS en el archivo .env (Revisa los nombres)")

# 5. Crear el cliente S3
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=REGION
)

# --- CONFIGURACIÓN CLOUDINARY ---
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

cloudinary.config( 
  cloud_name = CLOUDINARY_CLOUD_NAME, 
  api_key = CLOUDINARY_API_KEY, 
  api_secret = CLOUDINARY_API_SECRET,
  secure = True
)

def subir_imagen_s3(file: UploadFile, carpeta: str = "productos") -> str:
    """
    Sube un archivo a S3 y retorna la URL pública.
    """
    try:
        # Nombre único: carpeta/nombre_original
        object_name = f"{carpeta}/{file.filename}"

        # Subir
        s3_client.upload_fileobj(
            file.file,
            BUCKET_NAME,
            object_name,
            ExtraArgs={'ContentType': file.content_type} 
        )

        # Construir URL (A veces AWS usa s3.amazonaws.com o s3.region.amazonaws.com)
        url = f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/{object_name}"
        return url

    except Exception as e:
        print(f"❌ Error al subir a S3: {e}")
        raise HTTPException(status_code=500, detail="No se pudo subir la imagen a la nube.")

def obtener_url_firmada(nombre_archivo: str, expiracion: int = 3600) -> str:
    """
    Genera una URL temporal para LEER (GET) un archivo privado de S3.
    """
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': nombre_archivo
            },
            ExpiresIn=expiracion
        )
        return url
    except Exception as e:
        print(f"❌ Error generando URL firmada: {e}")
        return None

def subir_imagen_cloudinary(file_obj, folder: str = "productos") -> str:
    """Sube a Cloudinary (Ideal para imágenes de productos optimizadas)"""
    try:
        # Cloudinary lee el archivo directamente
        response = cloudinary.uploader.upload(
            file_obj, 
            folder=folder,
            resource_type="image"
        )
        # Retornamos la URL segura (https)
        return response.get("secure_url")
    except Exception as e:
        print(f"❌ Error Cloudinary: {e}")
        raise HTTPException(status_code=500, detail="Fallo al subir a Cloudinary")

def eliminar_imagen_cloudinary(url_imagen: str):
    """
    Borra una imagen de Cloudinary a partir de su URL pública.
    """
    if not url_imagen or "cloudinary" not in url_imagen:
        return # No hacemos nada si no es de Cloudinary

    try:
        # 1. Extraer el 'public_id' de la URL.
        # Las URLs suelen ser: .../upload/v1234/carpeta/nombre.jpg
        # El public_id sería: carpeta/nombre (sin la extensión)
        
        # Rompemos la URL para sacar la parte final
        partes = url_imagen.split("/")
        # Buscamos dónde empieza la versión (v123...) para tomar lo que sigue
        # Ojo: Esta lógica puede variar según tu configuración, pero esta es la estándar
        
        # Una forma más robusta es tomar desde después de 'upload/' y quitar la versión
        public_id_con_extension = url_imagen.split("upload/")[-1]
        
        # Si tiene versión (empieza con v + números + /), la quitamos
        if public_id_con_extension.startswith("v"):
             parts_version = public_id_con_extension.split("/", 1)
             if len(parts_version) > 1:
                 public_id_con_extension = parts_version[1]

        # Quitamos la extensión (.jpg, .png)
        public_id = public_id_con_extension.rsplit(".", 1)[0]

        print(f"🗑️ Intentando borrar en Cloudinary ID: {public_id}")

        # 2. Llamar a la API de destrucción
        cloudinary.uploader.destroy(public_id)
        print("✅ Imagen eliminada de Cloudinary")
        return True

    except Exception as e:
        print(f"⚠️ Error al borrar imagen de Cloudinary: {e}")
        return False    