// src/components/EditarOperadorForm.jsx
import { useState, useEffect } from "preact/hooks";

const API_URL = import.meta.env.PUBLIC_VITE_API_URL || 'http://127.0.0.1:8000';

export default function EditarOperadorForm({ id }) {
  // CORREGIDO: El estado ahora coincide con los nombres de las columnas del backend
  const [formData, setFormData] = useState({
    rut_empleado: "",
    nombre: "",
    telefono: "",
    correo: "",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorDetail, setErrorDetail] = useState("");

  // Carga inicial de datos del empleado
  useEffect(() => {
    let alive = true;
    async function fetchEmpleado() {
      try {
        // CORREGIDO: URL completa del backend y sin /api
        const res = await fetch(`${API_URL}/empleados/${id}`);
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`GET /empleados/${id} → ${res.status} ${txt}`);
        }
        const data = await res.json();
        if (!alive) return;
        // Se llenan los datos del estado con la información del backend
        setFormData({
          rut_empleado: data.rut_empleado ?? "",
          nombre: data.nombre ?? "",
          telefono: data.telefono ?? "",
          correo: data.correo ?? "",
        });
      } catch (err) {
        console.error(err);
        setMessage("❌ No se pudo cargar el empleado.");
        setErrorDetail(String(err?.message ?? err));
      } finally {
        if (alive) setLoading(false);
      }
    }
    fetchEmpleado();
    return () => {
      alive = false;
    };
  }, [id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  // Envío del formulario actualizado
  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setErrorDetail("");

    try {
      // CORREGIDO: URL completa y sin /api. El método es PUT.
      const res = await fetch(`${API_URL}/empleados/${id}?telefono=${formData.telefono}&correo=${formData.correo}`, {
        method: "PUT",
      });

      if (!res.ok) {
        let detail = "";
        try {
          const errJson = await res.json();
          detail = errJson?.detail || JSON.stringify(errJson);
        } catch {
          detail = await res.text();
        }
        throw new Error(`PUT /empleados/${id} → ${res.status} ${detail}`);
      }

      await res.json().catch(() => null);
      setMessage("✅ Empleado actualizado correctamente");
    } catch (err) {
      console.error(err);
      setMessage("❌ Error al actualizar empleado.");
      setErrorDetail(String(err?.message ?? err));
    }
  }
  
  // Renderizado del componente
  if (loading)
    return (
      <div class="flex items-center justify-center">
        <p class="text-white text-lg">Cargando datos...</p>
      </div>
    );

  return (
    <div class="flex items-center justify-center">
      <form onSubmit={handleSubmit} class="flex flex-col gap-4 w-80 p-6 rounded-xl shadow-xl bg-white/20 backdrop-blur-lg border border-white/30">
        <h2 class="text-2xl font-bold text-center text-black mb-2">Editar Empleado</h2>

        {/* Campo RUT (deshabilitado para que no se pueda editar) */}
        <div>
          <label class="block text-sm font-medium text-gray-900">RUT</label>
          <input name="rut_empleado" value={formData.rut_empleado} class="mt-1 w-full rounded-lg px-3 py-2 bg-white/50 text-black/70 cursor-not-allowed" disabled />
        </div>

        {/* Campo Nombre (deshabilitado) */}
        <div>
          <label class="block text-sm font-medium text-gray-900">Nombre</label>
          <input name="nombre" value={formData.nombre} class="mt-1 w-full rounded-lg px-3 py-2 bg-white/50 text-black/70 cursor-not-allowed" disabled />
        </div>

        {/* CORREGIDO: Campos para Teléfono y Correo, que son los que el backend puede actualizar */}
        <div>
          <label class="block text-sm font-medium text-gray-900">Teléfono</label>
          <input name="telefono" value={formData.telefono} onInput={handleChange} class="mt-1 w-full rounded-lg px-3 py-2 bg-white/80 text-black focus:outline-none focus:ring-2 focus:ring-black" required />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-900">Correo Electrónico</label>
          <input type="email" name="correo" value={formData.correo} onInput={handleChange} class="mt-1 w-full rounded-lg px-3 py-2 bg-white/80 text-black focus:outline-none focus:ring-2 focus:ring-black" required />
        </div>

        <button type="submit" class="w-full bg-black text-white font-semibold py-2 rounded-lg hover:bg-gray-800 transition">
          Guardar cambios
        </button>

        {message && <p class="text-center text-sm text-black mt-2">{message}</p>}
        {errorDetail && (
          <pre class="text-xs text-red-700 bg-white/70 p-2 rounded mt-1 whitespace-pre-wrap">
            {errorDetail}
          </pre>
        )}
      </form>
    </div>
  );
}