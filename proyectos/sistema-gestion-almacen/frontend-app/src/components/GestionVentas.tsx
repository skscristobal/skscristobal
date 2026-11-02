import { useState, useEffect } from "preact/hooks";

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  categoria?: string;
  marca?: string;
  sku?: string;
}

export default function VentasInteractivas() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [carritoVisible, setCarritoVisible] = useState(false);
  const [carrito, setCarrito] = useState<{ producto: Producto; cantidad: number }[]>([]);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});

  // ✅ Cargar productos desde localStorage
  useEffect(() => {
    const cargarProductos = () => {
      const guardados = localStorage.getItem("productos");
      if (guardados) setProductos(JSON.parse(guardados));
    };

    cargarProductos();
    // ✅ Escuchar cambios externos (por si cambias productos o stock desde otra página)
    window.addEventListener("storage", cargarProductos);
    return () => window.removeEventListener("storage", cargarProductos);
  }, []);

  // ✅ Cargar carrito desde localStorage
  useEffect(() => {
    const guardado = localStorage.getItem("carrito");
    if (guardado) setCarrito(JSON.parse(guardado));
  }, []);

  // ✅ Guardar carrito cuando cambie
  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  const filtrados = productos
    .filter((p) => p.stock > 0)
    .filter((p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(busqueda.toLowerCase()))
    );

  const handleBuscar = () => setMostrarResultados(true);

  const agregarAlCarrito = (producto: Producto) => {
    const cantidad = cantidades[producto.id] || 1;
    if (cantidad > producto.stock) {
      alert(`Solo hay ${producto.stock} unidades disponibles`);
      return;
    }

    const existe = carrito.find((p) => p.producto.id === producto.id);
    if (existe) {
      setCarrito(
        carrito.map((p) =>
          p.producto.id === producto.id
            ? { ...p, cantidad: p.cantidad + cantidad }
            : p
        )
      );
    } else {
      setCarrito([...carrito, { producto, cantidad }]);
    }

    // ✅ Mostrar carrito automáticamente al agregar
    setCarritoVisible(true);
  };

  const eliminarDelCarrito = (id: number) => {
    setCarrito(carrito.filter((p) => p.producto.id !== id));
  };

  const actualizarCantidad = (id: number, nuevaCantidad: number) => {
    setCantidades({ ...cantidades, [id]: nuevaCantidad });
  };

  const modificarCantidadEnCarrito = (id: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) return;
    setCarrito(
      carrito.map((p) =>
        p.producto.id === id ? { ...p, cantidad: nuevaCantidad } : p
      )
    );
  };

  const total = carrito.reduce(
    (sum, p) => sum + p.producto.precio * p.cantidad,
    0
  );

  // ✅ Escucha del botón del header
  useEffect(() => {
    const btn = document.getElementById("carrito-btn");
    if (btn && !btn.dataset.listenerAdded) {
      btn.addEventListener("click", () => setCarritoVisible((prev) => !prev));
      btn.dataset.listenerAdded = "true";
    }
  }, []);

  return (
    <div class="flex flex-col items-center gap-10 w-full">
      {/* Buscador */}
      <section class="bg-gray-200 bg-opacity-90 p-6 rounded-lg shadow-lg w-11/12 max-w-4xl">
        <h2 class="text-lg font-semibold text-center mb-4 text-gray-800">
          Buscador de Productos
        </h2>
        <div class="flex justify-center space-x-2">
          <input
            type="text"
            placeholder="Buscar por NOMBRE o SKU"
            value={busqueda}
            onInput={(e) => setBusqueda((e.target as HTMLInputElement).value)}
            class="w-2/3 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          <button
            onClick={handleBuscar}
            class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md"
          >
            Buscar
          </button>
        </div>
      </section>

      {/* Lista de productos */}
      {mostrarResultados && (
        <section class="bg-gray-200 bg-opacity-90 p-6 rounded-lg shadow-lg w-11/12 max-w-6xl">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtrados.length > 0 ? (
              filtrados.map((p) => (
                <div
                  key={p.id}
                  class="bg-white rounded-lg shadow-md flex flex-col items-center p-4"
                >
                  <div class="w-24 h-24 bg-gray-100 flex items-center justify-center text-gray-400">
                    🛍️
                  </div>
                  <p class="mt-2 font-semibold text-gray-800">{p.nombre}</p>
                  <p class="text-sm text-gray-500">Stock: {p.stock}</p>
                  <p class="text-sm text-gray-700 font-bold">
                    ${p.precio.toLocaleString("es-CL")}
                  </p>

                  {/* Selector de cantidad */}
                  <div class="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min="1"
                      max={p.stock}
                      value={cantidades[p.id] || 1}
                      onInput={(e) =>
                        actualizarCantidad(
                          p.id,
                          parseInt((e.target as HTMLInputElement).value)
                        )
                      }
                      class="w-16 text-center border rounded-md"
                    />
                  </div>

                  <button
                    onClick={() => agregarAlCarrito(p)}
                    class="mt-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
                  >
                    Agregar
                  </button>
                </div>
              ))
            ) : (
              <p class="text-center text-gray-600 col-span-full">
                No se encontraron productos.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Carrito */}
      {carritoVisible && (
        <section class="bg-gray-200 bg-opacity-90 p-6 rounded-lg shadow-lg w-11/12 max-w-4xl">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Carrito</h2>
          {carrito.length > 0 ? (
            carrito.map(({ producto, cantidad }) => (
              <div
                key={producto.id}
                class="bg-white rounded-md shadow-sm p-4 mb-3 flex justify-between items-center"
              >
                <div>
                  <h3 class="font-semibold text-gray-800">{producto.nombre}</h3>
                  <p class="text-sm text-gray-500">
                    ${producto.precio.toLocaleString("es-CL")}
                  </p>
                </div>
                <div class="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max={producto.stock}
                    value={cantidad}
                    onInput={(e) =>
                      modificarCantidadEnCarrito(
                        producto.id,
                        parseInt((e.target as HTMLInputElement).value)
                      )
                    }
                    class="w-16 border rounded-md text-center"
                  />
                  <button
                    onClick={() => eliminarDelCarrito(producto.id)}
                    class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p class="text-gray-500 text-center">No hay productos en el carrito.</p>
          )}

          {/* Total */}
          <div class="text-right font-semibold text-gray-800 mt-4">
            Total del Carrito:{" "}
            <span class="text-green-700">${total.toLocaleString("es-CL")}</span>
          </div>

          <div class="flex justify-end mt-4">
            <button
              class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
              onClick={() => alert("Compra procesada ✅")}
            >
              Comprar
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
