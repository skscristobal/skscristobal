import { h } from 'preact';
import { useState, useMemo, useEffect } from 'preact/hooks';

// --- Función de Utilidad para Descargas (CSV/XML) ---
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

// --- Función de Utilidad para Formatear Moneda ---
const money = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);

// --- Valores por defecto ---
const defaultItem = {
  id: 1,
  desc: '',
  qty: 1,
  um: 'UN',
  price: 0,
  tax: 0,
  disc: 0,
};
const defaultProvider = {
  rut: '',
  nombre: '',
  correo: '',
  fechaEmision: new Date().toISOString().split('T')[0],
  formaPago: 'Contado',
};

const API_URL = import.meta.env.PUBLIC_VITE_API_URL || 'http://127.0.0.1:8000';


// --- Componente Principal ---
export default function FacturasForm() {
  // --- ESTADOS ---
  const [provider, setProvider] = useState(defaultProvider);
  const [items, setItems] = useState([defaultItem]);
  const [showPreview, setShowPreview] = useState(false);
  const [allProviders, setAllProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [selectedProviderData, setSelectedProviderData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // --- EFECTO: Cargar proveedores al iniciar ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setSaveMessage('');
      try {
        const providerResponse = await fetch(`${API_URL}/proveedores/`);
        if (!providerResponse.ok) throw new Error('No se pudieron cargar los proveedores');
        setAllProviders(await providerResponse.json());

      } catch (error) {
        console.error("Error fetching initial data:", error);
        setSaveMessage(`Error al cargar: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // --- MANEJADORES DE DATOS DEL PROVEEDOR ---
  const handleProviderChange = (e) => {
    const { name, value } = e.target;
    setProvider(prev => ({ ...prev, [name]: value }));
  };

  const handleProviderSelect = (e) => {
    const id = e.currentTarget.value ? parseInt(e.currentTarget.value, 10) : '';
    setSelectedProviderId(id);
    setSelectedProviderData(null);

    if (!id) {
      setProvider(defaultProvider);
      return;
    }
    const foundProvider = allProviders.find(p => p.id_proveedor === id);
    if (foundProvider) {
      setSelectedProviderData(foundProvider);
      setProvider(prev => ({
        ...prev,
        nombre: foundProvider.nombre_empresa || '',
        correo: foundProvider.correo || '',
        rut: foundProvider.rut_proveedor || '',
      }));
    }
  };

  // --- MANEJADORES DE ITEMS ---
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    if (['qty', 'price', 'tax', 'disc', 'id'].includes(field)) {
      item[field] = parseFloat(value) || 0;
    } else {
      item[field] = value;
    }
    newItems[index] = item;
    setItems(newItems);
  };
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { id: prev.length + 1, desc: '', qty: 1, um: 'UN', price: 0, tax: 0, disc: 0, }
    ]);
  };
  const handleRemoveItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };
  const handleClearItems = () => {
    setItems([]);
  };

  // --- CÁLCULOS ---
  const totals = useMemo(() => {
    if (!items || items.length === 0) {
      return { calculatedItems: [], subtotal: 0, taxSum: 0, discSum: 0, grand: 0 };
    }
    let subtotal = 0, taxSum = 0, discSum = 0;
    const calculatedItems = items.map(item => {
      const base = (item.qty || 0) * (item.price || 0);
      const taxAmt = base * ((item.tax || 0) / 100);
      const discAmt = base * ((item.disc || 0) / 100);
      const total = base + taxAmt - discAmt;
      subtotal += base; taxSum += taxAmt; discSum += discAmt;
      return { ...item, total };
    });
    const grand = subtotal + taxSum - discSum;
    return { calculatedItems, subtotal, taxSum, discSum, grand };
  }, [items]);


  // --- LÓGICA DE EXPORTACIÓN Y GUARDADO ---

  const getPayload = () => {
    return {
      proveedor: {
        rut: provider.rut,
        nombre: provider.nombre,
        correo: provider.correo,
        giro: totals?.grand ?? 0,
        fechaEmision: provider.fechaEmision,
        formaPago: provider.formaPago,
      },
      items: totals?.calculatedItems?.map(item => ({
        id: item.id, descripcion: item.desc, cantidad: item.qty, um: item.um,
        precio: item.price, impuesto: item.tax, descuento: item.disc, total: item.total
      })) ?? [],
      totales: {
        subtotal: totals?.subtotal ?? 0,
        impuestos: totals?.taxSum ?? 0,
        descuentos: totals?.discSum ?? 0,
        total: totals?.grand ?? 0
      }
    };
  };

  // Exportar CSV
  const handleExportCSV = () => {
    const payload = getPayload();
    if (!payload.items) {
      console.error("Cannot export CSV: items data is missing.");
      alert("Error al generar CSV: faltan datos de los items.");
      return;
    }
    const { proveedor, items, totales } = payload;
    const escapeText = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const forceExcelText = (val) => `"""=""${String(val ?? '').replace(/"/g, '""')}"""`;
    let csvContent = "Datos del Proveedor\n";
    csvContent += `RUT;${forceExcelText(proveedor.rut)}\n`;
    csvContent += `Nombre;${escapeText(proveedor.nombre)}\n`;
    csvContent += `Correo;${escapeText(proveedor.correo)}\n`;
    csvContent += `Giro (Total Factura);${escapeText(proveedor.giro)}\n`;
    csvContent += `Fecha Emision;${forceExcelText(proveedor.fechaEmision)}\n`;
    csvContent += `Forma de Pago;${escapeText(proveedor.formaPago)}\n\n`;
    const headers = ["N°", "Descripción", "Cantidad", "U.M", "Precio", "% Imp.", "% Desc.", "Total"];
    csvContent += headers.join(";") + "\n";
    items.forEach(item => {
      const row = [
        item.id, escapeText(item.descripcion), item.cantidad, escapeText(item.um),
        item.precio, item.impuesto, item.descuento, item.total
      ].join(";");
      csvContent += row + "\n";
    });
    csvContent += "\n";
    csvContent += `;;;;;;Subtotal;${totales.subtotal}\n`;
    csvContent += `;;;;;;Impuestos;${totales.impuestos}\n`;
    csvContent += `;;;;;;Descuentos;${-totales.descuentos}\n`;
    csvContent += `;;;;;;Total Factura;${totales.total}\n`;
    downloadFile(csvContent, `factura-${proveedor.rut || 'proveedor'}.csv`, 'text/csv;charset=utf-8;');
  };

  // Exportar XML
  const handleExportXML = () => {
    const payload = getPayload();
    if (!payload.items) {
      console.error("Cannot export XML: items data is missing.");
      alert("Error al generar XML: faltan datos de los items.");
      return;
    }
    const { proveedor, items, totales } = payload;
    const escapeXML = (str) => String(str ?? '').replace(/[<>&"']/g, c => {
      switch (c) {
        case '<': return '&lt;'; case '>': return '&gt;';
        case '&': return '&amp;'; case '"': return '&quot;';
        case "'": return '&apos;'; default: return c;
      }
    });
    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<Factura>\n';
    xmlContent += `  <Proveedor>\n`;
    xmlContent += `    <RUT>${escapeXML(proveedor.rut)}</RUT>\n`;
    xmlContent += `    <Nombre>${escapeXML(proveedor.nombre)}</Nombre>\n`;
    xmlContent += `    <Correo>${escapeXML(proveedor.correo)}</Correo>\n`;
    xmlContent += `    <GiroTotalFactura>${escapeXML(proveedor.giro)}</GiroTotalFactura>\n`;
    xmlContent += `    <FechaEmision>${escapeXML(proveedor.fechaEmision)}</FechaEmision>\n`;
    xmlContent += `    <FormaPago>${escapeXML(proveedor.formaPago)}</FormaPago>\n`;
    xmlContent += `  </Proveedor>\n`;
    xmlContent += `  <Items>\n`;
    items.forEach(item => {
      xmlContent += `    <Item N="${item.id}">\n`;
      xmlContent += `      <Descripcion>${escapeXML(item.descripcion)}</Descripcion>\n`;
      xmlContent += `      <Cantidad>${item.cantidad}</Cantidad>\n`;
      xmlContent += `      <UM>${escapeXML(item.um)}</UM>\n`;
      xmlContent += `      <Precio>${item.precio}</Precio>\n`;
      xmlContent += `      <ImpuestoPct>${item.impuesto}</ImpuestoPct>\n`;
      xmlContent += `      <DescuentoPct>${item.descuento}</DescuentoPct>\n`;
      xmlContent += `      <TotalItem>${item.total}</TotalItem>\n`;
      xmlContent += `    </Item>\n`;
    });
    xmlContent += `  </Items>\n`;
    xmlContent += `  <Totales>\n`;
    xmlContent += `    <Subtotal>${totales.subtotal}</Subtotal>\n`;
    xmlContent += `    <Impuestos>${totales.impuestos}</Impuestos>\n`;
    xmlContent += `    <Descuentos>${totales.descuentos}</Descuentos>\n`;
    xmlContent += `    <TotalFactura>${totales.total}</TotalFactura>\n`;
    xmlContent += `  </Totales>\n</Factura>`;
    downloadFile(xmlContent, `factura-${proveedor.rut || 'proveedor'}.xml`, 'application/xml;charset=utf-8;');
  };

  // --- EXPORTAR PDF (CORREGIDO PARA SCROLL Y FONDO) ---
  const handleExportPDF = () => {
    // 1. Validaciones básicas
    if (!totals || !totals.calculatedItems || totals.calculatedItems.length === 0) {
      alert("Por favor, agregue items a la factura antes de exportar a PDF.");
      return;
    }

    if (typeof window.html2pdf === 'undefined') {
      alert('La librería PDF no ha cargado. Por favor, recarga la página.');
      return;
    }

    // 2. Mostrar vista previa si no está visible
    if (!showPreview) {
      setShowPreview(true);
    }

    // 3. Guardar la posición actual del scroll del usuario
    const currentScrollY = window.scrollY;

    // 4. Iniciar proceso con un pequeño retraso
    setTimeout(() => {
      const element = document.getElementById('invoice');

      if (!element) {
        alert('Error: No se encuentra la factura. Intente de nuevo.');
        return;
      }

      // 5. TRUCO CLAVE: Forzar al navegador a ir al inicio absoluto (0,0)
      window.scrollTo(0, 0);

      // Esperamos un momento para que el navegador termine de redibujar tras el scroll
      setTimeout(() => {

        const opt = {
          filename: `factura-${provider.rut || 'proveedor'}.pdf`,
          margin: 10,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            scrollY: 0,
            scrollX: 0,
            // Fuerza un ancho estándar para evitar problemas de aspecto
            windowWidth: document.documentElement.offsetWidth,
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        window.html2pdf()
          .from(element)
          .set(opt)
          .save()
          .then(() => {
            // Éxito: Restauramos la posición del usuario
            window.scrollTo(0, currentScrollY);
          })
          .catch(err => {
            console.error("Error PDF:", err);
            alert("Error al generar PDF.");
            window.scrollTo(0, currentScrollY);
          });

      }, 300); // Espera 300ms en el tope de la página antes de la foto

    }, 100);
  };

  // --- FUNCIÓN DE GUARDAR ---
  const handleSaveFactura = async () => {
    if (!totals || !totals.calculatedItems || totals.calculatedItems.length === 0) {
      setSaveMessage('Error: Debe agregar al menos un item para guardar la factura.');
      setIsSaving(false);
      return;
    }
    setSaveMessage('Guardando...');
    setIsSaving(true);

    if (!selectedProviderId) {
      setSaveMessage('Error: Por favor, seleccione un proveedor.');
      setIsSaving(false);
      return;
    }

    let endpoint = '';
    let payload = null;
    let method = 'POST';
    let headers = { 'accept': 'application/json' };

    // ▼▼▼ REDONDEO APLICADO ▼▼▼
    const giroTotalFactura = Math.round(totals.grand ?? 0);

    const queryParams = new URLSearchParams({
      id_proveedor: selectedProviderId,
      giro: giroTotalFactura, // Se envía el entero redondeado
      fecha_emision: provider.fechaEmision,
      forma_de_pago: provider.formaPago
    });
    endpoint = `${API_URL}/facturas/?${queryParams.toString()}`;
    payload = null;

    console.log(`Guardando en MongoDB... Endpoint: ${endpoint}`, payload);

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: headers,
        body: payload,
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log("Respuesta del backend:", responseData);
        setSaveMessage(`¡Factura guardada con éxito!`);
        setProvider(defaultProvider);
        setItems([defaultItem]);
        setSelectedProviderId('');
        setSelectedProviderData(null);
      } else {
        const errorData = await response.json();
        let detail = 'Respuesta no OK';
        if (errorData.detail && Array.isArray(errorData.detail)) {
          detail = errorData.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join('; ');
        } else if (errorData.detail) {
          detail = errorData.detail;
        } else {
          detail = response.statusText;
        }
        setSaveMessage(`Error al guardar: ${detail}`);
      }
    } catch (error) {
      console.error(`Error al guardar factura:`, error);
      setSaveMessage(`Error de conexión al guardar la factura.`);
    } finally {
      setIsSaving(false);
    }
  };


  const handleGoToLista = () => {
    window.location.href = '/admin/facturasbuscar';
  };

  // --- RENDERIZADO ---
  return (
    <>
      {/* Formulario principal */}
      <section class="card grid cols-3">

        {/* --- SELECTOR DE PROVEEDOR --- */}
        <div style="grid-column: 1 / -1; margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <label for="providerSelect">Seleccionar Proveedor Existente</label>
              <select
                id="providerSelect"
                onInput={handleProviderSelect}
                value={selectedProviderId}
                disabled={isLoading}
                class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                style="max-width: 400px;"
              >
                <option value="">-- {isLoading ? 'Cargando...' : 'Seleccionar proveedor'} --</option>
                {allProviders.map(p => (
                  <option key={p.id_proveedor} value={p.id_proveedor}>
                    {p.nombre_empresa} (ID: {p.id_proveedor})
                  </option>
                ))}
              </select>
            </div>
          </div>
          {saveMessage && <p class="small" style="color: var(--brand);">{saveMessage}</p>}
        </div>

        {/* --- CAMPOS DEL FORMULARIO --- */}
        <div><label for="id_proveedor">ID Proveedor</label><input id="id_proveedor" name="id_proveedor" type="text" placeholder="Seleccione proveedor" value={selectedProviderId} disabled /></div>
        <div><label for="nombre">Nombre Razón Social</label><input id="nombre" name="nombre" placeholder="Autocompletado..." value={provider.nombre} disabled /></div>
        <div><label for="correo">Correo</label><input id="correo" name="correo" type="email" placeholder="Autocompletado..." value={provider.correo} disabled /></div>
        <div><label for="rut">RUT Proveedor</label><input id="rut" name="rut" placeholder="Autocompletado..." autocomplete="off" value={provider.rut} disabled /></div>
        <div><label for="fechaEmision">Fecha emisión</label><input id="fechaEmision" name="fechaEmision" type="date" value={provider.fechaEmision} onInput={handleProviderChange} /></div>
        <div><label for="formaPago">Forma de pago</label><select id="formaPago" name="formaPago" value={provider.formaPago} onInput={handleProviderChange}><option value="Contado">Contado</option><option value="Crédito">Crédito</option></select></div>
      </section>

      {/* Tabla de productos */}
      <section class="card mt-4">
        <div class="toolbar">
          <button onClick={handleAddItem} class="btn">+ Agregar producto</button>
          <button onClick={handleClearItems} class="btn danger">Vaciar</button>
          <div class="muted small">Campos: N°, Descripción, Cantidad, U.M, Precio, %Imp, %Desc</div>
        </div>
        <div class="mt-3" style="overflow:auto; max-height:50vh;">
          <table id="itemsTable">
            <thead>
              <tr>
                <th style="width:70px;">N°</th><th>Descripción</th><th style="width:110px;">Cantidad</th><th style="width:90px;">U.M</th>
                <th style="width:130px;">Precio</th><th style="width:110px;">% Imp.</th><th style="width:120px;">% Desc.</th>
                <th class="right" style="width:140px;">Total</th><th style="width:60px;"></th>
              </tr>
            </thead>
            <tbody id="itemsBody">
              {totals && totals.calculatedItems && totals.calculatedItems.length > 0 ? (
                totals.calculatedItems.map((item, index) => (
                  <tr key={index}>
                    <td><input class="mono" type="number" min="1" value={item.id} onInput={(e) => handleItemChange(index, 'id', e.currentTarget.value)} style="width:100%" /></td>
                    <td><input type="text" value={item.desc} placeholder="Descripción" onInput={(e) => handleItemChange(index, 'desc', e.currentTarget.value)} /></td>
                    <td><input type="number" min="0" step="0.01" value={item.qty} onInput={(e) => handleItemChange(index, 'qty', e.currentTarget.value)} /></td>
                    <td><input type="text" value={item.um} onInput={(e) => handleItemChange(index, 'um', e.currentTarget.value)} /></td>
                    <td><input type="number" min="0" step="0.01" value={item.price} onInput={(e) => handleItemChange(index, 'price', e.currentTarget.value)} /></td>
                    <td><input type="number" min="0" max="100" step="0.01" value={item.tax} onInput={(e) => handleItemChange(index, 'tax', e.currentTarget.value)} /></td>
                    <td><input type="number" min="0" max="100" step="0.01" value={item.disc} onInput={(e) => handleItemChange(index, 'disc', e.currentTarget.value)} /></td>
                    <td class="right mono totalCell">{money(item.total ?? 0)}</td>
                    <td class="right"><button class="btn danger btn-del" onClick={() => handleRemoveItem(index)}>✕</button></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="9" style="text-align: center; padding: 10px; color: grey;">No hay productos agregados</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr><td colspan="7" class="right">Subtotal</td><td class="right mono">{money(totals?.subtotal ?? 0)}</td><td></td></tr>
              <tr><td colspan="7" class="right">Impuestos</td><td class="right mono">{money(totals?.taxSum ?? 0)}</td><td></td></tr>
              <tr><td colspan="7" class="right">Descuentos</td><td class="right mono">-{money(totals?.discSum ?? 0).replace('$', '')}</td><td></td></tr>
              <tr><td colspan="7" class="right">Total factura</td><td class="right mono">{money(totals?.grand ?? 0)}</td><td></td></tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Botones de Acción */}
      <div class="mt-4 toolbar">
        <button onClick={handleExportPDF} class="btn primary">🧾 Exportar (.pdf)</button>
        <button onClick={handleExportCSV} class="btn primary">🧾 Exportar (.csv)</button>
        <button onClick={handleExportXML} class="btn primary">🧾 Exportar (.xml)</button>
        <button onClick={() => setShowPreview(!showPreview)} class="btn">
          {showPreview ? 'Ocultar Vista Previa' : 'Mostrar Vista Previa'}
        </button>
        <button onClick={handleSaveFactura} class="btn" disabled={isSaving || isLoading}>
          {isSaving ? 'Guardando...' : `Guardar Factura`}
        </button>
        <button onClick={handleGoToLista} class="btn">🔍 Buscar Facturas</button>
      </div>

      {/* Vista Previa de Factura Chilena */}
      {showPreview && (
        <div class="mt-4">
          {/* ▼▼▼ FIX: FONDO BLANCO EXPLÍCITO PARA EVITAR PDF NEGRO/TRANSPARENTE ▼▼▼ */}
          <div class="factura-chilena bg-white" id="invoice" style="background-color: #ffffff;">
            <header class="factura-header">
              <div class="header-logo">
                <img src="/default-provider.png" alt="Logo Emisor" style="max-width: 130px; border-radius: 8px;" />
                <strong>{provider.nombre || 'Nombre Emisor'}</strong><br />
                {selectedProviderData?.direccion || 'Dirección Emisor'}<br />
                Teléfono: {selectedProviderData?.telefono || '+56 X XXXX XXXX'}
              </div>
              <div class="rut-box">
                <strong>R.U.T.: {provider.rut || 'XX.XXX.XXX-X'}</strong>
                <div class="factura-title">FACTURA ELECTRÓNICA</div>
                <div class="folio-numero">N° {/* Folio si lo tuvieras */}</div>
              </div>
            </header>
            <section class="factura-info-box">
              <div class="cliente-box">
                <div><strong>SEÑOR(ES):</strong> <span>EL VECINO</span></div>
                <div><strong>R.U.T.:</strong> <span>77.777.777-7</span></div>
                <div><strong>CORREO:</strong> <span>elvecino@gmail.com</span></div>
              </div>
              <div class="folio-box">
                <div><strong>FECHA EMISIÓN:</strong> <span>{provider.fechaEmision || '—'}</span></div>
                <div><strong>COND. DE PAGO:</strong> <span>{provider.formaPago || '—'}</span></div>
                <div><strong>FECHA VENC.:</strong> <span>{provider.fechaEmision || '—'}</span></div>
              </div>
            </section>
            <section class="mt-3">
              <table class="factura-items">
                <thead>
                  <tr>
                    <th>N°</th><th>Descripción</th><th>Cantidad</th><th>U.M</th>
                    <th>Precio</th><th>% Imp.</th><th>% Desc.</th><th class="right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {totals && totals.calculatedItems && totals.calculatedItems.length > 0 ? (
                    totals.calculatedItems.map((r, index) => (
                      <tr key={index}>
                        <td class="mono">{r.id}</td>
                        <td>{r.desc || '—'}</td>
                        <td class="mono right">{r.qty}</td>
                        <td class="mono">{r.um || ''}</td>
                        <td class="mono right">{money(r.price ?? 0)}</td>
                        <td class="mono right">{r.tax}%</td>
                        <td class="mono right">{r.disc}%</td>
                        <td class="mono right">{money(r.total ?? 0)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="8" style="text-align: center; padding: 10px; color: grey;">No hay productos agregados</td></tr>
                  )}
                </tbody>
              </table>
            </section>
            <section class="factura-totales">
              <table class="totales-box">
                <tbody>
                  <tr><td>SUBTOTAL</td><td class="mono right">{money(totals?.subtotal ?? 0)}</td></tr>
                  <tr><td>IMPUESTOS (IVA)</td><td class="mono right">{money(totals?.taxSum ?? 0)}</td></tr>
                  <tr><td>DESCUENTOS</td><td class="mono right">-{money(totals?.discSum ?? 0).replace('$', '')}</td></tr>
                  <tr class="total-final"><td>MONTO TOTAL</td><td class="mono right">{money(totals?.grand ?? 0)}</td></tr>
                </tbody>
              </table>
            </section>
            <footer class="factura-footer">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/220px-QR_code_for_mobile_English_Wikipedia.svg.png" alt="Timbre SII (placeholder)" style="width: 70px; height: 70px;" />
              <div class="acuse-recibo">
                <strong>ACUSE DE RECIBO</strong>
                <div class="acuse-recibo-lineas"><span>NOMBRE</span><span>R.U.T.</span><span>FIRMA</span></div>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}