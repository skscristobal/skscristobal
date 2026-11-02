import { h } from 'preact';
import { useState } from 'preact/hooks';

const API_URL = import.meta.env.PUBLIC_VITE_API_URL || 'http://127.0.0.1:8000';

// Este componente solo necesita el ID del operador para funcionar
export default function BotonEliminar({ operadorId }) {
  const [eliminando, setEliminando] = useState(false);

  const handleEliminar = async () => {
    // 1. Pedimos confirmación al usuario
    if (!confirm("¿Estás seguro de que deseas eliminar a este operador?")) {
      return;
    }

    setEliminando(true);

    try {
      // 2. Hacemos la llamada DELETE al backend
      const res = await fetch(`${API_URL}/empleados/${operadorId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // 3. Si se elimina con éxito, recargamos la página para ver la lista actualizada
        alert("Operador eliminado con éxito.");
        window.location.reload(); // Recarga la página
      } else {
        const errorData = await res.json();
        throw new Error(errorData.detail || "No se pudo eliminar el operador.");
      }
    } catch (error) {
      console.error(error);
      alert(`Error al eliminar: ${error.message}`);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <button
      onClick={handleEliminar}
      disabled={eliminando}
      type="button"
      aria-label="Eliminar operador" // Importante para accesibilidad
      // 👇 ESTILOS MODIFICADOS
      class={`
        flex items-center justify-center    // Centra la 'X'
        w-6 h-6                             // Tamaño pequeño (24px)
        bg-red-500 text-white               // Color rojo de fondo, 'X' blanca
        rounded-full                        // Lo hace un círculo
        font-black                          // Hace la 'X' más gruesa
        text-sm                             // Tamaño de la 'X'
        hover:bg-red-700                    // Efecto al pasar el mouse
        focus:outline-none                  // Quita el borde azul al hacer clic
        transition-colors                   // Animación suave de color
        ${eliminando ? 'opacity-50 cursor-not-allowed' : ''} // Estilo cuando está deshabilitado
      `}
    >
      {/* Mostramos '...' si está eliminando, o '×' (símbolo times) si no.
        El símbolo 'times' (&times;) se ve mejor que una 'X' literal.
      */}
      {eliminando ? '...' : <span dangerouslySetInnerHTML={{ __html: '&times;' }} />}
    </button>
  );
}