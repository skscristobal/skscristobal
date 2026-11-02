from fastapi import APIRouter, UploadFile, File, HTTPException
import uuid
# Importamos AMBAS funciones
from servicios import subir_imagen_s3, subir_imagen_cloudinary

router = APIRouter(prefix="/upload", tags=["Subida de Archivos"])

@router.post("/{tipo_imagen}", summary="Subir imagen (S3 o Cloudinary)")
async def upload_site_image(tipo_imagen: str, file: UploadFile = File(...)):
    """
    Sube una imagen.
    - 'producto': Se sube a **Cloudinary** (Optimizado).
    - 'logo'/'fondo': Se sube a **AWS S3** (Almacenamiento estándar).
    """
    # 1. Validar tipo
    if tipo_imagen not in ['logo', 'fondo', 'producto']:
         raise HTTPException(status_code=400, detail="Tipo inválido. Use 'logo', 'fondo' o 'producto'.")

    try:
        url_final = ""

        # --- CASO 1: PRODUCTOS (Cloudinary) ---
        if tipo_imagen == 'producto':
            # Cloudinary maneja sus propios nombres, no necesitamos generar UUID manual necesariamente,
            # pero le pasamos el archivo directo.
            url_final = subir_imagen_cloudinary(file.file, folder="productos_vecino")

        # --- CASO 2: LOGO/FONDO (AWS S3) ---
        else:
            extension = file.filename.split(".")[-1]
            nombre_en_s3 = f"site_{tipo_imagen}.{extension}"
            
            # Usamos la función de S3
            url_final = subir_imagen_s3(file.file, nombre_en_s3, file.content_type)

        if not url_final:
             raise HTTPException(status_code=500, detail="No se obtuvo la URL de la imagen.")

        return {
            "message": f"Imagen subida correctamente a {'Cloudinary' if tipo_imagen == 'producto' else 'S3'}",
            "tipo": tipo_imagen,
            "url": url_final
        }

    except Exception as e:
        print(f"❌ Error Upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))