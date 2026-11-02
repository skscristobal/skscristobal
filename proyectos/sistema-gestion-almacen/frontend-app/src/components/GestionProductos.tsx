import { useState, useEffect } from "preact/hooks";

interface PrecioHistorial {
  fecha: string;
  valor: number;
}

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  categoria: string;
  marca: string;
  sku: string;
  stock: number;
  descripcion: string;
  historialPrecios?: PrecioHistorial[];
}

export default function GestionProductos() {
  const [modo, setModo] = useState<"agregar" | "editar" | "eliminar">("agregar");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoActual, setProductoActual] = useState<Partial<Producto>>({});
  const [busqueda, setBusqueda] = useState("");
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  // ✅ Cargar productos desde localStorage
  useEffect(() => {
    const guardados = localStorage.getItem("productos");
    if (guardados) setProductos(JSON.parse(guardados));
  }, []);

  // ✅ Guardar productos en localStorage
  useEffect(() => {
    localStorage.setItem("productos", JSON.stringify(productos));
  }, [productos]);

  // ✅ Agregar producto nuevo
  const agregarProducto = () => {
    if (!productoActual.nombre || !productoActual.precio) {
      alert("Por favor completa al menos el nombre y el precio");
      return;
    }

    const nuevo: Producto = {
      id: Date.now(),
      nombre: productoActual.nombre!,
      precio: Number(productoActual.precio),
      categoria: productoActual.categoria || "General",
      marca: productoActual.marca || "Sin marca",
      sku: productoActual.sku || "#000",
      stock: Number(productoActual.stock) || 0,
      descripcion: productoActual.descripcion || "Sin descripción",
      historialPrecios: [
        {
          fecha: new Date().toLocaleString(),
          valor: Number(productoActual.precio),
        },
      ],
    };

    setProductos([...productos, nuevo]);
    setProductoActual({});
    alert("✅ Producto agregado correctamente");
  };

  // ✅ Editar producto (guarda historial si cambia el precio)
  const editarProducto = (id: number) => {
    const productoAnterior = productos.find((p) => p.id === id);
    if (!productoAnterior) return;

    const historial = productoAnterior.historialPrecios || [];
    if (productoActual.precio && productoActual.precio !== productoAnterior.precio) {
      historial.push({
        fecha: new Date().toLocaleString(),
        valor: productoActual.precio as number,
      });
    }

    const actualizado = productos.map((p) =>
      p.id === id
        ? {
            ...p,
            ...productoActual,
            precio: Number(productoActual.precio ?? p.precio),
            historialPrecios: historial,
          }
        : p
    );

    setProductos(actualizado);
    setProductoActual({});
    setMostrarHistorial(false);
    alert("✅ Producto editado correctamente");
  };

  // ✅ Eliminar producto
  const eliminarProducto = (id: number) => {
    const eliminado = productos.find((p) => p.id === id);
    if (eliminado && confirm(`¿Eliminar "${eliminado.nombre}"?`)) {
      setProductos(productos.filter((p) => p.id !== id));
    }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setProductoActual({ ...productoActual, [name]: value });
  };

  const filtrados = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.sku.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div class="flex flex-col items-center gap-8 w-full">
      <div class="h-10"></div>

      {/* Botones de modo */}
      <div class="flex gap-4">
        <button
          onClick={() => {
            setModo("agregar");
            setProductoActual({});
            setBusqueda("");
          }}
          class={`px-6 py-2 rounded-md font-medium transition ${
            modo === "agregar"
              ? "bg-green-600 text-white"
              : "bg-gray-200 hover:bg-green-100 text-gray-800"
          }`}
        >
          Agregar
        </button>
        <button
          onClick={() => {
            setModo("editar");
            setProductoActual({});
            setBusqueda("");
            setMostrarHistorial(false);
          }}
          class={`px-6 py-2 rounded-md font-medium transition ${
            modo === "editar"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 hover:bg-blue-100 text-gray-800"
          }`}
        >
          Editar
        </button>
        <button
          onClick={() => {
            setModo("eliminar");
            setProductoActual({});
            setBusqueda("");
          }}
          class={`px-6 py-2 rounded-md font-medium transition ${
            modo === "eliminar"
              ? "bg-red-600 text-white"
              : "bg-gray-200 hover:bg-red-100 text-gray-800"
          }`}
        >
          Eliminar
        </button>
      </div>

      {/* 🟢 Agregar */}
      {modo === "agregar" && (
        <section class="bg-gray-200 bg-opacity-90 p-6 rounded-lg shadow-lg w-11/12 max-w-4xl">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Agregar producto</h2>

          <div class="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="nombre"
              value={productoActual.nombre || ""}
              onInput={handleChange}
              placeholder="Nombre del producto"
              class="p-2 border rounded-md"
            />
            <input
              type="number"
              name="precio"
              value={productoActual.precio || ""}
              onInput={handleChange}
              placeholder="Precio"
              class="p-2 border rounded-md"
            />
            <input
              type="text"
              name="categoria"
              value={productoActual.categoria || ""}
              onInput={handleChange}
              placeholder="Categoría"
              class="p-2 border rounded-md"
            />
            <input
              type="text"
              name="marca"
              value={productoActual.marca || ""}
              onInput={handleChange}
              placeholder="Marca"
              class="p-2 border rounded-md"
            />
            <input
              type="text"
              name="sku"
              value={productoActual.sku || ""}
              onInput={handleChange}
              placeholder="SKU"
              class="p-2 border rounded-md"
            />
            <input
              type="number"
              name="stock"
              value={productoActual.stock || ""}
              onInput={handleChange}
              placeholder="Stock"
              class="p-2 border rounded-md"
            />
          </div>

          <textarea
            name="descripcion"
            value={productoActual.descripcion || ""}
            onInput={handleChange}
            placeholder="Descripción del producto"
            class="w-full mt-4 border rounded-md p-2"
          />

          <div class="flex justify-end mt-4">
            <button
              onClick={agregarProducto}
              class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md"
            >
              Guardar
            </button>
          </div>
        </section>
      )}

      {/* 🔵 Editar */}
      {modo === "editar" && (
        <section class="bg-gray-200 bg-opacity-90 p-6 rounded-lg shadow-lg w-11/12 max-w-4xl">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Buscar producto para editar</h2>

          {!productoActual.id ? (
            <>
              <input
                type="text"
                value={busqueda}
                onInput={(e) => setBusqueda((e.target as HTMLInputElement).value)}
                placeholder="Buscar por nombre o SKU"
                class="w-full p-2 border rounded-md mb-4"
              />
              {filtrados.length === 0 ? (
                <p class="text-gray-500 text-center">No se encontraron productos.</p>
              ) : (
                <div class="grid gap-3">
                  {filtrados.map((p) => (
                    <div
                      key={p.id}
                      class="p-3 rounded-md border border-gray-300 hover:bg-blue-100 cursor-pointer flex justify-between items-center"
                      onClick={() => setProductoActual(p)}
                    >
                      <span>
                        <strong>{p.nombre}</strong>{" "}
                        <span class="text-sm text-gray-500">({p.sku})</span>
                      </span>
                      <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md text-sm">
                        Editar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h3 class="text-lg font-semibold mb-3">Editando: {productoActual.nombre}</h3>
              <div class="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="nombre"
                  value={productoActual.nombre || ""}
                  onInput={handleChange}
                  class="p-2 border rounded-md"
                />
                <input
                  type="number"
                  name="precio"
                  value={productoActual.precio || ""}
                  onInput={handleChange}
                  class="p-2 border rounded-md"
                />
                <input
                  type="text"
                  name="categoria"
                  value={productoActual.categoria || ""}
                  onInput={handleChange}
                  class="p-2 border rounded-md"
                />
                <input
                  type="text"
                  name="marca"
                  value={productoActual.marca || ""}
                  onInput={handleChange}
                  class="p-2 border rounded-md"
                />
                <input
                  type="text"
                  name="sku"
                  value={productoActual.sku || ""}
                  onInput={handleChange}
                  class="p-2 border rounded-md"
                />
                <input
                  type="number"
                  name="stock"
                  value={productoActual.stock || ""}
                  onInput={handleChange}
                  class="p-2 border rounded-md"
                />
              </div>

              <textarea
                name="descripcion"
                value={productoActual.descripcion || ""}
                onInput={handleChange}
                class="w-full mt-4 border rounded-md p-2"
              />

              <div class="flex justify-between items-center mt-4">
                <button
                  onClick={() => setMostrarHistorial(!mostrarHistorial)}
                  class="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md"
                >
                  {mostrarHistorial ? "Ocultar historial" : "Ver historial de precios"}
                </button>

                <div class="flex gap-3">
                  <button
                    onClick={() => editarProducto(productoActual.id!)}
                    class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md"
                  >
                    Guardar cambios
                  </button>
                  <button
                    onClick={() => {
                      setProductoActual({});
                      setMostrarHistorial(false);
                    }}
                    class="bg-gray-400 hover:bg-gray-500 text-white px-5 py-2 rounded-md"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              {/* 🧾 Historial de precios */}
              {mostrarHistorial && (
                <div class="mt-6 bg-white p-4 rounded-lg shadow-md">
                  <h4 class="text-lg font-semibold text-gray-800 mb-3">Historial de precios</h4>
                  {productoActual.historialPrecios &&
                  productoActual.historialPrecios.length > 0 ? (
                    <table class="w-full border border-gray-300 text-sm text-gray-700">
                      <thead class="bg-gray-100">
                        <tr>
                          <th class="border p-2 text-left">Fecha</th>
                          <th class="border p-2 text-right">Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productoActual.historialPrecios.map((h, i) => (
                          <tr key={i}>
                            <td class="border p-2">{h.fecha}</td>
                            <td class="border p-2 text-right">
                              ${h.valor.toLocaleString("es-CL")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p class="text-gray-500">No hay historial registrado.</p>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* 🔴 Eliminar */}
      {modo === "eliminar" && (
        <section class="bg-gray-200 bg-opacity-90 p-6 rounded-lg shadow-lg w-11/12 max-w-4xl">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Eliminar producto</h2>
          <input
            type="text"
            value={busqueda}
            onInput={(e) => setBusqueda((e.target as HTMLInputElement).value)}
            placeholder="Buscar por nombre o SKU"
            class="w-full p-2 border rounded-md mb-4"
          />
          {filtrados.length === 0 ? (
            <p class="text-gray-500 text-center">No se encontraron productos.</p>
          ) : (
            <div class="grid gap-3">
              {filtrados.map((p) => (
                <div
                  key={p.id}
                  class="p-3 rounded-md border border-gray-300 hover:bg-red-100 cursor-pointer flex justify-between items-center"
                  onClick={() => eliminarProducto(p.id)}
                >
                  <span>
                    <strong>{p.nombre}</strong>{" "}
                    <span class="text-sm text-gray-500">({p.sku})</span>
                  </span>
                  <button class="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded-md text-sm">
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
