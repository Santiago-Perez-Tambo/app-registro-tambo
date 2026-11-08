INSERT INTO establecimiento (nombre) VALUES ('Tambo Marcos Juárez');

INSERT INTO usuario (id_establecimiento, nombre, correo, rol, id_auth)
SELECT 1, 'Santiago', email, 'propietario', id
FROM auth.users WHERE email = 'CORREO_PROPIETARIO';

INSERT INTO usuario (id_establecimiento, nombre, correo, rol, id_auth)
SELECT 1, 'Tambero', email, 'tambero', id
FROM auth.users WHERE email = 'CORREO_TAMBERO';

SELECT id_usuario, nombre, rol, correo FROM usuario;
