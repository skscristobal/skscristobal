import type { FunctionalComponent } from "preact";

const Landing: FunctionalComponent = () => {
  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-[url('/bg.jpg')] bg-cover bg-center">
      {/* Card principal con efecto glassmorphism */}
      <div class="w-80 p-8 rounded-xl shadow-xl bg-white/30 backdrop-blur-md border border-white/40 text-center">
        <h1 class="text-2xl font-semibold text-white mb-2">
          Bienvenido a la página oficial de
        </h1>
        <h2 class="text-3xl font-extrabold text-white mb-8 tracking-wide">
          El Vecino
        </h2>

        <a
          href="/login"
          class="inline-block w-full bg-black text-white font-semibold py-2 rounded-lg hover:bg-gray-800 transition"
        >
          Iniciar sesión
        </a>
      </div>
    </div>
  );
};

export default Landing;
