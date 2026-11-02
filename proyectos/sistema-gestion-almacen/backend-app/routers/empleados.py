from fastapi import APIRouter, Depends, HTTPException, status
from repositorios.repositorio_empleado import BaseEmpleadoRepository
from dependencias import get_empleado_repository
from seguridad import get_password_hash, verify_password, create_access_token

# ==========================================================
# CONFIGURACIÓN
# ==========================================================
router = APIRouter(prefix="/empleados", tags=["Empleados"])

# ==========================================================
# GET /empleados
# ==========================================================
@router.get(
    "/", 
    summary="Listar todos los empleados", 
    status_code=status.HTTP_200_OK,
    response_description="Lista de empleados"
)
def get_empleados(repo: BaseEmpleadoRepository = Depends(get_empleado_repository)):
    """
    Retorna una lista con **todos los empleados** registrados en la base de datos.

    **Retorna:**
    * `200 OK`: Lista completa de empleados.
    * `500 Internal Server Error`: Si ocurre un error inesperado al consultar la base de datos.
    """
    try:
        return repo.get_all_empleados()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener empleados: {e}")

# ==========================================================
# GET /empleados/{id}
# ==========================================================
@router.get(
    "/{id_empleado}", 
    summary="Obtener empleado por ID", 
    status_code=status.HTTP_200_OK,
    response_description="Datos del empleado"
)
def get_empleado(id_empleado: int, repo: BaseEmpleadoRepository = Depends(get_empleado_repository)):
    """
    Retorna los datos de un empleado específico buscando por su **ID numérico**.

    **Retorna:**
    * `200 OK`: Objeto con los datos del empleado.
    * `404 Not Found`: Si no se encuentra un empleado con ese ID.
    * `500 Internal Server Error`: Si ocurre un error inesperado.
    """
    try:
        empleado = repo.get_empleado_by_id(id_empleado)
        if not empleado:
            raise HTTPException(status_code=404, detail="Empleado no encontrado")
        return empleado
    except HTTPException: raise 
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar empleado: {e}")

# ==========================================================
# POST /empleados/cajero
# ==========================================================
@router.post(
    "/cajero", 
    summary="Crear nuevo cajero", 
    status_code=status.HTTP_201_CREATED,
    response_description="Cajero creado exitosamente"
)
def create_cajero(
    nombre: str, rut_empleado: str, telefono: str, correo: str,
    direccion: str, fecha_de_ingreso: str, usuario: str, contrasena: str,
    repo: BaseEmpleadoRepository = Depends(get_empleado_repository)
):
    """
    Crea un nuevo empleado con el rol **'cajero'**. La contraseña se **encripta** automáticamente antes de guardarse.

    **Retorna:**
    * `201 Created`: Empleado creado correctamente.
    * `400 Bad Request`: Si faltan campos obligatorios.
    * `409 Conflict`: Si el RUT o el nombre de usuario ya existen.
    * `500 Internal Server Error`: Si ocurre un error inesperado.
    """
    try:
        if not all([nombre, rut_empleado, usuario, contrasena]):
            raise HTTPException(status_code=400, detail="Faltan campos obligatorios")

        # Encriptación segura
        hash_seguro = get_password_hash(contrasena)

        data = {
            "nombre": nombre, "rut_empleado": rut_empleado, "telefono": telefono,
            "correo": correo, "direccion": direccion, "fecha_de_ingreso": fecha_de_ingreso,
            "usuario": usuario, 
            "contrasena": hash_seguro, 
            "rol": "cajero" 
        }

        nuevo_cajero = repo.create_empleado(data)
        return {"msg": "Cajero creado correctamente", "cajero": nuevo_cajero}

    except HTTPException: raise
    except Exception as e:
        if "UNIQUE" in str(e).upper() or "E11000" in str(e):
             raise HTTPException(status_code=409, detail="Conflicto: El usuario o RUT ya existe.")
        raise HTTPException(status_code=500, detail=f"Error al crear cajero: {e}")

# ==========================================================
# POST /empleados/administrador
# ==========================================================
@router.post(
    "/administrador", 
    summary="Crear nuevo administrador", 
    status_code=status.HTTP_201_CREATED,
    response_description="Administrador creado exitosamente"
)
def create_administrador(
    nombre: str, rut_empleado: str, telefono: str, correo: str,
    direccion: str, fecha_de_ingreso: str, usuario: str, contrasena: str,
    repo: BaseEmpleadoRepository = Depends(get_empleado_repository)
):
    """
    Crea un nuevo empleado con el rol **'administrador'**. La contraseña se **encripta** automáticamente antes de guardarse.

    **Retorna:**
    * `201 Created`: Administrador creado correctamente.
    * `400 Bad Request`: Si faltan campos obligatorios.
    * `409 Conflict`: Si el RUT o el nombre de usuario ya existen.
    * `500 Internal Server Error`: Si ocurre un error inesperado.
    """
    try:
        if not all([nombre, rut_empleado, usuario, contrasena]):
            raise HTTPException(status_code=400, detail="Faltan campos obligatorios")

        # Encriptación segura
        hash_seguro = get_password_hash(contrasena)

        data = {
            "nombre": nombre, "rut_empleado": rut_empleado, "telefono": telefono,
            "correo": correo, "direccion": direccion, "fecha_de_ingreso": fecha_de_ingreso,
            "usuario": usuario, 
            "contrasena": hash_seguro, 
            "rol": "administrador" 
        }

        nuevo_admin = repo.create_empleado(data)
        return {"msg": "Administrador creado correctamente", "administrador": nuevo_admin}

    except HTTPException: raise
    except Exception as e:
        if "UNIQUE" in str(e).upper() or "E11000" in str(e):
             raise HTTPException(status_code=409, detail="Conflicto: El usuario o RUT ya existe.")
        raise HTTPException(status_code=500, detail=f"Error al crear administrador: {e}")

