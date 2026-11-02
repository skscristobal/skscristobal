import sqlite3

createEmpleado = """CREATE TABLE IF NOT EXISTS Empleado(
            id_empleado INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT,
            rut_empleado TEXT,
            telefono TEXT,
            correo TEXT,
            direccion TEXT,
            fecha_de_ingreso TEXT,
            rol TEXT,
            usuario TEXT,
            contrasena TEXT
            )"""

createProveedor = """CREATE TABLE IF NOT EXISTS Proveedor(
            id_proveedor INTEGER PRIMARY KEY AUTOINCREMENT,
            rut_proveedor TEXT,
            id_empleado INTEGER,
            correo TEXT,
            telefono TEXT,
            direccion TEXT,
            nombre_empresa TEXT
            )"""

createCliente = """CREATE TABLE IF NOT EXISTS Cliente(
            rut_cliente TEXT PRIMARY KEY,
            nombre_completo TEXT,
            direccion TEXT,
            celular TEXT,
            correo TEXT,
            fecha_de_nacimiento TEXT
            )"""

def crearBD():
    cursor.execute(createEmpleado)
    cursor.execute(createProveedor)
    cursor.execute(createCliente)

conn = sqlite3.connect('mercado.db')
cursor = conn.cursor()
crearBD()

with open("dump.sql", "r", encoding="utf-8") as dump:
    sql_script = dump.read()
cursor.executescript(sql_script)