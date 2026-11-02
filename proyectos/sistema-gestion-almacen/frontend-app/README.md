# Backend – FastAPI | Proyecto Almacén (ICI324)

## Objetivo
Servir la API que consumirá el frontend (Astro + Preact) para la gestión de operadores del almacén.

---

## 1. Endpoints obligatorios

| Método | Ruta | Descripción | Body (entrada) | Respuesta exitosa |
|--------|------|-------------|----------------|-------------------|
| `GET` | `/api/operadores` | Listar todos los operadores | — | `200` `[{id, rut, nombre, rol}]` |
| `GET` | `/api/operadores/{id}` | Obtener **un** operador | — | `200` `{id, rut, nombre, rol}` |
| `POST` | `/api/operadores` | Crear operador | `{rut, nombre, rol}` | `201` `{id, rut, nombre, rol}` |
| `PUT` | `/api/operadores/{id}` | Actualizar operador | `{rut, nombre, rol}` | `200` `{msg: "ok"}` u objeto |
| `DELETE` | `/api/operadores/{id}` | Eliminar operador | — | `200` `{msg: "Operador eliminado"}` |

---

## 2. Formatos y validaciones

- **Content-Type**: `application/json` (entrada y salida).
- **RUT**: formato chileno (puntos y guión) y **único** en BD.
- **rol** solo acepta: `administrador`, `operador`, `supervisor`.
- **nombre**: entre 3 y 100 caracteres.
- En errores responder:
  ```json
  { "error": "mensaje corto" }
