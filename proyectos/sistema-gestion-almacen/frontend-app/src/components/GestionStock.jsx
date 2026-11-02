import { useState, useEffect } from "preact/hooks";

// 1. Definimos la URL de tu API
const API_URL = import.meta.env.PUBLIC_VITE_API_URL || 'http://127.0.0.1:8000';

// Este "helper" inteligente convierte los errores de la API en texto legible.
const parseApiError = (errorData) => {
  if (errorData.detail) {
    if (Array.isArray(errorData.detail)) {
      return errorData.detail
        .map((err) => {
          const loc = err.loc ? err.loc.join(" -> ") : "Error";
          return `${loc}: ${err.msg}`;
        })
        .join("; ");
    }
    return errorData.detail;
  }
  return JSON.stringify(errorData);
};


// 2. (¡CORREGIDO!)
// Eliminamos las 'interface' de TypeScript. JSX no las necesita.

export default function GestionStock() {
  // --- Estados Principales ---
  const [productos, setProductos] = useState([]); // Para el buscador
  const [busqueda, setBusqueda] = useState("");
  const [productoActual, setProductoActual] = useState(null);
  
  // --- Estados del Historial y Formulario ---
  const [historial, setHistorial] = useState([]);
  const [tipoMovimiento, setTipoMovimiento] = useState("");
  const [cantidad, setCantidad] = useState(0);
  const [motivo, setMotivo] = useState("");
  
  // --- Estados de Carga y Mensajes ---
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [mensaje, setMensaje] = useState("");


  // 3. Cargar productos (para el buscador) DESDE LA API al iniciar
  useEffect(() => {
    const cargarProductos = async () => {
      setCargandoProductos(true);
      try {
        const res = await fetch(`${API_URL}/productos/`);
        if (!res.ok) throw new Error("No se pudieron cargar los productos");
        const data = await res.json();
        setProductos(data);
      } catch (err) {
        setMensaje(err.message);
      } finally {
        setCargandoProductos(false);
      }
    };
    cargarProductos();
  }, []); // Se ejecuta solo una vez


  // 4. Función para SELECCIONAR un producto y BUSCAR su historial
  const handleSeleccionarProducto = async (producto) => {
    setProductoActual(producto); // Muestra el producto seleccionado
    setHistorial([]); // Limpia el historial anterior
    setCargandoHistorial(true);
    setMensaje("");

    try {
      const res = await fetch(`${API_URL}/stock/historial/${producto.sku}`);
      if (!res.ok) {
        throw new Error("No se pudo cargar el historial de este producto.");
      }
      const data = await res.json();
      setHistorial(data); // Guarda el historial de la API
    } catch (err) {
      setMensaje(err.message);
    } finally {
      setCargandoHistorial(false);
    }
  };


  // 5. Función para REGISTRAR un nuevo movimiento (¡CONECTADO!)
  const registrarMovimiento = async () => {
    if (!productoActual || !tipoMovimiento || cantidad <= 0) {
      setMensaje("Completa todos los campos (Tipo y Cantidad > 0).");
      return;
    }
    setMensaje("Registrando movimiento...");

    // Tu backend espera 'Form Data' (x-www-form-urlencoded)
    const params = new URLSearchParams({
      sku: productoActual.sku.toString(),
      tipo: tipoMovimiento,
      cantidad: cantidad.toString(),
      motivo: motivo || "Sin motivo"
    });

    try {
      const res = await fetch(`${API_URL}/stock/movimiento`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(parseApiError(errData));
      }

      const nuevoMovimiento = await res.json();

      // ¡Éxito! Actualizamos el frontend
      setHistorial([nuevoMovimiento, ...historial]); // Añade el nuevo mov. al historial
      
      // Actualiza el stock en el producto seleccionado
      const stockFinal = nuevoMovimiento.stock_resultante;
      setProductoActual({ ...productoActual, stock: stockFinal });
      
      // Actualiza el stock en la lista principal de productos (para el buscador)
      setProductos(productos.map(p => 
        p.sku === productoActual.sku ? { ...p, stock: stockFinal } : p
      ));

      // Limpia el formulario
      setCantidad(0);
      setMotivo("");
      setTipoMovimiento("");
      setMensaje("✅ Movimiento registrado correctamente");

    } catch (err) {
      setMensaje(`Error: ${err.message}`);
    }
  };

  // Filtra los productos para el buscador
  const filtrados = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.sku.toString().toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div class="flex flex-col items-center gap-8 w-full">
      <div class="h-10"></div>

      {/* 🔹 Buscar producto */}
      <section class="bg-gray-200 bg-opacity-90 p-6 rounded-lg shadow-lg w-11/12 max-w-4xl">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 text-center">
          Registrar Movimientos
        </h2>

        {/* Mensaje de estado de la API */}
        {mensaje && <p class="text-white bg-black/50 p-3 rounded-md text-center mb-4">{mensaje}</p>}

        {!productoActual ? (
          <>
            <div class="flex justify-center gap-2">
              <input
                type="text"
                value={busqueda}
                onInput={(e) => setBusqueda(e.target.value)}
                placeholder="Ingrese nombre o SKU del producto"
                class="w-2/3 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600"
              />
            </div>
            {cargandoProductos && <p class="text-center text-gray-600 mt-4">Cargando productos...</p>}
            {filtrados.length > 0 && (
              <div class="grid gap-3 mt-4">
                {filtrados.map((p) => (
                  <div
                    key={p.sku}
                    class="p-3 rounded-md border border-gray-300 hover:bg-green-100 cursor-pointer flex justify-between items-center"
                    onClick={() => handleSeleccionarProducto(p)} // <-- Llama a la función
                  >
                    <span>
                      <strong>{p.nombre}</strong>{" "}
                      <span class="text-sm text-gray-500">({p.sku})</span>
                    </span>
                    <span class="font-bold">Stock: {p.stock}</span>
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
                  setTipoMovimiento(e.target.value)
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
                onInput={(e) => setCantidad(Number(e.target.value))}
                class="p-2 border rounded-md"
              />

              <textarea
                placeholder="Motivo"
                value={motivo}
                onInput={(e) => setMotivo(e.target.value)}
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
                onClick={() => {
                  setProductoActual(null);
                  setMensaje(""); // Limpia el mensaje
                }}
                class="bg-gray-400 hover:bg-gray-500 text-white px-5 py-2 rounded-md"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </section>

      {/* Historial de movimientos (desde la API) */}
      {productoActual && (
        <section class="bg-gray-200 bg-opacity-90 p-6 rounded-lg shadow-lg w-11/12 max-w-5xl">
          <h2 class="text-xl font-semibold text-gray-800 mb-4 text-center">
            Historial de Movimientos (API)
          </h2>
          
          {cargandoHistorial && <p class="text-center text-gray-600">Cargando historial...</p>}

          {!cargandoHistorial && historial.length > 0 ? (
            <table class="w-full border border-gray-300 text-sm text-gray-700">
              <thead class="bg-gray-100">
                <tr>
                  <th class="border p-2 text-left">Fecha</th>
                  <th class="border p-2 text-left">Tipo</th>
                  <th class="border p-2 text-right">Cantidad</th>
                  <th class="border p-2 text-left">Motivo</th>
                  <th class="border p-2 text-right">Stock Resultante</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((m, i) => (
                  <tr key={i}>
                    {/* Formateamos la fecha ISO de la API */}
                    <td class="border p-2">{new Date(m.fecha).toLocaleString("es-CL")}</td>
                    <td class="border p-2">{m.tipo}</td>
                    <td
                      class={`border p-2 text-right ${
                        m.tipo === "Entrada" ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {/* m.cantidad ya es +/- desde el backend */}
                      {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                    </td>
                    <td class="border p-2">{m.motivo}</td>
                    <td class="border p-2 text-right font-bold">{m.stock_resultante}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            !cargandoHistorial && <p class="text-center text-gray-500">No hay movimientos registrados en la API.</p>
          )}
        </section>
      )}
    </div>
  );
}