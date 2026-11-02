import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export default function AccesibilidadMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(100); 
  const [modoVisual, setModoVisual] = useState('normal'); 

  useEffect(() => {
    const savedFont = localStorage.getItem('acc_fontSize');
    const savedMode = localStorage.getItem('acc_modoVisual');

    if (savedFont) aplicarFuente(parseInt(savedFont));
    if (savedMode) aplicarModo(savedMode);
  }, []);

  const aplicarFuente = (size) => {
    setFontSize(size);
    document.documentElement.style.fontSize = `${size}%`;
    localStorage.setItem('acc_fontSize', size);
  };

  const aplicarModo = (modo) => {
    setModoVisual(modo);
    // Limpiamos clases del body
    document.body.classList.remove('acc-alto-contraste', 'acc-sepia');
    
    if (modo === 'alto-contraste') document.body.classList.add('acc-alto-contraste');
    else if (modo === 'sepia') document.body.classList.add('acc-sepia');
    
    localStorage.setItem('acc_modoVisual', modo);
  };

  const aumentarLetra = () => { if (fontSize < 150) aplicarFuente(fontSize + 10); };
  const disminuirLetra = () => { if (fontSize > 80) aplicarFuente(fontSize - 10); };
  const resetear = () => { aplicarFuente(100); aplicarModo('normal'); };

  // --- ESTILOS FIJOS (Para que no afecte el zoom de la web) ---
  const contenedorStyle = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 9999,
    fontFamily: 'sans-serif',
    fontSize: '16px', // Congelamos la fuente base del menú
    lineHeight: '1.5',
    textAlign: 'left'
  };

  const menuPopupStyle = {
    position: 'absolute',
    bottom: '60px', // Separación fija desde el botón
    right: '0',
    width: '280px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    border: '1px solid #e5e7eb',
    color: '#1f2937' // Texto gris oscuro forzado
  };

  const btnStyle = {
    flex: 1,
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    background: 'white',
    color: '#374151'
  };

  return (
    <div style={contenedorStyle}>
      
      {/* Botón Flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#2563eb', // Blue-600
          color: 'white',
          border: '2px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}
        aria-label="Abrir menú de accesibilidad"
      >
        <svg xmlns="http://www.w3.org/2000/svg" style={{width:'28px', height:'28px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div style={menuPopupStyle}>
          
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '12px' }}>
            Accesibilidad
          </h3>

          {/* Control Tamaño */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', marginBottom: '8px', color: '#4b5563' }}>Tamaño de texto: {fontSize}%</p>
            <div style={{ display: 'flex', gap: '8px', background: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
              <button onClick={disminuirLetra} style={{ ...btnStyle, border:'none' }}>A-</button>
              <button onClick={resetear} style={{ ...btnStyle, border:'none', color: '#2563eb', fontSize: '12px' }}>Reset</button>
              <button onClick={aumentarLetra} style={{ ...btnStyle, border:'none' }}>A+</button>
            </div>
          </div>

          {/* Control Modo Visual */}
          <div>
            <p style={{ fontSize: '14px', marginBottom: '8px', color: '#4b5563' }}>Modo Visual</p>
            <div style={{ display: 'grid', gap: '8px' }}>
              <button 
                onClick={() => aplicarModo('normal')} 
                style={{ ...btnStyle, backgroundColor: modoVisual === 'normal' ? '#dbeafe' : 'white', borderColor: modoVisual === 'normal' ? '#3b82f6' : '#d1d5db', color: modoVisual === 'normal' ? '#1e40af' : '#374151' }}
              >
                Normal
              </button>
              <button 
                onClick={() => aplicarModo('sepia')} 
                style={{ ...btnStyle, backgroundColor: '#f4e4bc', color: '#5b4636', borderColor: modoVisual === 'sepia' ? '#d97706' : '#fde68a', borderWidth: modoVisual === 'sepia' ? '2px' : '1px' }}
              >
                Sepia (Descanso)
              </button>
              <button 
                onClick={() => aplicarModo('alto-contraste')} 
                style={{ ...btnStyle, backgroundColor: 'black', color: '#facc15', borderColor: modoVisual === 'alto-contraste' ? '#facc15' : 'black', borderWidth: modoVisual === 'alto-contraste' ? '2px' : '1px' }}
              >
                Alto Contraste
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}