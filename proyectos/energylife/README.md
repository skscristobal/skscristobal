# EnergyLife: Propuesta de Sistema de Información

Proyecto grupal de la asignatura Sistemas de Información (INF-3243), Ingeniería Civil Informática, Universidad de Valparaíso, primer semestre de 2026.

Propuesta técnica, operativa y de gestión de un sistema de información para una distribuidora de bebidas energéticas que vende en terreno a gimnasios, minimarkets y botillerías. El sistema digitaliza la operación de los vendedores y entrega información para la toma de decisiones de la jefatura y la gerencia.

**Equipo:** Simón Canales, Pablo Medina, Ricardo Muñoz, Cristóbal Soto, Alonso Venegas.

Documento completo: [propuesta-energylife.pdf](documentos/propuesta-energylife.pdf)

## Contenido de la propuesta

La propuesta analiza el sistema en cinco dimensiones.

### Producto / servicio

El sistema integra un **TPS** (sistema de procesamiento de transacciones) para la operación en terreno y un **MIS** (sistema de información gerencial) para la toma de decisiones.

| Capa | Componente | Función |
|---|---|---|
| Captura (TPS) | App móvil Flutter | Registro de ventas, inventario del camión y geolocalización del vendedor |
| Captura (TPS) | Modo offline (SQLite) | Registro sin conexión con sincronización automática al recuperar señal |
| Procesamiento | API REST (Node.js) | Procesa transacciones, valida stock y actualiza la base central |
| Procesamiento | PostgreSQL | Almacenamiento relacional con propiedades ACID |
| Presentación (MIS) | Dashboard gerencial | Penetración de mercado, desempeño por vendedor y rotación de stock por zona |
| Presentación (MIS) | Panel B2B | Consulta de pedidos y reposición para los puntos de venta |

También se definió la información que recibe cada nivel organizacional: operativo (vendedor), táctico (jefatura de ventas) y estratégico (gerencia comercial).

### Tecnológica

Stack sobre Microsoft Azure en modalidad PaaS: Flutter, Node.js con Express, PostgreSQL Flexible Server, Docker con Azure Container Apps, Blob Storage para respaldos, y Azure AD con doble factor y control de acceso por roles (RBAC). Incluye una estimación del costo de infraestructura de **USD 531 mensuales** (USD 6.372 anuales).

### Personas

Perfiles requeridos para el desarrollo (líder de proyecto, backend, frontend móvil, DevOps, UX/QA) con sus competencias y responsabilidades, una estimación del costo de personal de **CLP 17.350.000** para 3 meses de desarrollo, y los usuarios finales del sistema.

### Proceso

Metodología Scrum con tres sprints de dos semanas, una Estructura de Desglose del Trabajo (EDT) de cinco paquetes y una carta Gantt de 8 semanas.

### Riesgos

Registro de 7 riesgos clasificados por dimensión, probabilidad e impacto, cada uno con su estrategia de mitigación, y una matriz de priorización. Los riesgos principales son la filtración de datos, la pérdida de datos en terreno por falta de conectividad y la baja adopción de la aplicación por parte del equipo de ventas.
