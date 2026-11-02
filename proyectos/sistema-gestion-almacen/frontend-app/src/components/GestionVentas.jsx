import { useState, useEffect } from "preact/hooks";

// --- CONFIGURACIÓN ---
const API_URL = import.meta.env.PUBLIC_VITE_API_URL || 'http://127.0.0.1:8000';

// --- UTILIDADES ---
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

const money = (n) => new Intl.NumberFormat('es-CL', { style:'currency', currency:'CLP', maximumFractionDigits:0 }).format(n);

const formatQuantity = (q) => {
    return Number.isInteger(q) ? parseInt(q) : q;
}

// Función para obtener fecha y hora local (Chile) en formato ISO
const getFechaHoraLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export default function GestionVentas() {
  // --- Estados del TPV ---
  const [productos, setProductos] = useState([]); 
  const [busqueda, setBusqueda] = useState("");
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [carritoVisible, setCarritoVisible] = useState(false);
  const [carrito, setCarrito] = useState([]);
  const [cantidades, setCantidades] = useState({});

  const [cargando, setCargando] = useState(false);
  const [cargandoProductos, setCargandoProductos] = useState(true);

  // --- Estados de Venta ---
  const [ultimaVenta, setUltimaVenta] = useState(null);
  const [productosUltimaVenta, setProductosUltimaVenta] = useState([]); 
  
  const [cajero, setCajero] = useState(null);
  const [metodoPago, setMetodoPago] = useState("Efectivo"); 
  
  // --- Estado del Cliente (LIMPIO) ---
  const [clienteData, setClienteData] = useState({
      rut: '', nombre: '', correo: '' 
  });

  // --- Estados para Vuelto ---
  const [montoEntregado, setMontoEntregado] = useState("");
  const [vuelto, setVuelto] = useState(0);

  // --- ESTADOS PARA UI PERSONALIZADA ---
  const [notification, setNotification] = useState({ show: false, msg: '', type: 'success' });
  const [showConfirmEmail, setShowConfirmEmail] = useState(false);

  // Función auxiliar para mostrar notificaciones bonitas
  const showToast = (msg, type = 'success') => {
      setNotification({ show: true, msg, type });
      setTimeout(() => setNotification({ ...notification, show: false }), 4000);
  };

  // --- Lógica de Inicialización ---
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("usuario_logueado");
    if (usuarioGuardado) {
      const usuario = JSON.parse(usuarioGuardado);
      if (usuario.rol === 'cajero') {
        setCajero(usuario);
      } else {
        window.location.href = '/login'; 
      }
    } else {
      window.location.href = '/login';
    }

    const btn = document.getElementById("carrito-btn");
    if (btn && !btn.dataset.listenerAdded) {
      btn.addEventListener("click", () => setCarritoVisible((prev) => !prev));
      btn.dataset.listenerAdded = "true";
    }
  }, []); 

  const cargarProductos = async () => {
    setCargandoProductos(true);
    try {
      const res = await fetch(`${API_URL}/productos/`);
      if (!res.ok) throw new Error("No se pudieron cargar los productos");
      const data = await res.json();
      setProductos(data);
    } catch (err) {
      showToast(`Error al cargar productos: ${err.message}`, 'error');
    } finally {
      setCargandoProductos(false);
    }
  };

  useEffect(() => {
    if (cajero) {
      cargarProductos();
    }
  }, [cajero]); 

  useEffect(() => {
    const guardado = localStorage.getItem("carrito");
    if (guardado) setCarrito(JSON.parse(guardado));
  }, []);

  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  // --- CÁLCULO DE VUELTO ---
  const total = carrito.reduce((sum, p) => sum + p.producto.precio * p.cantidad, 0);

  useEffect(() => {
    if (montoEntregado && !isNaN(montoEntregado)) {
        setVuelto(parseInt(montoEntregado) - total);
    } else {
        setVuelto(0);
    }
  }, [montoEntregado, total]);

  // --- LÓGICA DE COMPRA ---
  const handleComprar = async () => {
    if (carrito.length === 0) {
      showToast("El carrito está vacío.", "error");
      return;
    }
    if (!cajero) {
      showToast("Error: No se ha identificado al cajero.", "error");
      return;
    }
    
    // Validación simplificada: Solo RUT, Nombre y Correo
    if (!clienteData.rut || !clienteData.nombre || !clienteData.correo) {
      showToast("Faltan datos del cliente (RUT, Nombre, Correo).", "error");
      return;
    }
    
    // Validación de pago en efectivo
    if (metodoPago === "Efectivo" && parseInt(montoEntregado) < total) {
        return showToast("⚠️ El monto entregado es menor al total.", "error");
    }

    setCargando(true);
    showToast("Procesando venta...", "info"); 
    setUltimaVenta(null); 

    const fechaHoraLocal = getFechaHoraLocal();

    const paramsVenta = new URLSearchParams({
      id_empleado: cajero.id_empleado, 
      metodo_de_pago: metodoPago, 
      rut_cliente: clienteData.rut, 
      total_venta: total.toString(),
      fecha_venta: fechaHoraLocal 
    });

    try {
      // 1. Crear Venta Base
      const resVenta = await fetch(`${API_URL}/ventas/?${paramsVenta.toString()}`, { method: 'POST' });
      if (!resVenta.ok) {
        const errData = await resVenta.json();
        throw new Error(`Error al crear venta: ${parseApiError(errData)}`);
      }
      const ventaCreadaResponse = await resVenta.json();
      const ventaCreada = ventaCreadaResponse.venta;

      // 2. Asignar Cliente (AQUÍ RELLENAMOS LOS DATOS FALTANTES AUTOMÁTICAMENTE)
      const paramsCliente = new URLSearchParams({
        rut_cliente: clienteData.rut,
        nombre_completo: clienteData.nombre,
        correo: clienteData.correo,
        // --- DATOS POR DEFECTO PARA EL BACKEND ---
        direccion: "Local",
        celular: "00000000",
        fecha_de_nacimiento: "2000-01-01" 
        // ----------------------------------------
      });
      
      const resCliente = await fetch(`${API_URL}/ventas/${ventaCreada.id_venta}/cliente?${paramsCliente.toString()}`, { method: 'POST' });
      
      if (!resCliente.ok) {
        const errData = await resCliente.json();
        throw new Error(`Fallo al asignar cliente: ${parseApiError(errData)}`);
      }
      
      const ventaConCliente = await resCliente.json();
      const ventaFinal = ventaConCliente.venta;

      // 3. Actualizar Stock
      for (const item of carrito) {
        const paramsStock = new URLSearchParams({
          sku: item.producto.sku.toString(),
          tipo: "Salida",
          cantidad: item.cantidad.toString(),
          motivo: `Venta ID: ${ventaCreada.id_venta}`
        });
        await fetch(`${API_URL}/stock/movimiento`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: paramsStock.toString(),
        });
      }

      // --- ÉXITO ---
      showToast("✅ ¡Venta registrada correctamente!", "success");
      setUltimaVenta(ventaFinal);
      setProductosUltimaVenta([...carrito]); 
      setCarrito([]); 
      setCantidades({});
      setMontoEntregado(""); 
      setVuelto(0);
      cargarProductos();

    } catch (err) {
      showToast(`Error en la compra: ${err.message}`, "error");
    } finally {
      setCargando(false);
    }
  };

  // --- PREPARAR CORREO ---
  const handlePreparaCorreo = () => {
    if (!ultimaVenta) return;
    if (!clienteData.correo) {
        showToast("No hay un correo registrado para el cliente.", "error");
        return;
    }
    setShowConfirmEmail(true);
  };

  // --- EJECUTAR ENVÍO ---
  const confirmarEnvioCorreo = async () => {
    setShowConfirmEmail(false); 
    showToast(`Generando y enviando correo a ${clienteData.correo}...`, "info");
    
    const emailDestino = clienteData.correo;
    const payload = {
        email: emailDestino,
        items: productosUltimaVenta.map(p => ({
            nombre: p.producto.nombre,
            cantidad: parseInt(p.cantidad),
            precio: parseInt(p.producto.precio)
        })),
        cliente: {
            nombre: clienteData.nombre,
            rut: clienteData.rut
        },
        vendedor: cajero ? `${cajero.nombre} (ID: ${cajero.id_empleado})` : "Cajero"
    };

    try {
        const res = await fetch(`${API_URL}/ventas/${ultimaVenta.id_venta}/enviar-correo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast(`✅ Boleta enviada correctamente a ${emailDestino}`, "success");
        } else {
            const err = await res.json();
            showToast("Error al enviar: " + (err.detail || "Error desconocido"), "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Error de conexión al enviar correo.", "error");
    }
  };

  const handleClienteChange = (e) => {
      const { name, value } = e.target;
      setClienteData(prev => ({ ...prev, [name]: value }));
  };

  // --- Funciones de Carrito ---
  const filtrados = productos
    .filter((p) => p.stock > 0)
    .filter((p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.sku && p.sku.toString().toLowerCase().includes(busqueda.toLowerCase()))
    );
  const handleBuscar = () => setMostrarResultados(true);
  
  const agregarAlCarrito = (producto) => {
    const cantidad = cantidades[producto.sku] || 1;
    if (cantidad > producto.stock) { 
        showToast(`Solo hay ${producto.stock} unidades disponibles`, "error"); 
        return; 
    }
    const existe = carrito.find((p) => p.producto.sku === producto.sku);
    if (existe) { 
        setCarrito(carrito.map((p) => p.producto.sku === producto.sku ? { ...p, cantidad: p.cantidad + cantidad } : p)); 
    } else { 
        setCarrito([...carrito, { producto, cantidad }]); 
    }
    setCarritoVisible(true);
    showToast("Producto agregado", "success");
  };
  
  const eliminarDelCarrito = (sku) => { setCarrito(carrito.filter((p) => p.producto.sku !== sku)); };
  const actualizarCantidad = (sku, nuevaCantidad) => { setCantidades({ ...cantidades, [sku]: nuevaCantidad }); };
  const modificarCantidadEnCarrito = (sku, nuevaCantidad) => {
    if (nuevaCantidad <= 0) return;
    setCarrito(
      carrito.map((p) =>
        p.producto.sku === sku ? { ...p, cantidad: nuevaCantidad } : p
      )
    );
  };

  // --- RENDERIZADO ---
  return (
    <div class="flex flex-col items-center gap-10 w-full relative">
      
      {/* NOTIFICACIÓN TOAST */}
      {notification.show && (
        <div class={`fixed top-24 right-5 z-[9999] px-6 py-4 rounded-lg shadow-2xl text-white font-bold transform transition-all duration-500 animate-fade-in-up flex items-center gap-3 ${
            notification.type === 'error' ? 'bg-red-600' : 
            notification.type === 'info' ? 'bg-blue-600' : 'bg-green-600'
        }`}>
            <span>{notification.type === 'error' ? '⚠️' : notification.type === 'info' ? 'ℹ️' : '✅'}</span>
            {notification.msg}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN CORREO */}
      {showConfirmEmail && (
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] backdrop-blur-sm">
            <div class="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center animate-scale-in">
                <div class="text-5xl mb-4">📧</div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">Confirmar Envío</h3>
                <p class="text-gray-600 mb-6">
                    ¿Deseas enviar la boleta al correo <strong>{clienteData.correo}</strong>?
                </p>
                <div class="flex justify-center gap-4">
                    <button onClick={() => setShowConfirmEmail(false)} class="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 font-semibold">
                        Cancelar
                    </button>
                    <button onClick={confirmarEnvioCorreo} class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-lg">
                        Sí, Enviar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Buscador */}
      <section class="bg-gray-200 bg-opacity-90 p-6 rounded-lg shadow-lg w-11/12 max-w-4xl">
        <h2 class="text-lg font-semibold text-center mb-4 text-gray-800">
          Buscador de Productos
        </h2>
        {cajero && (
          <p class="text-center text-gray-700 mb-4">
            Atendiendo: <strong>{cajero.nombre}</strong> (ID: {cajero.id_empleado})
          </p>
        )}
        {cargandoProductos && <p class="text-center text-gray-600">Cargando productos...</p>}
        <div class="flex justify-center space-x-2">
          <input type="text" placeholder="Buscar por NOMBRE o SKU" value={busqueda} onInput={(e) => setBusqueda(e.target.value)} class="w-2/3 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600" disabled={!cajero} />
          <button onClick={handleBuscar} class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md" disabled={!cajero}>Buscar</button>
        </div>
      </section>

      {/* Resultados */}
      {mostrarResultados && (
        <section class="bg-gray-200 bg-opacity-90 p-6 rounded-lg shadow-lg w-11/12 max-w-6xl">
           <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtrados.length > 0 ? (
              filtrados.map((p) => (
                <div key={p.sku} class="bg-white rounded-lg shadow-md flex flex-col items-center p-4 hover:shadow-xl transition-shadow relative overflow-hidden group">
                  
                  {/* FOTO PRODUCTO (Cloudinary) */}
                  <div class="w-full h-32 bg-gray-100 flex items-center justify-center rounded-md mb-2 overflow-hidden">
                    {p.imagen ? (
                      <img 
                        src={p.imagen} 
                        alt={p.nombre} 
                        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    ) : (
                      <span class="text-4xl">🛍️</span>
                    )}
                  </div>

                  <p class="mt-2 font-semibold text-gray-800">{p.nombre}</p>
                  <p class="text-xs text-gray-500 text-center mb-1 line-clamp-2" title={p.descripcion}>{p.descripcion}</p>
                  <p class="text-sm text-gray-700 font-bold">{money(p.precio)}</p>
                  <p class="text-sm text-gray-500 mb-2">Stock: {p.stock}</p>
                  <div class="flex items-center gap-2 mt-2">
                    <input type="number" min="1" max={p.stock} value={cantidades[p.sku] || 1} onInput={(e) => actualizarCantidad(p.sku, parseInt(e.target.value))} class="w-16 text-center border rounded-md" />
                  </div>
                  <button onClick={() => agregarAlCarrito(p)} class="mt-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm transition-colors"> Agregar </button>
                </div>
              ))
            ) : (
               <p class="text-center text-gray-600 col-span-full">No se encontraron productos.</p>
            )}
          </div>
        </section>
      )}

      {/* Carrito y Formulario */}
      {carritoVisible && (
        <section class="bg-gray-200 bg-opacity-90 p-6 rounded-lg shadow-lg w-11/12 max-w-4xl">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Carrito de Compras</h2>
          {carrito.length > 0 ? (
            carrito.map(({ producto, cantidad }) => (
              <div key={producto.sku} class="bg-white rounded-md shadow-sm p-4 mb-3 flex justify-between items-center">
                <div class="flex items-center gap-3">
                   {/* Miniatura Carrito */}
                   <div class="w-12 h-12 flex-shrink-0 bg-gray-100 rounded overflow-hidden flex items-center justify-center border border-gray-200">
                     {producto.imagen ? (
                       <img src={producto.imagen} alt={producto.nombre} class="w-full h-full object-cover" />
                     ) : (
                       <span class="text-xl">🛍️</span>
                     )}
                   </div>
                   <div>
                      <h3 class="font-semibold text-gray-800">{producto.nombre}</h3>
                      <p class="text-sm text-gray-500">{money(producto.precio)}</p>
                   </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-sm font-semibold pr-2">{formatQuantity(cantidad)} unid.</span>
                  <input type="number" min="1" max={producto.stock} value={cantidad} onInput={(e) => modificarCantidadEnCarrito(producto.sku, parseInt(e.target.value))} class="w-16 border rounded-md text-center" />
                  <button onClick={() => eliminarDelCarrito(producto.sku)} class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"> Eliminar </button>
                </div>
              </div>
            ))
          ) : (
            <p class="text-gray-500 text-center">No hay productos en el carrito.</p>
          )}
          
          <div class="grid grid-cols-1 mt-4">
              <div class="p-3 bg-white/70 rounded-md">
                <label for="metodo_pago" class="block text-sm font-semibold text-gray-800 mb-2">Método de Pago:</label>
                <select id="metodo_pago" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600">
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                  <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                </select>
              </div>
          </div>
          
           <div class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md space-y-3">
              <label class="block text-sm font-bold text-gray-800 border-b border-yellow-200 pb-2">Datos del Cliente (Requeridos para Boleta):</label>
              
              {/* 👇 FORMULARIO SIMPLIFICADO: Solo 3 campos */}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="text" name="rut" value={clienteData.rut} onInput={handleClienteChange} placeholder="RUT Cliente *" class={`w-full p-2 border rounded-md ${!clienteData.rut ? 'border-red-300 bg-red-50' : ''}`} required />
                  <input type="text" name="nombre" value={clienteData.nombre} onInput={handleClienteChange} placeholder="Nombre Completo *" class={`w-full p-2 border rounded-md ${!clienteData.nombre ? 'border-red-300 bg-red-50' : ''}`} required />
                  
                  {/* Correo toma todo el ancho */}
                  <div class="md:col-span-2">
                    <input type="email" name="correo" value={clienteData.correo} onInput={handleClienteChange} placeholder="Correo Electrónico *" class={`w-full p-2 border rounded-md ${!clienteData.correo ? 'border-red-300 bg-red-50' : ''}`} required />
                  </div>
              </div>
           </div>

          {/* 🔥 CALCULADORA DE VUELTO (Solo visible en Efectivo) */}
          {metodoPago === 'Efectivo' && (
            <div class="mt-4 p-3 bg-white rounded-md border border-gray-200 flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <label class="text-sm font-bold text-gray-700">Paga con:</label>
                    <input 
                        type="number" 
                        value={montoEntregado} 
                        onInput={(e) => setMontoEntregado(e.target.value)} 
                        placeholder="$ 0"
                        class="w-24 p-1 border rounded text-right" 
                    />
                </div>
                <div class="text-right">
                    <p class="text-xs text-gray-500">Vuelto:</p>
                    <p class={`text-lg font-mono font-bold ${vuelto < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {money(vuelto)}
                    </p>
                </div>
            </div>
          )}

          <div class="text-right font-semibold text-gray-800 mt-4 text-xl">
            Total a Pagar: <span class="text-green-700 font-bold">${total.toLocaleString("es-CL")}</span>
          </div>

          <div class="flex justify-end gap-3 mt-6 border-t pt-4">
            <button onClick={handleComprar} disabled={cargando || carrito.length === 0 || !cajero} class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-bold disabled:bg-gray-400 shadow-lg transform hover:scale-105 transition">
              {cargando ? "Procesando..." : "CONFIRMAR COMPRA"}
            </button>
            
            {/* BOTÓN DE ENVÍO DE CORREO (Visible tras compra exitosa) */}
            {ultimaVenta && (
               <div className="flex gap-2 animate-fade-in">
                    <button onClick={handlePreparaCorreo} class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-md font-bold shadow-lg flex items-center gap-2 transition hover:scale-105">
                        📧 Enviar Boleta al Correo
                    </button>
               </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}