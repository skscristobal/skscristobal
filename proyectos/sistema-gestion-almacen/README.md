# Sistema de Gestión de Almacén "El Vecino"

Proyecto grupal desarrollado para la asignatura ICI324 de Ingeniería Civil Informática, Universidad de Valparaíso (2025).

Plataforma web full stack para digitalizar la operación de un almacén de barrio: control de inventario y stock, registro de ventas, emisión de facturas, gestión de empleados y proveedores, y generación de reportes.

## Mi participación

Mi rol principal en el equipo fue el desarrollo del backend con FastAPI: la implementación de los endpoints de la API y de la lógica de negocio, y la integración con las bases de datos y los servicios externos. También colaboré en el diseño y la configuración de las bases de datos (SQLite y MongoDB) y en la conexión del frontend con la API.

## Funcionalidades

**Administrador**
- Gestión de operadores (empleados): creación, edición, eliminación y detalle.
- Gestión de proveedores.
- Consulta y emisión de facturas.
- Generación de reportes.

**Operador / cajero**
- Gestión de productos y control de stock, con historial de movimientos.
- Registro de ventas, con envío del comprobante en PDF por correo al cliente.

**Transversal**
- Autenticación con JWT y contraseñas cifradas con bcrypt.
- Control de acceso por rol (administrador y operador).
- Carga de imágenes a almacenamiento en la nube (AWS S3 / Cloudinary).
- Menú de accesibilidad en la interfaz.

## Arquitectura

| Capa | Tecnologías |
|---|---|
| Frontend | Astro, Preact, Tailwind CSS |
| Backend | Python, FastAPI, Uvicorn |
| Base de datos relacional | SQLite con SQLAlchemy (empleados, proveedores, clientes) |
| Base de datos NoSQL | MongoDB Atlas con PyMongo (productos, ventas, stock, facturas) |
| Servicios externos | SMTP (Brevo), AWS S3, Cloudinary |
| Despliegue | Render |

El backend usa un esquema híbrido: los datos estructurados y con relaciones fijas se guardan en SQL, mientras que el catálogo de productos y las transacciones se guardan en MongoDB. El acceso a datos sigue el patrón repositorio (`backend-app/repositorios/`), separando la lógica de negocio de la persistencia.

## Estructura

```
backend-app/
  main.py            Punto de entrada de la API
  routers/           Endpoints por módulo (empleados, productos, ventas, etc.)
  repositorios/      Acceso a datos (SQL y MongoDB)
  models/            Modelos de SQLAlchemy
  database/          Conexiones a SQLite y MongoDB
  seguridad.py       Hash de contraseñas y tokens JWT
frontend-app/
  src/pages/         Vistas de administrador y operador
  src/components/    Componentes de interfaz
BD/
  database.py        Script de creación de tablas
  dump.sql           Datos de prueba (ficticios)
```

## Ejecución local

**Backend**

```bash
cd backend-app
python -m venv venv
source venv/bin/activate        # En Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Completar con credenciales propias
uvicorn main:app --reload
```

La documentación interactiva de la API queda disponible en `http://127.0.0.1:8000/docs`.

**Frontend**

```bash
cd frontend-app
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:4321`.

> Las credenciales de servicios externos (MongoDB, correo, almacenamiento) no se incluyen en el repositorio y deben configurarse en el archivo `.env`.
