import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

const API_URL = import.meta.env.PUBLIC_VITE_API_URL || 'http://127.0.0.1:8000';

// ▼▼▼ AÑADIDA FUNCIÓN PARA PARSEAR ERRORES DE FASTAPI ▼▼▼
// Esto evitará que veas [object Object] en el futuro
const parseApiError = (errorData) => {
  if (errorData.detail) {
    if (Array.isArray(errorData.detail)) {
      return errorData.detail
        .map((err) => {
          // err.loc[1] es usualmente el nombre del campo (ej: 'correo')
          const field = err.loc && err.loc.length > 1 ? err.loc[1] : (err.loc[0] || "Error");
          return `${field}: ${err.msg}`;
        })
        .join("; ");
    }
    return errorData.detail;
  }
  return JSON.stringify(errorData);
};
// ▲▲▲ FIN DE LA FUNCIÓN ▲▲▲

export default function EditarProveedorForm({ id }) {
  // --- ESTADOS ---
  const [formData, setFormData] = useState({
    nombre_empresa: '',
    rut_proveedor: '', // <-- Campo RUT
    correo: '',
    telefono: '',
    direccion: '',
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // --- EFECTOS ---
  // Carga inicial de los datos del proveedor
  useEffect(() => {
    const fetchProveedor = async () => {
      try {
        const response = await fetch(`${API_URL}/proveedores/${id}`);
        if (!response.ok) {
          throw new Error('No se pudieron cargar los datos del proveedor.');
        }
        const data = await response.json();
        setFormData({
          nombre_empresa: data.nombre_empresa || '',
          rut_proveedor: data.rut_proveedor || '', // <-- Cargar RUT
          correo: data.correo || '',
          telefono: data.telefono || '',
          direccion: data.direccion || '',
        });
      } catch (err) {
        console.error(err);
        setError('Error al cargar datos. Verifique la conexión con el backend.');
      } finally {
        setLoading(false);
      }
    };
    fetchProveedor();
  }, [id]);

  // --- MANEJADORES ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    // ▼▼▼ CORRECCIÓN 1: Añadir 'rut_proveedor' a los parámetros ▼▼▼
    // Tu backend (según el error 422) REQUIERE el rut,
    // aunque no se esté modificando.
    const params = new URLSearchParams({
        nombre_empresa: formData.nombre_empresa,
        correo: formData.correo,
        telefono: formData.telefono,
        direccion: formData.direccion,
        rut_proveedor: formData.rut_proveedor // <-- AÑADIDO
    });
    // ▲▲▲ FIN CORRECCIÓN 1 ▲▲▲

    try {
      const response = await fetch(`${API_URL}/proveedores/${id}?${params.toString()}`, {
        method: 'PUT',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(parseApiError(errorData) || 'No se pudo actualizar el proveedor.');
      }

      const result = await response.json();
      setMessage(result.msg || 'Proveedor actualizado con éxito.');

    } catch (err) {
      console.error(err);
      setError(`Error al actualizar: ${err.message}`);
    }
  };

  // --- RENDERIZADO ---
  if (loading) return <p class="text-white text-center">Cargando formulario...</p>;

  // ▼▼▼ CORRECCIÓN 2: Formulario más pequeño (max-w-lg) ▼▼▼
  return (
    <div class="w-full max-w-2xl mx-auto bg-white/80 p-8 rounded-xl shadow-lg">
      <form onSubmit={handleSubmit} class="space-y-4">
        <div>
          <label for="nombre_empresa" class="block text-sm font-medium text-gray-700">Nombre de la empresa</label>
          <input type="text" name="nombre_empresa" value={formData.nombre_empresa} onInput={handleChange} required class="mt-1 block w-full p-2 bg-white border border-gray-300 rounded-md" />
        </div>
        <div>
          <label for="correo" class="block text-sm font-medium text-gray-700">Correo</label>
          <input type="email" name="correo" value={formData.correo} onInput={handleChange} required class="mt-1 block w-full p-2 bg-white border border-gray-300 rounded-md" />
        </div>
        <div>
          <label for="rut_proveedor" class="block text-sm font-medium text-gray-700">RUT Proveedor (No editable)</label>
          <input type="text" name="rut_proveedor" value={formData.rut_proveedor} disabled class="mt-1 block w-full p-2 bg-white border border-gray-300 rounded-md"/>
        </div>
        <div>
          <label for="telefono" class="block text-sm font-medium text-gray-700">Teléfono</label>
          <input type="text" name="telefono" value={formData.telefono} onInput={handleChange} required class="mt-1 block w-full p-2 bg-white border border-gray-300 rounded-md" />
        </div>
        <div>
          <label for="direccion" class="block text-sm font-medium text-gray-700">Dirección</label>
          <input type="text" name="direccion" value={formData.direccion} onInput={handleChange} required class="mt-1 block w-full p-2 bg-white border border-gray-300 rounded-md" />
        </div>
        <button type="submit" class="w-full py-2 px-4 bg-black text-white rounded hover:bg-gray-800 transition">Guardar Cambios</button>
        
        {message && <p class="text-green-600 text-center mt-2">{message}</p>}
        {error && <p class="text-red-600 text-center mt-2">{error}</p>}
      </form>
    </div>
  );
}