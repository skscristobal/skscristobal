import { h } from 'preact';
import { useState } from 'preact/hooks';

// --- FUNCIÓN DE UTILIDAD PARA DESCARGAS ---
function downloadFile(content, fileName, mimeType) {
  const universalBOM = "\uFEFF"; 
  const blob = new Blob([universalBOM + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const API_URL = import.meta.env.PUBLIC_VITE_API_URL || 'http://127.0.0.1:8000';

export default function ReportesManager() {
  // --- ESTADOS PARA LA BÚSQUEDA (TABLA - IZQUIERDA) ---
  const [fechaBusqueda, setFechaBusqueda] = useState(new Date().toISOString().split('T')[0]);
  const [reporteData, setReporteData] = useState(null);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');

  // --- ESTADOS PARA EL ENVÍO DE CORREO (DERECHA) ---
  const [emailDestino, setEmailDestino] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); 

  // =======================================================
  // LÓGICA 1: MOSTRAR TABLA Y EXPORTAR ARCHIVOS
  // =======================================================
  const handleFiltrarPorFecha = async (e) => {
    e.preventDefault();
    if (!fechaBusqueda) return;
    
    setLoadingBusqueda(true);
    setErrorBusqueda('');
    setReporteData(null); 

    try {
      const url = `${API_URL}/ventas/por-fecha/?fecha=${fechaBusqueda}`;
      const response = await fetch(url);
      
      if (response.status === 404) {
        setErrorBusqueda(`No se encontraron ventas para el ${fechaBusqueda}.`);
        setReporteData({ ventas: [], total_dia: 0 }); 
      } else if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      } else {
        const data = await response.json();
        setReporteData(data);
      }
    } catch (err) {
      console.error(err);
      setErrorBusqueda('Error de conexión con el backend.');
    } finally {
      setLoadingBusqueda(false);
    }
  };

  const handleExportCSV = () => {
    if (!reporteData || reporteData.ventas.length === 0) return;
    const { ventas, total_dia } = reporteData;
    
    const headers = ["ID Venta", "RUT Cliente", "ID Empleado", "Metodo de Pago", "Monto Total"];
    const escapeText = (val) => `"${String(val).replace(/"/g, '""')}"`;
    const forceExcelText = (val) => `="""${String(val).replace(/"/g, '""')}"""`;

    let csvContent = headers.join(";") + "\n"; 
    ventas.forEach(venta => {
      const rutCliente = venta.cliente?.rut_cliente || 'No disponible';
      const row = [
        venta._id || venta.id_venta,
        forceExcelText(rutCliente),
        venta.id_empleado,
        escapeText(venta.metodo_de_pago),
        venta.total_venta
      ].join(";"); 
      csvContent += row + "\n";
    });
    csvContent += `\n;;;${escapeText("Total del Dia")};${total_dia}`;
    downloadFile(csvContent, `reporte_ventas_${fechaBusqueda}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExportXML = () => {
    if (!reporteData || reporteData.ventas.length === 0) return;
    const { ventas, total_dia } = reporteData;
    
    const escapeXML = (str) => String(str).replace(/[<>&"']/g, c => {
        switch (c) { case '<': return '&lt;'; case '>': return '&gt;'; case '&': return '&amp;'; case '"': return '&quot;'; case "'": return '&apos;'; default: return c; }
    });

    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlContent += `<ReporteVentas fecha="${fechaBusqueda}">\n  <Ventas>\n`;
    ventas.forEach(venta => {
      xmlContent += `    <Venta id="${venta._id || venta.id_venta}">\n`;
      xmlContent += `      <RUTCliente>${escapeXML(venta.cliente?.rut_cliente || 'N/A')}</RUTCliente>\n`;
      xmlContent += `      <IDEmpleado>${venta.id_empleado}</IDEmpleado>\n`;
      xmlContent += `      <MetodoPago>${escapeXML(venta.metodo_de_pago)}</MetodoPago>\n`;
      xmlContent += `      <MontoTotal>${venta.total_venta}</MontoTotal>\n`;
      xmlContent += '    </Venta>\n';
    });
    xmlContent += `  </Ventas>\n  <TotalDia>${total_dia}</TotalDia>\n</ReporteVentas>`;
    downloadFile(xmlContent, `reporte_ventas_${fechaBusqueda}.xml`, 'application/xml;charset=utf-8;');
  };

  // =======================================================
  // LÓGICA 2: ENVIAR CORREO (HOY)
  // =======================================================
  const handleEnviarCorreo = async (e) => {
    e.preventDefault();
    if (!emailDestino) return;

    setSendingEmail(true);
    setEmailStatus(null);

    try {
      // 1. Ajustado al router del backend: /reportes/enviar-reporte-diario
      // 2. Enviamos el email como parámetro en la URL
      const url = `${API_URL}/reportes/enviar-reporte-diario?email_destino=${encodeURIComponent(emailDestino)}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al enviar el correo');
      }

      setEmailStatus({ type: 'success', msg: `¡Enviado! Reporte de hoy enviado a ${emailDestino}` });
      setEmailDestino(''); 
    } catch (err) {
      console.error(err);
      setEmailStatus({ type: 'error', msg: 'Error al enviar. Verifica la conexión.' });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div class="w-full max-w-7xl mx-auto p-4 space-y-8">
      
      {/* GRID PRINCIPAL: SEPARANDO LAS DOS FUNCIONALIDADES */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* =================================================
            COLUMNA 1 (Ancha): CONSULTA HISTÓRICA Y EXPORTACIÓN 
           ================================================= */}
        <div class="lg:col-span-2 bg-white/30 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl p-6 h-fit">
          <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            Consultar Historial de Ventas
          </h2>
          
          <form onSubmit={handleFiltrarPorFecha} class="flex flex-wrap items-end gap-4 mb-6 border-b pb-6 border-gray-200">
            <div class="flex-grow sm:flex-grow-0 sm:w-1/2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Selecciona Fecha a Consultar</label>
              <input
                type="date"
                value={fechaBusqueda}
                onInput={(e) => setFechaBusqueda(e.currentTarget.value)}
                class="w-full px-4 py-2 bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loadingBusqueda}
              class="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-md disabled:bg-gray-400"
            >
              {loadingBusqueda ? 'Cargando...' : 'Ver Tabla'}
            </button>
          </form>

          {/* Mensajes de error de búsqueda */}
          {errorBusqueda && <div class="bg-red-100 text-red-800 p-3 rounded-lg mb-4 text-sm">{errorBusqueda}</div>}

          {/* Botones de exportación (Solo si hay datos) */}
          {reporteData && reporteData.ventas.length > 0 && (
            <div class="flex justify-end gap-2 mb-3 animate-fade-in">
              <button onClick={handleExportCSV} class="text-sm px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition shadow">Descargar Excel</button>
              <button onClick={handleExportXML} class="text-sm px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition shadow">Descargar XML</button>
            </div>
          )}

          {/* Tabla de Resultados */}
          {reporteData ? (
            <div class="animate-fade-in">
              <TablaResultados data={reporteData} />
            </div>
          ) : (
            !loadingBusqueda && <div class="text-center py-10 text-gray-500 italic bg-white/40 rounded-lg">Selecciona una fecha para visualizar los datos históricos aquí.</div>
          )}
        </div>

        {/* =================================================
            COLUMNA 2 (Angosta): ENVIAR REPORTE DE HOY
           ================================================= */}
        <div class="lg:col-span-1">
          <div class="bg-slate-800 text-white rounded-2xl shadow-xl p-6 sticky top-6">
            <h2 class="text-xl font-bold mb-2 flex items-center gap-2 text-purple-300">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              Cierre del Día (Email)
            </h2>
            
            <div class="mb-6 border-b border-slate-600 pb-4">
               <p class="text-slate-300 text-sm mb-2">
                 Envía el reporte consolidado de las ventas de <strong>HOY</strong>.
               </p>
               {/* Indicador visual de la fecha actual */}
               <div class="inline-block px-3 py-1 bg-purple-900/50 border border-purple-500/30 rounded-full text-xs text-purple-200 font-mono">
                  Fecha reporte: {new Date().toLocaleDateString()}
               </div>
            </div>

            <form onSubmit={handleEnviarCorreo} class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-purple-200 mb-1">Correo Destino</label>
                <input
                  type="email"
                  placeholder="admin@empresa.com"
                  value={emailDestino}
                  onInput={(e) => setEmailDestino(e.currentTarget.value)}
                  class="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-purple-400 outline-none placeholder-slate-400"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sendingEmail}
                class="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {sendingEmail ? 'Enviando...' : 'Enviar Cierre Ahora'}
              </button>
            </form>

            {/* Feedback del envío */}
            {emailStatus && (
              <div class={`mt-4 p-3 rounded-lg text-sm font-medium animate-fade-in ${
                emailStatus.type === 'success' ? 'bg-green-900/50 text-green-200 border border-green-700' : 'bg-red-900/50 text-red-200 border border-red-700'
              }`}>
                {emailStatus.msg}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// --- SUBCOMPONENTE DE TABLA ---
function TablaResultados({ data }) {
  const { ventas, total_dia } = data;
  
  if (!ventas || (ventas.length === 0 && !total_dia)) {
    return <div class="text-center p-4 text-gray-600">No se encontraron datos para esta fecha.</div>;
  }

  return (
    <div class="overflow-x-auto bg-white/80 rounded-xl shadow-inner border border-gray-200">
      <table class="min-w-full text-left">
        <thead class="bg-gray-200 text-gray-700">
          <tr>
            <th class="p-3 font-semibold text-xs uppercase">ID</th>
            <th class="p-3 font-semibold text-xs uppercase">Cliente (RUT)</th>
            <th class="p-3 font-semibold text-xs uppercase">Empleado</th>
            <th class="p-3 font-semibold text-xs uppercase">Pago</th>
            <th class="p-3 font-semibold text-xs uppercase text-right">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 text-sm">
          {ventas.map(venta => (
            <tr key={venta._id || venta.id_venta} class="hover:bg-gray-50 transition">
              <td class="p-3 text-gray-900">{venta._id || venta.id_venta}</td>
              <td class="p-3 text-gray-600">{venta.cliente?.rut_cliente || 'N/A'}</td>
              <td class="p-3 text-center text-gray-500">{venta.id_empleado}</td>
              <td class="p-3 text-gray-600">{venta.metodo_de_pago}</td>
              <td class="p-3 text-right font-medium text-gray-900">{formatCurrency(venta.total_venta)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot class="bg-gray-100 border-t-2 border-gray-300">
          <tr>
            <td colspan="4" class="p-3 text-right font-bold text-gray-800">TOTAL DÍA:</td>
            <td class="p-3 text-right font-bold text-gray-900 text-lg">{formatCurrency(total_dia)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Función de utilidad para formatear moneda
function formatCurrency(value) {
  if (value === null || value === undefined) return '$0';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
}