// src/components/LoginForm.tsx
import { useState } from "preact/hooks";

const API_URL = import.meta.env.PUBLIC_VITE_API_URL || 'http://127.0.0.1:8000';

export default function LoginForm() {
  const [role, setRole] = useState<"operador" | "admin">("operador");
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = `${API_URL}/empleados/login?usuario=${encodeURIComponent(usuario)}&contrasena=${encodeURIComponent(contrasena)}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
      });

      if (response.status === 401) {
        setError('Usuario o contraseña incorrectos.');
      } else if (!response.ok) {
        throw new Error(`Error del servidor: ${response.statusText}`);
      } else {
        const data = await response.json();
        console.log("Login exitoso:", data);

        if (data.access_token && data.empleado) {
          // Guardamos token y datos del usuario
          localStorage.setItem("token", data.access_token);
          localStorage.setItem("usuario_logueado", JSON.stringify(data.empleado));

          // Redirección basada en el rol
          const rol = data.empleado.rol;

          if (rol === 'administrador') {
            window.location.href = '/admin';
          } else if (rol === 'cajero') {
            window.location.href = '/operador';
          } else {
            setError(`Rol '${rol}' no tiene acceso permitido.`);
          }
        } else {
          setError('Respuesta del servidor incompleta.');
        }
      }
    } catch (err) {
      console.error('Error en el login:', err);
      setError('No se pudo conectar con el servidor. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-[url('/fondo-admin.jpg')] bg-cover">

      {/* Card del login */}
      <div class="w-80 p-6 rounded-xl shadow-xl bg-white/30 backdrop-blur-md border border-white/40">
        <form class="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label class="block text-sm font-medium text-gray-900">Usuario</label>
            <input
              type="text"
              placeholder="Ej: jperez"
              value={usuario}
              onInput={(e) => setUsuario((e.target as HTMLInputElement).value)}
              class="mt-1 w-full rounded-lg px-3 py-2 bg-white/80 text-black focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-900">Contraseña</label>
            <input
              type="password"
              placeholder="Tu contraseña"
              value={contrasena}
              onInput={(e) => setContrasena((e.target as HTMLInputElement).value)}
              class="mt-1 w-full rounded-lg px-3 py-2 bg-white/80 text-black focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            class="mt-2 w-full bg-black text-white font-semibold py-2 rounded-lg hover:bg-gray-800 transition disabled:bg-gray-500"
          >
            {loading ? 'Ingresando...' : 'Sign In'}
          </button>
        </form>
        {error && (
          <p class="mt-4 text-center text-sm text-red-800 bg-red-200 p-2 rounded">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}