# ==========================================================
# PUT /empleados/{id}
# ==========================================================
@router.put(
    "/{id_empleado}", 
    summary="Actualizar empleado", 
    status_code=status.HTTP_200_OK,
    response_description="Empleado actualizado"
)
def update_empleado(
    id_empleado: int, telefono: str, correo: str,
    repo: BaseEmpleadoRepository = Depends(get_empleado_repository)
):
    """
    Actualiza los datos de contacto (teléfono y correo) de un empleado existente.

    **Retorna:**
    * `200 OK`: Objeto con los datos actualizados del empleado.
    * `404 Not Found`: Si no se encuentra un empleado con ese ID.
    * `500 Internal Server Error`: Si ocurre un error inesperado.
    """
    try:
        data = {"telefono": telefono, "correo": correo}
        empleado_actualizado = repo.update_empleado(id_empleado, data)

        if not empleado_actualizado:
            raise HTTPException(status_code=404, detail="Empleado no encontrado")

        return {"msg": "Empleado actualizado correctamente", "empleado": empleado_actualizado}
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar empleado: {e}")

# ==========================================================
# DELETE /empleados/{id}
# ==========================================================
@router.delete(
    "/{id_empleado}", 
    summary="Eliminar empleado", 
    status_code=status.HTTP_200_OK,
    response_description="Confirmación de eliminación"
)
def delete_empleado(
    id_empleado: int,
    repo: BaseEmpleadoRepository = Depends(get_empleado_repository)
):
    """
    Elimina un empleado de la base de datos.
    
    **Nota:** No se puede eliminar si el empleado tiene registros asociados (ej: Ventas) en modo SQL.

    **Retorna:**
    * `200 OK`: Mensaje de confirmación.
    * `404 Not Found`: Si no se encuentra el empleado.
    * `409 Conflict`: Si el empleado no se puede eliminar por integridad referencial (tiene ventas).
    * `500 Internal Server Error`: Si ocurre un error inesperado.
    """
    try:
        eliminado = repo.delete_empleado(id_empleado)
        if not eliminado:
            raise HTTPException(status_code=404, detail="Empleado no encontrado")
        return {"msg": f"Empleado con ID {id_empleado} eliminado correctamente"}
    except HTTPException: raise
    except Exception as e:
        if "FOREIGN KEY" in str(e).upper():
            raise HTTPException(status_code=409, detail="No se puede eliminar, tiene registros asociados.")
        raise HTTPException(status_code=500, detail=f"Error al eliminar empleado: {e}")

# ==========================================================
# POST /empleados/login
# ==========================================================
@router.post(
    "/login", 
    summary="Inicio de sesión y obtención de Token", 
    status_code=status.HTTP_200_OK,
    response_description="Token de acceso (JWT)"
)
def login(
    usuario: str,
    contrasena: str,
    repo: BaseEmpleadoRepository = Depends(get_empleado_repository)
):
    """
    Autentica al usuario verificando sus credenciales y retorna un **Token de Acceso (JWT)**.

    **Flujo:**
    1.  Busca al usuario por nombre.
    2.  Verifica que la contraseña coincida con el hash almacenado.
    3.  Genera un Token firmado que contiene el rol y el ID del usuario.

    **Retorna:**
    * `200 OK`: Objeto con `access_token` y datos del usuario.
    * `401 Unauthorized`: Si el usuario no existe o la contraseña es incorrecta.
    * `500 Internal Server Error`: Si ocurre un error inesperado.
    """
    try:
        # 1. Buscar usuario
        empleado = repo.get_by_usuario(usuario)

        if not empleado:
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")

        # 2. Verificar contraseña (usando seguridad.py)
        es_valida = verify_password(contrasena, empleado.contrasena)

        if not es_valida:
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")

        # 3. Datos y Token
        id_emp = getattr(empleado, 'id_empleado', None)
        nombre = getattr(empleado, 'nombre', None)
        rol = getattr(empleado, 'rol', None)

        token_jwt = create_access_token(data={"sub": str(id_emp), "rol": rol, "nombre": nombre})

        return {
            "msg": "Login exitoso",
            "access_token": token_jwt,
            "token_type": "bearer",
            "empleado": {
                "id_empleado": id_emp,
                "nombre": nombre,
                "rol": rol
            }
        }
        
    except HTTPException: raise 
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error durante el login: {e}")