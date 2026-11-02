const API_URL = import.meta.env.PUBLIC_VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Sube una imagen al backend (S3/Cloudinary)
 * @param {File} archivo - El objeto File del input
 * @param {string} tipo - 'producto', 'logo' o 'fondo'
 * @returns {Promise<string>} La URL de la imagen subida
 */
export const subirImagenNube = async (archivo, tipo = 'producto') => {
  if (!archivo) return null;

  const formData = new FormData();
  formData.append("file", archivo);

  try {
    const res = await fetch(`${API_URL}/upload/${tipo}`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Error al subir imagen");
    }

    const data = await res.json();
    return data.url; 
  } catch (error) {
    console.error("Error en servicioImagen:", error);
    throw error;
  }
};