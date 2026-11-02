import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

// --- Función de Utilidad para Formatear Moneda ---
const money = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);

const API_URL = import.meta.env.PUBLIC_VITE_API_URL || 'http://127.0.0.1:8000';

// --- Componente Principal ---
export default function FacturasLista() {
  // --- ESTADOS ---
  const [allProviders, setAllProviders] = useState([]);      // Lista completa de proveedores
  const [allFacturas, setAllFacturas] = useState([]);        // Lista completa de facturas
  const [displayedFacturas, setDisplayedFacturas] = useState([]); // Facturas a mostrar (filtradas)
  const [selectedProviderId, setSelectedProviderId] = useState(''); // ID del proveedor seleccionado
  const [selectedProviderData, setSelectedProviderData] = useState(null); // Objeto completo del proveedor seleccionado
  const [loadingProviders, setLoadingProviders] = useState(true); // Inicia cargando
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [error, setError] = useState('');                   // Mensajes de error

  // --- EFECTO: Cargar proveedores y facturas al iniciar ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingProviders(true);
      setLoadingFacturas(true);
      setError('');
      try {
        // Fetch Proveedores
        const providerResponse = await fetch(`${API_URL}/proveedores/`);
        if (!providerResponse.ok) {
          throw new Error('No se pudieron cargar los proveedores');
        }
        const providerData = await providerResponse.json();
        setAllProviders(providerData);

        // Fetch Facturas (Todas)
        const facturaResponse = await fetch(`${API_URL}/facturas/`);
        if (!facturaResponse.ok) {
          throw new Error('No se pudieron cargar las facturas');
        }
        const facturaData = await facturaResponse.json();
        setAllFacturas(facturaData);

      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError(`Error al cargar datos: ${err.message}`);
      } finally {
        setLoadingProviders(false);
        setLoadingFacturas(false);
      }
    };
    fetchInitialData();
  }, []);

  // --- MANEJADOR DE SELECCIÓN DE PROVEEDOR (Filtra facturas) ---
  const handleProviderChange = (e) => {
    const id = e.currentTarget.value ? parseInt(e.currentTarget.value, 10) : '';
    setSelectedProviderId(id);
    setSelectedProviderData(null);
    setDisplayedFacturas([]); // Limpia las facturas mostradas
    setError('');

    if (id) {
      const foundProvider = allProviders.find(p => p.id_proveedor === id);
      if (foundProvider) {
        setSelectedProviderData(foundProvider); // Guarda el objeto completo del proveedor

        // Filtra la lista global de facturas
        const providerFacturas = allFacturas.filter(factura => factura.id_proveedor === id);
        setDisplayedFacturas(providerFacturas);

      } else {
        setError('Proveedor no encontrado en la lista cargada.');
      }
    }
  };

  // --- RENDERIZADO ---
  const isLoading = loadingProviders || loadingFacturas; // Estado de carga combinado

  return (
    <div class="card">

      {/* Selector de Proveedor */}
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 20px;">
        <div style="flex-grow: 1;">
          <label for="providerSelectLista" style="display: block; margin-bottom: 5px;">Seleccionar Proveedor:</label>
          <select
            id="providerSelectLista"
            onInput={handleProviderChange}
            value={selectedProviderId}
            disabled={loadingProviders}
            style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 5px;"
          >
            <option value="">-- {loadingProviders ? 'Cargando proveedores...' : 'Seleccione un proveedor'} --</option>
            {allProviders.map(p => (
              <option key={p.id_proveedor} value={p.id_proveedor}>
                {p.nombre_empresa} (ID: {p.id_proveedor})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mensajes de Carga y Error */}
      {isLoading && <p>Cargando datos...</p>}
      {error && <p style="color: red;">{error}</p>}

      {/* Tabla de Facturas */}
      {selectedProviderId && !isLoading && !error && selectedProviderData && (
        <div>
          <h3>Facturas de: {selectedProviderData.nombre_empresa}</h3>
          {displayedFacturas.length > 0 ? (
            <div style="overflow-x: auto;">
              <table class="facturas-table">
                <thead>
                  <tr>
                    <th>ID Factura</th>
                    <th>RUT Proveedor</th>
                    <th>Fecha Emisión</th>
                    <th>Forma de Pago</th>
                    <th style="text-align: right;">Giro</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedFacturas.map((factura, index) => (
                    <tr key={factura.id_factura || factura._id || index}>
                      <td>{factura.id_factura || factura._id || `(No ID - Índice ${index + 1})`}</td>
                      <td>{selectedProviderData.rut_proveedor || 'N/A'}</td>
                      <td>{factura.fecha_emision}</td>
                      <td>{factura.forma_de_pago}</td>
                      <td style="text-align: right; font-family: monospace;">
                        {money(factura.giro ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Este proveedor no tiene facturas registradas.</p>
          )}
        </div>
      )}
    </div>
  );
}