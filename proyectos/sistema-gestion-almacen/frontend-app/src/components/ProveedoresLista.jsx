import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

const API_URL = import.meta.env.PUBLIC_VITE_API_URL || 'http://127.0.0.1:8000';

// Componente principal que maneja la lógica de la lista de proveedores
export default function ProveedoresLista() {
  // --- ESTADOS ---
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [newProviderData, setNewProviderData] = useState({
    nombre_empresa: '',
    correo: '',
    telefono: '',
    direccion: '',
    rut_proveedor: '',
  });

  const [formMessage, setFormMessage] = useState({ text: '', type: '' });

  // --- EFECTOS ---
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const response = await fetch(`${API_URL}/proveedores/`);
        if (!response.ok) {
          throw new Error('No se pudo obtener la lista de proveedores.');
        }
        const data = await response.json();
        setProveedores(data);
      } catch (err) {
        console.error(err);
        setError('Error al cargar los proveedores. Revisa la conexión con el backend.');
      } finally {
        setLoading(false);
      }
    };
    fetchProveedores();
  }, []);

  // --- MANEJADORES DE EVENTOS ---
  const handleEliminar = async (idProveedor) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este proveedor?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/proveedores/${idProveedor}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el proveedor.');
      }

      setProveedores(proveedores.filter(p => p.id_proveedor !== idProveedor));
      alert('Proveedor eliminado con éxito.');

    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar el proveedor.');
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setNewProviderData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormMessage({ text: 'Guardando...', type: 'info' });

    const idAdmin = 3;

    const params = new URLSearchParams({
      id_empleado: idAdmin,
      correo: newProviderData.correo,
      telefono: newProviderData.telefono,
      direccion: newProviderData.direccion,
      nombre_empresa: newProviderData.nombre_empresa,
      rut_proveedor: newProviderData.rut_proveedor
    });

    try {
      const response = await fetch(`${API_URL}/proveedores/?${params.toString()}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorDetail = 'No se pudo agregar el proveedor.';
        if (errorData.detail && Array.isArray(errorData.detail)) {
          errorDetail = errorData.detail.map(err => `${err.loc[1]}: ${err.msg}`).join(', ');
        } else if (errorData.detail) {
          errorDetail = errorData.detail;
        }
        throw new Error(errorDetail);
      }

      const nuevoProveedorResponse = await response.json();

      setProveedores([...proveedores, nuevoProveedorResponse.proveedor]);
      setShowForm(false);
      setNewProviderData({ nombre_empresa: '', correo: '', telefono: '', direccion: '', rut_proveedor: '' });

      setFormMessage({ text: nuevoProveedorResponse.msg || 'Proveedor agregado con éxito.', type: 'success' });
      setTimeout(() => setFormMessage({ text: '', type: '' }), 3000);

    } catch (err) {
      console.error(err);
      setFormMessage({ text: `Error al agregar: ${err.message}`, type: 'error' });
    }
  };

  // --- RENDERIZADO ---
  if (loading) return <p class="text-white text-center">Cargando proveedores...</p>;
  if (error) return <p class="text-red-400 text-center">{error}</p>;

  return (
    <section class="w-full max-w-5xl mx-auto p-8 bg-white/30 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-3xl font-bold text-white">Gestión de Proveedores</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          class="px-5 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition shadow-md"
        >
          {showForm ? 'Cancelar' : 'Agregar Proveedor'}
        </button>
      </div>

      {formMessage.text && (
        <div class={`mb-4 p-3 rounded-lg ${formMessage.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
          {formMessage.text}
        </div>
      )}

      {showForm && (
        <div class="mb-8 p-6 bg-white/50 rounded-xl shadow-md transition-all duration-300">
          <form onSubmit={handleFormSubmit} class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <h3 class="md:col-span-2 text-xl font-semibold text-gray-800 mb-2">Nuevo Proveedor</h3>
            <input name="nombre_empresa" value={newProviderData.nombre_empresa} onInput={handleFormChange} placeholder="Nombre de la empresa" required class="p-2 rounded border" />
            <input name="rut_proveedor" value={newProviderData.rut_proveedor} onInput={handleFormChange} placeholder="RUT del proveedor (ej: 11.222.333-4)" required class="p-2 rounded border" />
            <input name="correo" type="email" value={newProviderData.correo} onInput={handleFormChange} placeholder="Correo" required class="p-2 rounded border" />
            <input name="telefono" value={newProviderData.telefono} onInput={handleFormChange} placeholder="Teléfono" required class="p-2 rounded border" />
            <input name="direccion" value={newProviderData.direccion} onInput={handleFormChange} placeholder="Dirección" required class="p-2 rounded border md:col-span-2" />
            <button type="submit" class="md:col-span-2 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Guardar Proveedor</button>
          </form>
        </div>
      )}

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {proveedores.map(prov => (
          <div key={prov.id_proveedor || prov._id} class="bg-white/80 rounded-xl p-4 flex flex-col items-center text-center shadow-md relative">

            <div class="absolute top-4 left-4">
              <button
                onClick={() => handleEliminar(prov.id_proveedor)}
                type="button"
                aria-label="Eliminar proveedor"
                class="flex items-center justify-center w-6 h-6 bg-red-500 text-white rounded-full font-black text-sm hover:bg-red-700 focus:outline-none transition-colors"
              >
                <span dangerouslySetInnerHTML={{ __html: '&times;' }} />
              </button>
            </div>

            {/* 👇 CAMBIO: Se asigna directamente la imagen proveedores.png */}
            <img
              src="/proveedor.png"
              alt={prov.nombre_empresa}
              class="w-24 h-24 object-cover rounded-full mb-3 border-2 border-white"
            />

            <h3 class="font-semibold text-lg text-gray-900">{prov.nombre_empresa}</h3>

            {prov.rut_proveedor && (
              <p class="text-gray-500 text-xs">RUT: {prov.rut_proveedor}</p>
            )}

            <p class="text-gray-700 text-sm mt-1">{prov.correo}</p>
            <p class="text-gray-500 text-xs">Tel: {prov.telefono}</p>

            <div class="flex flex-wrap justify-center items-center gap-2 mt-4">
              <a href={`/admin/proveedores/${prov.id_proveedor}/editar`} class="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium">Modificar</a>
              <a href={`/admin/proveedores/${prov.id_proveedor}/detalles`} class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">Detalles</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}