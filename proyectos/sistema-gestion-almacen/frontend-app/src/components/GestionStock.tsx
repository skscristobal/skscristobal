import { useState, useEffect } from "preact/hooks";

interface Movimiento {
  fecha: string;
  tipo: "Entrada" | "Salida";
  cantidad: number;
  motivo: string;
  stockFinal: number;
}

interface Producto {
  id: number;
  nombre: string;
  sku: string;
  stock: number;
  movimientos?: Movimiento[];
}

export default function GestionStock() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [productoActual, setProductoActual] = useState<Producto | null>(null);
  const [tipoMovimiento, setTipoMovimiento] = useState<"Entrada" | "Salida" | "">("");
  const [cantidad, setCantidad] = useState<number>(0);
  const [motivo, setMotivo] = useState("");

  // Cargar productos desde localStorage (los mismos que usas en productos)
  useEffect(() => {
    const guardados = localStorage.getItem("productos");
    if (guardados) {
      const data = JSON.parse(guardados);
      setProductos(data);
    }
  }, []);

  // Guardar cambios
  useEffect(() => {
    localStorage.setItem("productos", JSON.stringify(productos));
  }, [productos]);

  const filtrados = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.sku.toLowerCase().includes(busqueda.toLowerCase())
  );

  const registrarMovimiento = () => {
    if (!productoActual || !tipoMovimiento || cantidad <= 0) {
      alert("Completa todos los campos para registrar el movimiento");
      return;
    }

    let nuevoStock =
      tipoMovimiento === "Entrada"
        ? productoActual.stock + cantidad
        : productoActual.stock - cantidad;

    if (nuevoStock < 0) {
      alert("❌ El stock no puede ser negativo");
      return;
    }

    const nuevoMovimiento: Movimiento = {
      fecha: new Date().toLocaleString(),
      tipo: tipoMovimiento,
      cantidad: tipoMovimiento === "Entrada" ? cantidad : -cantidad,
      motivo: motivo || "Sin motivo especificado",
      stockFinal: nuevoStock,
    };

    const actualizados = productos.map((p) =>
      p.id === productoActual.id
        ? {
            ...p,
            stock: nuevoStock,
            movimientos: [...(p.movimientos || []), nuevoMovimiento],
          }
        : p
    );

    setProductos(actualizados);
    setProductoActual({
      ...productoActual,
      stock: nuevoStock,
      movimientos: [...(productoActual.movimientos || []), nuevoMovimiento],
    });

    setCantidad(0);
    setMotivo("");
    alert("✅ Movimiento registrado correctamente");
  };

  return (
    <div class="flex flex-col items-center gap-8 w-full">
      <div class="h-10"></div>

      {/* 🔹 Buscar producto */}
      <section class="bg-gray-200 bg-opacity-90 p-6 rounded-lg shadow-lg w-11/12 max-w-4xl">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 text-center">
          Registrar Movimientos
        </h2>

        {!productoActual ? (
          <>
            <div class="flex justify-center gap-2">
              <input
                type="text"
                value={busqueda}
                onInput={(e) => setBusqueda((e.target as HTMLInputElement).value)}
                placeholder="Ingrese nombre o SKU del producto"
                class="w-2/3 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600"
              />
            </div>

            {filtrados.length > 0 && (
              <div class="grid gap-3 mt-4">
                {filtrados.map((p) => (
                  <div
                    key={p.id}
                    class="p-3 rounded-md border border-gray-300 hover:bg-green-100 cursor-pointer flex justify-between items-center"
                    onClick={() => setProductoActual(p)}
                  >
                    <span>
                      <strong>{p.nombre}</strong>{" "}
                      <span class="text-sm text-gray-500">({p.sku})</span>
                    </span>
                    <button class="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded-md text-sm">
                      Seleccionar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h3 class="text-lg font-semibold mb-3">{productoActual.nombre}</h3>
            <p class="text-sm text-gray-600 mb-1">
              <strong>SKU:</strong> {productoActual.sku}
            </p>
            <p class="text-sm text-gray-600 mb-4">
              <strong>Stock actual:</strong>{" "}
              <span class="text-green-700 font-semibold">
                {productoActual.stock}
              </span>
            </p>

            {/* Formulario de movimiento */}
            <div class="grid grid-cols-2 gap-4">
              <select
                value={tipoMovimiento}
                onChange={(e) =>
                  setTipoMovimiento(
                    (e.target as HTMLSelectElement).value as "Entrada" | "Salida"
                  )
                }
                class="p-2 border rounded-md"
              >
                <option value="">Tipo de Movimiento</option>
                <option value="Entrada">Entrada</option>
                <option value="Salida">Salida</option>
              </select>

              <input
                type="number"
                placeholder="Cantidad"
                value={cantidad}
                onInput={(e) => setCantidad(Number((e.target as HTMLInputElement).value))}
                class="p-2 border rounded-md"
              />

              <textarea
                placeholder="Motivo"
                value={motivo}
                onInput={(e) => setMotivo((e.target as HTMLTextAreaElement).value)}
                class="col-span-2 p-2 border rounded-md"
              />
            </div>

            <div class="flex justify-end gap-3 mt-4">
              <button
                onClick={registrarMovimiento}
                class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md"
              >
                Guardar
              </button>
              <button
                onClick={() => setProductoActual(null)}
                class="bg-gray-400 hover:bg-gray-500 text-white px-5 py-2 rounded-md"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </section>

      {/* 🔹 Historial de movimientos */}
      {productoActual && (
        <section class="bg-gray-200 bg-opacity-90 p-6 rounded-lg shadow-lg w-11/12 max-w-5xl">
          <h2 class="text-xl font-semibold text-gray-800 mb-4 text-center">
            Historial de Movimientos
          </h2>

          {productoActual.movimientos && productoActual.movimientos.length > 0 ? (
            <table class="w-full border border-gray-300 text-sm text-gray-700">
              <thead class="bg-gray-100">
                <tr>
                  <th class="border p-2 text-left">Fecha</th>
                  <th class="border p-2 text-left">Tipo</th>
                  <th class="border p-2 text-right">Cantidad</th>
                  <th class="border p-2 text-left">Motivo</th>
                  <th class="border p-2 text-right">Stock</th>
                </tr>
              </thead>
              <tbody>
                {productoActual.movimientos.map((m, i) => (
                  <tr key={i}>
                    <td class="border p-2">{m.fecha}</td>
                    <td class="border p-2">{m.tipo}</td>
                    <td
                      class={`border p-2 text-right ${
                        m.tipo === "Entrada" ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                    </td>
                    <td class="border p-2">{m.motivo}</td>
                    <td class="border p-2 text-right">{m.stockFinal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p class="text-center text-gray-500">No hay movimientos registrados.</p>
          )}
        </section>
      )}
    </div>
  );
}
