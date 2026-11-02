import { useState, useEffect } from "preact/hooks";

export default function BienvenidaOperador() {
  const [nombreCajero, setNombreCajero] = useState("");

  useEffect(() => {
    // Este script se ejecuta en el lado del cliente (navegador)
    // para leer el nombre que guardamos en el Login
    const usuarioGuardado = localStorage.getItem("usuario_logueado");
    if (usuarioGuardado) {
      try {
        const usuario = JSON.parse(usuarioGuardado);
        if (usuario && usuario.nombre) {
          // Guardamos solo el primer nombre
          setNombreCajero(usuario.nombre.split(" ")[0]);
        }
      } catch (e) {
        console.error("Error al parsear datos de usuario:", e);
      }
    }
  }, []); // El array vacío asegura que se ejecute solo una vez

  return (
    <main class="flex flex-col items-center justify-center text-center py-20">
      <h1 class="text-5xl font-extrabold text-white drop-shadow-lg">
        {/* Saludo dinámico: */}
        Bienvenido, {nombreCajero || "Operador"}
      </h1>
      <p class="text-xl text-white/80 mt-4 drop-shadow-md">
        Selecciona una opción de la barra de navegación superior para comenzar.
      </p>
    </main>
  );
}