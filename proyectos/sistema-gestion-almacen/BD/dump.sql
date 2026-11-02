BEGIN TRANSACTION;

INSERT INTO Empleado (nombre, rut_empleado, telefono, correo, direccion, fecha_de_ingreso, rol, usuario, contrasena) VALUES
('Juan Pérez', '11.111.111-1', '912345678', 'juan.perez@empresa.com', 'Calle Falsa 123', '2022-01-01', 'cajero', 'jperez', '1234'),
('María López', '22.222.222-2', '923456789', 'maria.lopez@empresa.com', 'Avenida Siempre Viva 456', '2022-02-01', 'cajero', 'mlopez', '1234'),
('Carlos Gómez', '33.333.333-3', '934567890', 'carlos.gomez@empresa.com', 'Boulevard Central 789', '2021-05-01', 'administrador', 'cgomez', 'admin123');

INSERT INTO Proveedor (rut_proveedor, id_empleado, correo, telefono, direccion, nombre_empresa) VALUES
("11.222.333-4", 3, 'contacto@proveedor1.com', '987654321', 'Calle Uno 111', 'Proveedor Uno'),
("22.333.444-5", 3, 'contacto@proveedor2.com', '976543210', 'Calle Dos 222', 'Proveedor Dos'),
("33.444.555-6", 3, 'contacto@proveedor3.com', '965432109', 'Calle Tres 333', 'Proveedor Tres'),
("44.555.666-7", 3, 'contacto@proveedor4.com', '954321098', 'Calle Cuatro 444', 'Proveedor Cuatro'),
("55.666.777-8", 3, 'contacto@proveedor5.com', '943210987', 'Calle Cinco 555', 'Proveedor Cinco');

INSERT INTO Cliente (rut_cliente, nombre_completo, direccion, celular, correo, fecha_de_nacimiento) VALUES
('1-9', 'Cliente Uno', 'Direccion 1', '900000001', 'cliente1@mail.com', '1990-01-01'),
('2-7', 'Cliente Dos', 'Direccion 2', '900000002', 'cliente2@mail.com', '1991-02-02'),
('3-5', 'Cliente Tres', 'Direccion 3', '900000003', 'cliente3@mail.com', '1992-03-03'),
('4-3', 'Cliente Cuatro', 'Direccion 4', '900000004', 'cliente4@mail.com', '1993-04-04'),
('5-1', 'Cliente Cinco', 'Direccion 5', '900000005', 'cliente5@mail.com', '1994-05-05'),
('6-9', 'Cliente Seis', 'Direccion 6', '900000006', 'cliente6@mail.com', '1995-06-06'),
('7-7', 'Cliente Siete', 'Direccion 7', '900000007', 'cliente7@mail.com', '1996-07-07'),
('8-5', 'Cliente Ocho', 'Direccion 8', '900000008', 'cliente8@mail.com', '1997-08-08'),
('9-3', 'Cliente Nueve', 'Direccion 9', '900000009', 'cliente9@mail.com', '1998-09-09'),
('10-1', 'Cliente Diez', 'Direccion 10', '900000010', 'cliente10@mail.com', '1999-10-10');

COMMIT;