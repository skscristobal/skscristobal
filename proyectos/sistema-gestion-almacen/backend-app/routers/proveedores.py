from fastapi import APIRouter, Depends, HTTPException, status
from repositorios.repositorio_proveedor import BaseProveedorRepository
from dependencias import get_proveedor_repository

# ==========================================================
# Grupo de rutas: PROVEEDORES
# ==========================================================
router = APIRouter(prefix="/proveedores", tags=["Proveedores"])

# ==========================================================
# GET /proveedores
# Lista todos los proveedores
# ==========================================================
@router.get(
    "/",
    summary="Listar todos los proveedores",
    response_description="Lista completa de proveedores registrados",
    status_code=status.HTTP_200_OK,
)
def get_proveedores(
    repo: BaseProveedorRepository = Depends(get_proveedor_repository)
):
    """
    Retorna una lista con **todos los proveedores** registrados en la base de datos activa.

    ### Retorna:
    - **`200 OK`**: Lista de proveedores.
    - **`500 Internal Server Error`**: Si ocurre un error inesperado al consultar la base de datos.
    """
    try:
        proveedores = repo.get_all_proveedores()
        return proveedores
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener proveedores: {e}")


# ==========================================================
# GET /proveedores/{id_proveedor}
# Obtiene un proveedor específico por su ID
# ==========================================================
@router.get(
    "/{id_proveedor}",
    summary="Obtener proveedor por ID",
    response_description="Datos de un proveedor específico",
    status_code=status.HTTP_200_OK,
)
def get_proveedor(
    id_proveedor: int,
    repo: BaseProveedorRepository = Depends(get_proveedor_repository)
):
    """
    Retorna los datos de un proveedor específico según su **`id_proveedor` numérico**.

    ### Parámetros:
    - **`id_proveedor (int)`**: ID numérico único del proveedor a buscar (en la URL).

    ### Retorna:
    - **`200 OK`**: Datos del proveedor encontrado.
    - **`404 Not Found`**: Si no se encuentra un proveedor con ese ID.
    - **`500 Internal Server Error`**: Si ocurre un error inesperado al consultar la base de datos.
    """
    try:
        proveedor = repo.get_proveedor_by_id(id_proveedor)
        if not proveedor:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")
        return proveedor
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar proveedor: {e}")


# ==========================================================
# POST /proveedores
# Crea un nuevo proveedor
# ==========================================================
@router.post(
    "/",
    summary="Crear nuevo proveedor",
    response_description="Proveedor creado correctamente",
    status_code=status.HTTP_201_CREATED,
)
def create_proveedor(
    rut_proveedor: str,
    correo: str,
    telefono: str,
    direccion: str,
    nombre_empresa: str,
    id_empleado: int = None,
    repo: BaseProveedorRepository = Depends(get_proveedor_repository)
):
    """
    Crea un **nuevo proveedor**.
    
    ### Parámetros (Query o Form):
    - **`rut_proveedor (str)`**: RUT único del proveedor.
    - **`id_empleado (int)`**: ID del empleado que registra (Requerido en SQL, Opcional en Mongo).
    - **`correo (str)`**: Correo electrónico.
    - **`telefono (str)`**: Número de contacto.
    - **`direccion (str)`**: Dirección física.
    - **`nombre_empresa (str)`**: Nombre de la empresa.

    ### Retorna:
    - **`201 Created`**: Si el proveedor se crea correctamente.
    - **`400 Bad Request`**: Si faltan campos obligatorios.
    - **`404 Not Found`**: Si el `id_empleado` no existe (Integridad Referencial).
    - **`409 Conflict`**: Si el `rut_proveedor` o ID ya existen.
    - **`500 Internal Server Error`**: Si ocurre un error inesperado al guardar.
    """
    try:
        data = {
            "rut_proveedor": rut_proveedor,
            "correo": correo,
            "telefono": telefono,
            "direccion": direccion,
            "nombre_empresa": nombre_empresa,
            "id_empleado": id_empleado
        }

        if not all([rut_proveedor, correo, telefono, direccion, nombre_empresa]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Faltan campos obligatorios del proveedor.")

        nuevo_proveedor = repo.create_proveedor(data)
        return {"msg": "Proveedor creado correctamente", "proveedor": nuevo_proveedor}

    except HTTPException:
        raise 
    except Exception as e:
        str_error = str(e)
        
        # Manejo de errores de unicidad (RUT o ID)
        if "UNIQUE constraint failed" in str_error or "E11000 duplicate key" in str_error:
             if "rut_proveedor" in str_error:
                 detail = "Conflicto: El RUT del proveedor ya existe."
             elif "id_proveedor" in str_error: 
                 detail = "Conflicto: El ID de proveedor generado ya existe."
             else:
                 detail = "Conflicto: Violación de restricción única."
             raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)
        
        # Manejo de errores de Clave Foránea (Solo ocurrirá en SQL)
        if "FOREIGN KEY constraint failed" in str_error: 
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Error de integridad: El Empleado (id_empleado) proporcionado no existe."
            )
       
        raise HTTPException(status_code=500, detail=f"Error al crear proveedor: {e}")


# ==========================================================
# PUT /proveedores/{id_proveedor}
# Actualiza los datos principales de un proveedor existente
# ==========================================================
@router.put(
    "/{id_proveedor}",
    summary="Actualizar datos principales de un proveedor",
    response_description="Proveedor actualizado correctamente",
    status_code=status.HTTP_200_OK,
)
def update_proveedor(
    id_proveedor: int,
    rut_proveedor:str,
    correo: str,
    telefono: str,
    direccion: str,
    nombre_empresa: str,
    repo: BaseProveedorRepository = Depends(get_proveedor_repository)
):
    """
    Actualiza los **datos principales** de un proveedor existente.

    ### Retorna:
    - **`200 OK`**: Proveedor actualizado.
    - **`404 Not Found`**: Si el proveedor no existe.
    - **`500 Internal Server Error`**: Error inesperado.
    """
    try:
        data = {
            "rut_proveedor": rut_proveedor,
            "correo": correo,
            "telefono": telefono,
            "direccion": direccion,
            "nombre_empresa": nombre_empresa
        }
        proveedor_actualizado = repo.update_proveedor(id_proveedor, data)

        if not proveedor_actualizado:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")

        return {"msg": "Proveedor actualizado correctamente", "proveedorActualizado": proveedor_actualizado}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar proveedor: {e}")


# ==========================================================
# DELETE /proveedores/{id_proveedor}
# Elimina un proveedor existente por su ID
# ==========================================================
@router.delete(
    "/{id_proveedor}",
    summary="Eliminar proveedor por ID",
    response_description="Proveedor eliminado correctamente",
    status_code=status.HTTP_200_OK,
)
def delete_proveedor(
    id_proveedor: int,
    repo: BaseProveedorRepository = Depends(get_proveedor_repository)
):
    """
    Elimina un **proveedor completo** de la base de datos.

    ### Retorna:
    - **`200 OK`**: Mensaje de confirmación.
    - **`404 Not Found`**: Si el proveedor no existe.
    - **`409 Conflict`**: Si hay restricciones de clave foránea (tiene productos/facturas asociados).
    - **`500 Internal Server Error`**: Error inesperado.
    """
    try:
        eliminado = repo.delete_proveedor(id_proveedor)

        if not eliminado:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")

        return {"msg": f"Proveedor con ID {id_proveedor} eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        # Detección agnóstica de error de FK
        if "FOREIGN KEY" in str(e).upper():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede eliminar el proveedor, tiene registros asociados."
            )
        raise HTTPException(status_code=500, detail=f"Error al eliminar proveedor: {e}")

