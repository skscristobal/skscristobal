import { useState, useEffect } from "preact/hooks";
import { subirImagenNube } from "@/utils/servicioImagen";

// --- CONFIGURACIÓN ---
const API_URL = import.meta.env.PUBLIC_VITE_API_URL || 'http://127.0.0.1:8000';

// --- UTILIDADES ---
const parseApiError = (errorData) => {
  if (errorData.detail) {
    if (Array.isArray(errorData.detail)) {
      return errorData.detail.map((err) => `${err.loc ? err.loc.join(" -> ") : "Error"}: ${err.msg}`).join("; ");
    }
    return errorData.detail;
  }
  return JSON.stringify(errorData);
};

const money = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
const esCampoVacio = (valor) => valor === null || valor === undefined || valor === '';

export default function GestionProductos() {
  // --- ESTADOS GLOBALES ---
  const [pestanaActiva, setPestanaActiva] = useState("administrar");
  const [productos, setProductos] = useState([]);
  const [listaProveedores, setListaProveedores] = useState([]);

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // --- ESTADOS FORMULARIO ---
  const [productoForm, setProductoForm] = useState({});

  // --- ESTADOS IMAGEN ---
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  // --- ESTADOS MODALES ---
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalStockAbierto, setModalStockAbierto] = useState(false);
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [skuAEliminar, setSkuAEliminar] = useState(null);

  // --- ESTADOS STOCK ---
  const [productoStockActual, setProductoStockActual] = useState(null);
  const [historialStock, setHistorialStock] = useState([]);
  const [movimientoForm, setMovimientoForm] = useState({ tipo: "Entrada", cantidad: "", motivo: "" });
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // ==============================================================================
  // 1. CARGA INICIAL
  // ==============================================================================
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const resProd = await fetch(`${API_URL}/productos/`);
      if (!resProd.ok) throw new Error("Error al cargar productos");
      const dataProd = await resProd.json();
      setProductos(dataProd);

      const resProv = await fetch(`${API_URL}/proveedores/`);
      if (resProv.ok) {
        const dataProv = await resProv.json();
        setListaProveedores(dataProv);
      }
    } catch (err) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  // ==============================================================================
  // 3. AGREGAR PRODUCTO
  // ==============================================================================
  const handleAgregarProducto = async () => {
    if (esCampoVacio(productoForm.sku) || esCampoVacio(productoForm.nombre) || esCampoVacio(productoForm.precio)) {
      setMensaje("SKU, Nombre y Precio son obligatorios.");
      return;
    }
    if (esCampoVacio(productoForm.proveedor)) {
      setMensaje("Debes seleccionar un proveedor.");
      return;
    }

    setMensaje("Procesando...");

    try {
      let urlImagen = "";

      if (archivoSeleccionado) {
        setSubiendoImagen(true);
        setMensaje("Subiendo imagen...");
        urlImagen = await subirImagenNube(archivoSeleccionado, 'producto');
        setSubiendoImagen(false);
      }

      setMensaje("Guardando producto...");
      const params = new URLSearchParams({
        sku: productoForm.sku,
        nombre: productoForm.nombre,
        descripcion: productoForm.descripcion || "",
        precio: productoForm.precio,
        stock: productoForm.stock || 0,
        categoria: productoForm.categoria || "General",
        marca: productoForm.marca || "Sin Marca",
        proveedor: productoForm.proveedor,
        imagen: urlImagen
      });

      const res = await fetch(`${API_URL}/productos/?${params.toString()}`, {
        method: "POST",
        headers: { "Accept": "application/json" }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(parseApiError(errData));
      }

      const nuevo = await res.json();
      const productoGuardado = nuevo.producto || nuevo;

      setProductos([...productos, productoGuardado]);

      setProductoForm({});
      setArchivoSeleccionado(null);
      setPreviewUrl(null);
      setMensaje("✅ Producto agregado exitosamente.");

    } catch (err) {
      setSubiendoImagen(false);
      setMensaje(`Error: ${err.message}`);
    }
  };

  // ==============================================================================
  // 4. EDITAR PRODUCTO (MODIFICADO)
  // ==============================================================================
  const abrirModalEditar = (producto) => {
    setProductoForm({ ...producto });
    setArchivoSeleccionado(null);
    setPreviewUrl(producto.imagen);
    setModalEditarAbierto(true);
    setMensaje("");
  };

  const handleGuardarEdicion = async () => {
    setMensaje("Actualizando...");

    try {
      let urlImagen = productoForm.imagen || "";

      if (archivoSeleccionado) {
        setMensaje("Subiendo nueva imagen...");
        urlImagen = await subirImagenNube(archivoSeleccionado, 'producto');
      }

      // 👇 AQUI ACTUALIZAMOS LOS CAMPOS (STOCK ELIMINADO, PROVEEDOR AGREGADO)
      const params = new URLSearchParams({
        nombre: productoForm.nombre,
        precio: productoForm.precio,
        descripcion: productoForm.descripcion || "",
        // stock: productoForm.stock,  <-- ELIMINADO: El stock se maneja aparte
        categoria: productoForm.categoria,
        marca: productoForm.marca,
        proveedor: productoForm.proveedor,
        imagen: urlImagen
      });

      const res = await fetch(`${API_URL}/productos/${productoForm.sku}?${params.toString()}`, {
        method: "PUT",
        headers: { "Accept": "application/json" }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(parseApiError(errData));
      }

      const respuesta = await res.json();
      const prodActualizado = respuesta.producto || respuesta;

      setProductos(productos.map(p => p.sku === prodActualizado.sku ? prodActualizado : p));
      setModalEditarAbierto(false);
      setMensaje("✅ Producto editado correctamente.");

    } catch (err) {
      setMensaje(`Error al editar: ${err.message}`);
    }
  };

  // ==============================================================================
  // 5. ELIMINAR
  // ==============================================================================
  const abrirModalEliminar = (sku) => {
    setSkuAEliminar(sku);
    setModalEliminarAbierto(true);
    setMensaje("");
  };

  const confirmarEliminacion = async () => {
    if (!skuAEliminar) return;
    try {
      const res = await fetch(`${API_URL}/productos/${skuAEliminar}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(parseApiError(data));
      setProductos(productos.filter(p => p.sku !== skuAEliminar));
      setMensaje(`🗑️ Producto eliminado correctamente.`);
    } catch (err) {
      setMensaje(`❌ Error al eliminar: ${err.message}`);
    } finally {
      setModalEliminarAbierto(false);
      setSkuAEliminar(null);
    }
  };

  // ==============================================================================
  // 6. STOCK
  // ==============================================================================
  const abrirModalStock = async (producto) => {
    setProductoStockActual(producto);
    setModalStockAbierto(true);
    setMovimientoForm({ tipo: "Entrada", cantidad: "", motivo: "" });
    setHistorialStock([]);
    setCargandoHistorial(true);
    setMensaje("");
    try {
      const res = await fetch(`${API_URL}/stock/historial/${producto.sku}`);
      if (res.ok) {
        const data = await res.json();
        setHistorialStock(data);
      }
    } catch (err) { console.error(err); } finally { setCargandoHistorial(false); }
  };

  const registrarMovimiento = async () => {
    if (!productoStockActual || !movimientoForm.cantidad || movimientoForm.cantidad <= 0) {
      alert("Ingrese una cantidad válida."); return;
    }
    const params = new URLSearchParams();
    params.append('sku', productoStockActual.sku);
    params.append('tipo', movimientoForm.tipo);
    params.append('cantidad', movimientoForm.cantidad);
    params.append('motivo', movimientoForm.motivo || "Ajuste manual");

    try {
      const res = await fetch(`${API_URL}/stock/movimiento`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      if (!res.ok) { const errData = await res.json(); throw new Error(parseApiError(errData)); }
      const nuevoMovimiento = await res.json();
      setHistorialStock([nuevoMovimiento, ...historialStock]);
      const nuevoStock = nuevoMovimiento.stock_resultante;
      setProductos(productos.map(p => p.sku === productoStockActual.sku ? { ...p, stock: nuevoStock } : p));
      setProductoStockActual({ ...productoStockActual, stock: nuevoStock });
      setMovimientoForm({ ...movimientoForm, cantidad: "", motivo: "" });
    } catch (err) { alert(`Error: ${err.message}`); }
  };

  // --- HELPERS ---
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setProductoForm({ ...productoForm, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivoSeleccionado(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.sku.toString().includes(busqueda)
  );

  return (
    <div class="w-full max-w-7xl mx-auto p-4">

      {/* HEADER */}
      <div class="flex flex-col md:flex-row justify-end items-center mb-6 gap-4">
        <div class="flex bg-white rounded-lg shadow overflow-hidden">
          <button
            onClick={() => setPestanaActiva("administrar")}
            class={`px-6 py-3 font-semibold transition ${pestanaActiva === 'administrar' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            📋 Administrar
          </button>
          <button
            onClick={() => { setPestanaActiva("agregar"); setProductoForm({}); setMensaje(""); setArchivoSeleccionado(null); setPreviewUrl(null); }}
            class={`px-6 py-3 font-semibold transition ${pestanaActiva === 'agregar' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            + Agregar Nuevo
          </button>
        </div>
      </div>

      {mensaje && (
        <div class={`mb-4 p-4 rounded-lg shadow-sm text-center font-medium ${mensaje.includes('Error') || mensaje.includes('❌') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {mensaje}
        </div>
      )}

      {/* VISTA ADMINISTRAR */}
      {pestanaActiva === "administrar" && (
        <div class="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/50">
          <div class="mb-6">
            <input type="text" placeholder="🔍 Buscar producto por Nombre o SKU..." value={busqueda} onInput={(e) => setBusqueda(e.target.value)} class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
          </div>

          {cargando ? (
            <p class="text-center text-gray-500 py-10">Cargando inventario...</p>
          ) : (
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {productosFiltrados.map(p => (
                <div key={p.sku} class="bg-white rounded-xl shadow-md hover:shadow-xl transition border border-gray-100 overflow-hidden flex flex-col">
                  <div class="p-5 flex-grow">
                    <div class="flex justify-between items-start mb-2">
                      <div class="flex items-center gap-3 w-full">
                        <div class="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                          {p.imagen ? <img src={p.imagen} alt={p.nombre} class="w-full h-full object-cover" /> : <div class="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                        </div>
                        <div class="flex-1 min-w-0">
                          <h3 class="font-bold text-lg text-gray-800 leading-tight truncate">{p.nombre}</h3>
                          <span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded font-mono">#{p.sku}</span>
                        </div>
                      </div>
                    </div>
                    <p class="text-sm text-gray-500 mb-1 h-10 overflow-hidden line-clamp-2">{p.descripcion || "Sin descripción"}</p>
                    <p class="text-xs text-gray-400 mb-3">Prov: <span class="font-semibold text-gray-600">{p.proveedor || 'N/A'}</span></p>
                    <div class="flex justify-between items-end">
                      <div><p class="text-xs text-gray-400">Precio</p><p class="text-xl font-bold text-green-700">{money(p.precio)}</p></div>
                      <div class="text-right"><p class="text-xs text-gray-400">Stock</p><p class={`text-xl font-bold ${p.stock < 10 ? 'text-red-600' : 'text-blue-700'}`}>{p.stock}</p></div>
                    </div>
                  </div>
                  <div class="bg-gray-50 p-3 flex justify-between border-t border-gray-100">
                    <button onClick={() => abrirModalEditar(p)} class="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm font-medium transition">✏️ Editar</button>
                    <button onClick={() => abrirModalStock(p)} class="text-purple-600 hover:bg-purple-50 px-3 py-1 rounded text-sm font-medium transition">📦 Stock</button>
                    <button onClick={() => abrirModalEliminar(p.sku)} class="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm font-medium transition">🗑️ Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VISTA AGREGAR */}
      {pestanaActiva === "agregar" && (
        <div class="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-8 border border-white/50 max-w-3xl mx-auto">
          <h2 class="text-2xl font-bold mb-6 text-gray-800">Nuevo Producto</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
              {previewUrl ? (
                <img src={previewUrl} alt="Vista previa" class="h-32 object-contain mb-2 rounded shadow-sm" />
              ) : (
                <div class="text-gray-400 text-4xl mb-2">📷</div>
              )}
              <label class="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition">
                {archivoSeleccionado ? "Cambiar Imagen" : "Seleccionar Imagen"}
                <input type="file" accept="image/*" onChange={handleFileChange} class="hidden" />
              </label>
              <p class="text-xs text-gray-500 mt-2">JPG, PNG o WEBP</p>
            </div>
            <div><label class="block text-sm font-medium text-gray-700">SKU (Único)</label><input name="sku" type="number" value={productoForm.sku || ""} onInput={handleFormChange} class="mt-1 w-full p-2 border rounded-md" placeholder="Ej: 101" /></div>
            <div><label class="block text-sm font-medium text-gray-700">Nombre</label><input name="nombre" type="text" value={productoForm.nombre || ""} onInput={handleFormChange} class="mt-1 w-full p-2 border rounded-md" /></div>
            <div><label class="block text-sm font-medium text-gray-700">Precio</label><input name="precio" type="number" value={productoForm.precio || ""} onInput={handleFormChange} class="mt-1 w-full p-2 border rounded-md" /></div>
            <div><label class="block text-sm font-medium text-gray-700">Stock Inicial</label><input name="stock" type="number" value={productoForm.stock || ""} onInput={handleFormChange} class="mt-1 w-full p-2 border rounded-md" /></div>
            <div><label class="block text-sm font-medium text-gray-700">Categoría</label><input name="categoria" type="text" value={productoForm.categoria || ""} onInput={handleFormChange} class="mt-1 w-full p-2 border rounded-md" /></div>
            <div><label class="block text-sm font-medium text-gray-700">Marca</label><input name="marca" type="text" value={productoForm.marca || ""} onInput={handleFormChange} class="mt-1 w-full p-2 border rounded-md" /></div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700">Proveedor</label>
              <select name="proveedor" value={productoForm.proveedor || ""} onChange={handleFormChange} class="mt-1 w-full p-2 border rounded-md bg-white">
                <option value="">-- Seleccione un Proveedor --</option>
                {listaProveedores.map(prov => (
                  <option key={prov.id_proveedor} value={prov.nombre_empresa}>{prov.nombre_empresa}</option>
                ))}
              </select>
            </div>
            <div class="md:col-span-2"><label class="block text-sm font-medium text-gray-700">Descripción</label><textarea name="descripcion" value={productoForm.descripcion || ""} onInput={handleFormChange} class="mt-1 w-full p-2 border rounded-md" rows="3"></textarea></div>
          </div>
          <div class="mt-6 flex justify-end">
            <button onClick={handleAgregarProducto} disabled={subiendoImagen} class="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg font-semibold shadow transition disabled:bg-gray-400">
              {subiendoImagen ? "Subiendo..." : "Guardar Producto"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL EDITAR (CON LOS NUEVOS CAMPOS) */}
      {modalEditarAbierto && (
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 m-4">
            <h3 class="text-xl font-bold mb-4 text-gray-800">Editar: {productoForm.nombre}</h3>

            <div class="mb-4 flex justify-center">
              <div class="relative group cursor-pointer">
                <div class="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300 bg-gray-50 shadow-inner">
                  {previewUrl ? <img src={previewUrl} class="w-full h-full object-cover" /> : <div class="flex items-center justify-center h-full text-3xl">📷</div>}
                </div>
                <label class="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-bold opacity-0 group-hover:opacity-100 rounded-full transition">
                  Cambiar <input type="file" accept="image/*" onChange={handleFileChange} class="hidden" />
                </label>
              </div>
            </div>

            <div class="space-y-3">
              {/* Nombre */}
              <div>
                <label class="text-xs font-bold text-gray-500">Nombre</label>
                <input name="nombre" value={productoForm.nombre} onInput={handleFormChange} class="w-full border p-2 rounded" />
              </div>

              {/* Precio (Solo precio, stock se fue) */}
              <div>
                <label class="text-xs font-bold text-gray-500">Precio</label>
                <input name="precio" type="number" value={productoForm.precio} onInput={handleFormChange} class="w-full border p-2 rounded" />
              </div>

              {/* Categoría y Marca */}
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-bold text-gray-500">Categoría</label>
                  <input name="categoria" value={productoForm.categoria} onInput={handleFormChange} class="w-full border p-2 rounded" />
                </div>
                <div>
                  <label class="text-xs font-bold text-gray-500">Marca</label>
                  <input name="marca" value={productoForm.marca} onInput={handleFormChange} class="w-full border p-2 rounded" />
                </div>
              </div>

              {/* Proveedor */}
              <div>
                <label class="text-xs font-bold text-gray-500">Proveedor</label>
                <select name="proveedor" value={productoForm.proveedor} onChange={handleFormChange} class="w-full border p-2 rounded bg-white">
                  <option value="">-- Seleccione --</option>
                  {listaProveedores.map(prov => (
                    <option key={prov.id_proveedor} value={prov.nombre_empresa}>{prov.nombre_empresa}</option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label class="text-xs font-bold text-gray-500">Descripción</label>
                <textarea name="descripcion" value={productoForm.descripcion} onInput={handleFormChange} class="w-full border p-2 rounded" rows="2" />
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalEditarAbierto(false)} class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={handleGuardarEdicion} disabled={subiendoImagen} class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow disabled:bg-gray-400">
                {subiendoImagen ? "Subiendo..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL STOCK */}
      {modalStockAbierto && productoStockActual && (
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-0 m-4 overflow-hidden flex flex-col max-h-[90vh]">
            <div class="bg-gray-100 p-4 border-b flex justify-between items-center">
              <div>
                <h3 class="text-lg font-bold text-gray-800">Gestión de Stock: <span class="text-blue-700">{productoStockActual.nombre}</span></h3>
                <p class="text-sm text-gray-500">SKU: {productoStockActual.sku} | Stock Actual: <span class="font-bold text-black">{productoStockActual.stock}</span></p>
              </div>
              <button onClick={() => setModalStockAbierto(false)} class="text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div class="flex-1 overflow-auto p-6">
              <div class="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                <h4 class="font-semibold text-blue-900 mb-3">Registrar Movimiento</h4>
                <div class="flex flex-col sm:flex-row gap-3 items-end">
                  <div class="w-full sm:w-1/4"><label class="block text-xs font-bold text-gray-500 mb-1">Tipo</label><select value={movimientoForm.tipo} onChange={(e) => setMovimientoForm({ ...movimientoForm, tipo: e.target.value })} class="w-full border p-2 rounded bg-white"><option value="Entrada">📥 Entrada</option><option value="Salida">📤 Salida</option></select></div>
                  <div class="w-full sm:w-1/4"><label class="block text-xs font-bold text-gray-500 mb-1">Cantidad</label><input type="number" value={movimientoForm.cantidad} onInput={(e) => setMovimientoForm({ ...movimientoForm, cantidad: e.target.value })} placeholder="0" class="w-full border p-2 rounded" /></div>
                  <div class="w-full sm:w-2/4"><label class="block text-xs font-bold text-gray-500 mb-1">Motivo</label><input type="text" value={movimientoForm.motivo} onInput={(e) => setMovimientoForm({ ...movimientoForm, motivo: e.target.value })} placeholder="Ej: Compra" class="w-full border p-2 rounded" /></div>
                  <button onClick={registrarMovimiento} class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium">Registrar</button>
                </div>
              </div>
              <h4 class="font-bold text-gray-700 mb-2">Historial de Movimientos</h4>
              <div class="border rounded-lg overflow-hidden">
                <table class="w-full text-sm text-left"><thead class="bg-gray-50 text-gray-600"><tr><th class="p-3">Fecha</th><th class="p-3">Tipo</th><th class="p-3 text-right">Cant.</th><th class="p-3">Motivo</th><th class="p-3 text-right">Stock Final</th></tr></thead><tbody class="divide-y">{cargandoHistorial ? (<tr><td colspan="5" class="p-4 text-center">Cargando...</td></tr>) : historialStock.map((m, i) => (<tr key={i} class="hover:bg-gray-50"><td class="p-3 text-gray-500">{new Date(m.fecha).toLocaleString('es-CL')}</td><td class="p-3 font-medium"><span class={`px-2 py-1 rounded text-xs ${m.tipo === 'Entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{m.tipo}</span></td><td class="p-3 text-right font-mono">{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td><td class="p-3 text-gray-700">{m.motivo}</td><td class="p-3 text-right font-bold">{m.stock_resultante}</td></tr>))}</tbody></table>
              </div>
            </div>
            <div class="bg-gray-50 p-3 text-right border-t"><button onClick={() => setModalStockAbierto(false)} class="px-5 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">Cerrar</button></div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {modalEliminarAbierto && (
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm">
          <div class="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center border-t-4 border-red-500 animate-scale-in">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">¿Eliminar Producto?</h3>
            <p class="text-gray-600 mb-6 text-sm">
              Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar el producto con SKU <strong>{skuAEliminar}</strong>?
            </p>
            <div class="flex justify-center gap-4">
              <button onClick={() => setModalEliminarAbierto(false)} class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition">Cancelar</button>
              <button onClick={confirmarEliminacion} class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold shadow-md transition">Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}