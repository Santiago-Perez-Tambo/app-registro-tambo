BEGIN;

CREATE TEMP TABLE demo_hoy ON COMMIT DROP AS
SELECT ahora::date AS hoy, ahora
FROM (SELECT date_trunc('second', now() AT TIME ZONE 'America/Argentina/Cordoba') AS ahora) AS momento_base;

CREATE TEMP TABLE demo_usuario (correo varchar(120), nombre varchar(80), rol varchar(20)) ON COMMIT DROP;
INSERT INTO demo_usuario VALUES
  ('caepropietario@tambo.test', 'Propietario demo', 'propietario'),
  ('caetambero@tambo.test', 'Tambero demo', 'tambero'),
  ('caeasesor@tambo.test', 'Veterinario demo', 'asesor');

DO $$
DECLARE
  faltan text;
  ocupados text;
BEGIN
  SELECT string_agg(d.correo, ', ') INTO faltan
  FROM demo_usuario d
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = d.correo);
  IF faltan IS NOT NULL THEN
    RAISE EXCEPTION 'Falta crear en Authentication (auth.users): %', faltan;
  END IF;
  SELECT string_agg(d.correo, ', ') INTO ocupados
  FROM demo_usuario d
  JOIN auth.users u ON u.email = d.correo
  JOIN usuario us ON us.id_auth = u.id
  WHERE us.id_establecimiento <> 2;
  IF ocupados IS NOT NULL THEN
    RAISE EXCEPTION 'Estos correos ya son usuarios de otro establecimiento: %', ocupados;
  END IF;
END $$;

INSERT INTO establecimiento (id_establecimiento, nombre) VALUES (2, 'Tambo de demostración')
ON CONFLICT (id_establecimiento) DO NOTHING;

SELECT setval(pg_get_serial_sequence('establecimiento', 'id_establecimiento'),
              (SELECT max(id_establecimiento) FROM establecimiento));

INSERT INTO usuario (id_establecimiento, nombre, correo, rol, id_auth)
SELECT 2, d.nombre, d.correo, d.rol, u.id
FROM demo_usuario d
JOIN auth.users u ON u.email = d.correo
ON CONFLICT (id_auth) DO UPDATE SET nombre = excluded.nombre, correo = excluded.correo, rol = excluded.rol;

DELETE FROM advertencia
WHERE id_evento IN (SELECT e.id_evento FROM evento e
                    JOIN animal a ON a.id_animal = e.id_animal
                    WHERE a.id_establecimiento = 2);

DELETE FROM alerta
WHERE id_animal IN (SELECT id_animal FROM animal WHERE id_establecimiento = 2);

DELETE FROM evento
WHERE id_animal IN (SELECT id_animal FROM animal WHERE id_establecimiento = 2);

DELETE FROM captura
WHERE id_animal IN (SELECT id_animal FROM animal WHERE id_establecimiento = 2);

DELETE FROM usuario us
WHERE us.id_establecimiento = 2
  AND NOT EXISTS (SELECT 1 FROM demo_usuario d
                  JOIN auth.users u ON u.email = d.correo
                  WHERE u.id = us.id_auth);

DELETE FROM animal WHERE id_establecimiento = 2;

INSERT INTO animal (id_establecimiento, caravana, categoria, estado_reproductivo) VALUES
  (2, 'A100', 'vaca en ordeñe', 'servida sin tacto'),
  (2, 'A176', 'vaca en ordeñe', 'servida sin tacto'),
  (2, 'A146', 'vaquillona', 'vacía'),
  (2, 'A057', 'vaca en ordeñe', 'servida sin tacto'),
  (2, 'A004', 'vaca en ordeñe', 'servida sin tacto'),
  (2, 'A025', 'vaca en ordeñe', 'servida sin tacto'),
  (2, 'A095', 'vaca seca', 'preñada'),
  (2, 'A055', 'vaca en ordeñe', 'preñada'),
  (2, 'A029', 'vaca en ordeñe', 'preñada'),
  (2, 'A023', 'vaca en ordeñe', 'servida sin tacto'),
  (2, 'A090', 'vaca en ordeñe', 'preñada'),
  (2, 'A007', 'vaca en ordeñe', 'preñada'),
  (2, 'A047', 'vaca en ordeñe', 'preñada'),
  (2, 'A008', 'vaca en ordeñe', 'vacía'),
  (2, 'A000', 'vaca en ordeñe', 'vacía'),
  (2, 'A125', 'vaca seca', 'preñada'),
  (2, 'A014', 'vaca en ordeñe', 'preñada'),
  (2, 'A138', 'vaca en ordeñe', 'vacía'),
  (2, 'A065', 'vaca en ordeñe', 'vacía'),
  (2, 'A077', 'vaca en ordeñe', 'vacía'),
  (2, '3946', 'vaca en ordeñe', 'vacía'),
  (2, 'A013', 'vaca en ordeñe', 'vacía'),
  (2, 'A104', 'vaca seca', 'preñada'),
  (2, 'A003', 'vaquillona', 'servida sin tacto'),
  (2, 'A021', 'vaquillona', 'preñada'),
  (2, 'A136', 'vaquillona', NULL);

UPDATE animal AS a SET fecha_nacimiento = v.nacimiento::date, id_madre = m.id_animal
FROM (VALUES
  ('A146', '2024-12-02', 'A047')
) AS v(caravana, nacimiento, madre)
LEFT JOIN animal AS m ON m.caravana = v.madre AND m.id_establecimiento = 2
WHERE a.caravana = v.caravana AND a.id_establecimiento = 2;

CREATE TEMP TABLE demo_evento (
  caravana varchar(20),
  dias integer,
  hora time,
  cargo varchar(20),
  tipo_evento varchar(15),
  tipo_servicio varchar(15),
  toro varchar(20),
  resultado_tacto varchar(10),
  edad_gestacional integer,
  motivo_secado varchar(20),
  sexo_ternero char(1),
  texto text,
  estado varchar(15),
  id_captura uuid DEFAULT gen_random_uuid(),
  fecha_hora timestamp
) ON COMMIT DROP;

INSERT INTO demo_evento (caravana, dias, hora, cargo, tipo_evento, tipo_servicio, toro, resultado_tacto,
                         edad_gestacional, motivo_secado, sexo_ternero, texto, estado) VALUES
  ('A100', -430, '06:20', 'tambero', 'parto', null, null, null, null, null, 'H', 'parió una ternera, todo bien', 'confirmada'),
  ('A100', -370, '07:05', 'tambero', 'servicio', 'monta natural', 'Colorado', null, null, null, null, 'la sirvió el toro Colorado', 'confirmada'),
  ('A100', -325, '10:30', 'asesor', 'tacto', null, null, 'vacía', null, null, null, 'tacto vacía', 'confirmada'),
  ('A100', -318, '06:50', 'tambero', 'servicio', 'inseminación', '512', null, null, null, null, 'inseminada con el toro 512', 'confirmada'),
  ('A100', -273, '10:15', 'asesor', 'tacto', null, null, 'preñada', 45, null, null, 'tacto preñada de 45 días', 'confirmada'),
  ('A100', -95, '17:40', 'tambero', 'secado', null, null, null, null, 'preñez', null, 'secada por preñez', 'confirmada'),
  ('A100', -35, '05:55', 'tambero', 'parto', null, null, null, null, null, 'M', 'parió un ternero macho', 'confirmada'),
  ('A100', -12, '06:40', 'tambero', 'servicio', 'inseminación', '512', null, null, null, null, 'inseminada con el toro 512', 'confirmada'),
  ('A055', -300, '06:10', 'tambero', 'parto', null, null, null, null, null, 'H', 'parió una ternera', 'confirmada'),
  ('A055', -218, '07:00', 'tambero', 'servicio', 'inseminación', '498', null, null, null, null, 'inseminada con el toro 498', 'confirmada'),
  ('A055', -173, '10:20', 'asesor', 'tacto', null, null, 'preñada', 45, null, null, 'tacto preñada de 45 días', 'confirmada'),
  ('A095', -360, '05:45', 'tambero', 'parto', null, null, null, null, null, 'M', 'parió un ternero macho', 'confirmada'),
  ('A095', -279, '06:55', 'tambero', 'servicio', 'inseminación', '498', null, null, null, null, 'inseminada con el toro 498', 'confirmada'),
  ('A095', -234, '10:05', 'asesor', 'tacto', null, null, 'preñada', 45, null, null, 'tacto preñada de 45 días', 'confirmada'),
  ('A095', -56, '17:30', 'tambero', 'secado', null, null, null, null, 'preñez', null, 'secada por preñez', 'confirmada'),
  ('A004', -110, '06:15', 'tambero', 'parto', null, null, null, null, null, 'H', 'parió una ternera', 'confirmada'),
  ('A004', -45, '06:45', 'tambero', 'servicio', 'inseminación', '512', null, null, null, null, 'inseminada con el toro 512', 'confirmada'),
  ('A025', -120, '05:50', 'tambero', 'parto', null, null, null, null, null, 'M', 'parió un ternero macho', 'confirmada'),
  ('A025', -48, '07:10', 'tambero', 'servicio', 'inseminación', '377', null, null, null, null, 'inseminada con el toro 377', 'confirmada'),
  ('A057', -95, '06:30', 'tambero', 'parto', null, null, null, null, null, 'H', 'parió una ternera', 'confirmada'),
  ('A057', -20, '06:35', 'tambero', 'servicio', 'inseminación', '512', null, null, null, null, 'inseminada con el toro 512', 'confirmada'),
  ('A013', -333, '06:40', 'tambero', 'servicio', 'inseminación', '377', null, null, null, null, 'inseminada con el toro 377', 'confirmada'),
  ('A013', -288, '10:40', 'asesor', 'tacto', null, null, 'preñada', 45, null, null, 'tacto preñada de 45 días', 'confirmada'),
  ('A013', -110, '17:50', 'tambero', 'secado', null, null, null, null, 'preñez', null, 'secada por preñez', 'confirmada'),
  ('A013', -50, '06:05', 'tambero', 'parto', null, null, null, null, null, 'H', 'parió una ternera', 'confirmada'),
  ('A065', -62, '06:25', 'tambero', 'parto', null, null, null, null, null, 'M', 'parió un ternero macho', 'confirmada'),
  ('A077', -285, '07:15', 'tambero', 'servicio', 'inseminación', '498', null, null, null, null, 'inseminada con el toro 498', 'confirmada'),
  ('A077', -240, '10:25', 'asesor', 'tacto', null, null, 'preñada', 45, null, null, 'tacto preñada de 45 días', 'confirmada'),
  ('A077', -62, '17:35', 'tambero', 'secado', null, null, null, null, 'preñez', null, 'secada por preñez', 'confirmada'),
  ('A077', -2, '05:40', 'tambero', 'parto', null, null, null, null, null, 'H', 'parió una ternera a la madrugada', 'confirmada'),
  ('A000', -291, '06:50', 'tambero', 'servicio', 'inseminación', '377', null, null, null, null, 'inseminada con el toro 377', 'confirmada'),
  ('A000', -246, '10:35', 'asesor', 'tacto', null, null, 'preñada', 45, null, null, 'tacto preñada de 45 días', 'confirmada'),
  ('A000', -68, '17:45', 'tambero', 'secado', null, null, null, null, 'preñez', null, 'secada por preñez', 'confirmada'),
  ('A000', -8, '06:00', 'tambero', 'parto', null, null, null, null, null, 'M', 'parió un ternero macho', 'confirmada'),
  ('A029', -180, '06:35', 'tambero', 'parto', null, null, null, null, null, 'H', 'parió una ternera', 'confirmada'),
  ('A029', -100, '06:45', 'tambero', 'servicio', 'inseminación', '498', null, null, null, null, 'inseminada con el toro 498', 'confirmada'),
  ('A029', -55, '10:10', 'asesor', 'tacto', null, null, 'preñada', 70, null, null, 'tacto preñada, 70 días', 'confirmada'),
  ('A023', -130, '06:10', 'tambero', 'parto', null, null, null, null, null, 'M', 'parió un ternero macho', 'confirmada'),
  ('A023', -40, '06:55', 'tambero', 'servicio', 'inseminación', '512', null, null, null, null, 'inseminada con el toro 512', 'confirmada'),
  ('A023', -19, '07:05', 'tambero', 'servicio', 'inseminación', '377', null, null, null, null, 'repitió celo, inseminada con el toro 377', 'confirmada'),
  ('A007', -200, '05:55', 'tambero', 'parto', null, null, null, null, null, 'H', 'parió una ternera', 'confirmada'),
  ('A007', -130, '06:40', 'tambero', 'servicio', 'inseminación', '377', null, null, null, null, 'inseminada con el toro 377', 'confirmada'),
  ('A007', -85, '10:45', 'asesor', 'tacto', null, null, 'preñada', 45, null, null, 'tacto preñada de 45 días', 'confirmada'),
  ('A047', -160, '06:20', 'tambero', 'parto', null, null, null, null, null, 'M', 'parió un ternero macho', 'confirmada'),
  ('A047', -90, '07:20', 'tambero', 'servicio', 'monta natural', 'Colorado', null, null, null, null, 'la sirvió el toro Colorado', 'confirmada'),
  ('A047', -40, '10:50', 'asesor', 'tacto', null, null, 'preñada', 50, null, null, 'tacto preñada de 50 días', 'confirmada'),
  ('A125', -330, '06:15', 'tambero', 'parto', null, null, null, null, null, 'H', 'parió una ternera', 'confirmada'),
  ('A125', -250, '06:50', 'tambero', 'servicio', 'inseminación', '498', null, null, null, null, 'inseminada con el toro 498', 'confirmada'),
  ('A125', -205, '10:30', 'asesor', 'tacto', null, null, 'preñada', 45, null, null, 'tacto preñada de 45 días', 'confirmada'),
  ('A125', -27, '17:40', 'tambero', 'secado', null, null, null, null, 'preñez', null, 'secada por preñez', 'confirmada'),
  ('A003', -30, '07:30', 'tambero', 'servicio', 'inseminación', '512', null, null, null, null, 'inseminada con el toro 512', 'confirmada'),
  ('A021', -100, '07:25', 'tambero', 'servicio', 'inseminación', '377', null, null, null, null, 'inseminada con el toro 377', 'confirmada'),
  ('A021', -55, '10:15', 'asesor', 'tacto', null, null, 'preñada', 45, null, null, 'tacto preñada de 45 días', 'confirmada'),
  ('A008', 0, null, 'tambero', 'servicio', 'inseminación', '512', null, null, null, null, 'inseminada hoy con el toro 512', 'interpretada'),
  ('A138', 0, null, 'tambero', 'servicio', 'inseminación', null, null, null, null, null, 'inseminada hoy, la pajuela no se lee bien, 51 y algo', 'interpretada'),
  ('A090', 0, null, 'tambero', 'secado', null, null, null, null, 'preñez', null, 'se secó la 14 por preñez', 'interpretada');

UPDATE demo_evento d SET fecha_hora = h.hoy + d.dias + d.hora
FROM demo_hoy h
WHERE d.hora IS NOT NULL;

UPDATE demo_evento d SET fecha_hora = h.ahora - v.minutos * interval '1 minute'
FROM demo_hoy h, (VALUES ('A008', 90), ('A138', 80), ('A090', 70)) AS v(caravana, minutos)
WHERE d.caravana = v.caravana AND d.estado = 'interpretada';

INSERT INTO captura (id_captura, id_usuario, id_animal, fecha_hora, tipo_captura, texto, transcripcion, estado)
SELECT d.id_captura, u.id_usuario, a.id_animal, d.fecha_hora, 'texto', d.texto, d.texto, d.estado
FROM demo_evento d
JOIN animal a ON a.id_establecimiento = 2 AND a.caravana = d.caravana
JOIN demo_usuario du ON du.rol = d.cargo
JOIN usuario u ON u.id_establecimiento = 2 AND u.correo = du.correo;

INSERT INTO evento (id_animal, id_captura, id_usuario_confirma, tipo_evento, fecha_evento, tipo_servicio, toro,
                    resultado_tacto, edad_gestacional, motivo_secado, sexo_ternero, fecha_confirmacion)
SELECT a.id_animal, d.id_captura,
       CASE WHEN d.estado = 'confirmada' THEN c.id_usuario END,
       d.tipo_evento, d.fecha_hora::date, d.tipo_servicio, d.toro,
       d.resultado_tacto, d.edad_gestacional, d.motivo_secado, d.sexo_ternero,
       CASE WHEN d.estado = 'confirmada' THEN d.fecha_hora + interval '2 hours' END
FROM demo_evento d
JOIN animal a ON a.id_establecimiento = 2 AND a.caravana = d.caravana
JOIN demo_usuario dc ON dc.rol = CASE WHEN d.cargo = 'asesor' THEN 'asesor' ELSE 'propietario' END
JOIN usuario c ON c.id_establecimiento = 2 AND c.correo = dc.correo
ORDER BY d.fecha_hora;

INSERT INTO alerta (id_animal, id_evento_origen, tipo_alerta, fecha_objetivo, estado)
SELECT e.id_animal, e.id_evento, v.tipo_alerta, h.hoy + v.dias, v.estado
FROM (VALUES
  ('A100', -430, 'sin_celo', -385, 'cumplida'),
  ('A100', -430, 'inducir_celo', -370, 'cumplida'),
  ('A100', -370, 'tacto', -325, 'cumplida'),
  ('A100', -318, 'tacto', -273, 'cumplida'),
  ('A100', -273, 'parto', -35, 'cumplida'),
  ('A100', -273, 'secado', -95, 'cumplida'),
  ('A100', -35, 'sin_celo', 10, 'cumplida'),
  ('A100', -35, 'inducir_celo', 25, 'cumplida'),
  ('A100', -12, 'tacto', 33, 'vigente'),
  ('A055', -300, 'sin_celo', -255, 'cumplida'),
  ('A055', -300, 'inducir_celo', -240, 'cumplida'),
  ('A055', -218, 'tacto', -173, 'cumplida'),
  ('A055', -173, 'parto', 65, 'vigente'),
  ('A055', -173, 'secado', 5, 'vigente'),
  ('A095', -360, 'sin_celo', -315, 'cumplida'),
  ('A095', -360, 'inducir_celo', -300, 'cumplida'),
  ('A095', -279, 'tacto', -234, 'cumplida'),
  ('A095', -234, 'parto', 4, 'vigente'),
  ('A095', -234, 'secado', -56, 'cumplida'),
  ('A004', -110, 'sin_celo', -65, 'cumplida'),
  ('A004', -110, 'inducir_celo', -50, 'cumplida'),
  ('A004', -45, 'tacto', 0, 'vigente'),
  ('A025', -120, 'sin_celo', -75, 'cumplida'),
  ('A025', -120, 'inducir_celo', -60, 'cumplida'),
  ('A025', -48, 'tacto', -3, 'vigente'),
  ('A057', -95, 'sin_celo', -50, 'cumplida'),
  ('A057', -95, 'inducir_celo', -35, 'cumplida'),
  ('A057', -20, 'tacto', 25, 'vigente'),
  ('A013', -333, 'tacto', -288, 'cumplida'),
  ('A013', -288, 'parto', -50, 'cumplida'),
  ('A013', -288, 'secado', -110, 'cumplida'),
  ('A013', -50, 'sin_celo', -5, 'vigente'),
  ('A013', -50, 'inducir_celo', 10, 'vigente'),
  ('A065', -62, 'sin_celo', -17, 'vigente'),
  ('A065', -62, 'inducir_celo', -2, 'vigente'),
  ('A077', -285, 'tacto', -240, 'cumplida'),
  ('A077', -240, 'parto', -2, 'cumplida'),
  ('A077', -240, 'secado', -62, 'cumplida'),
  ('A077', -2, 'sin_celo', 43, 'vigente'),
  ('A077', -2, 'inducir_celo', 58, 'vigente'),
  ('A000', -291, 'tacto', -246, 'cumplida'),
  ('A000', -246, 'parto', -8, 'cumplida'),
  ('A000', -246, 'secado', -68, 'cumplida'),
  ('A000', -8, 'sin_celo', 37, 'vigente'),
  ('A000', -8, 'inducir_celo', 52, 'vigente'),
  ('A029', -180, 'sin_celo', -135, 'cumplida'),
  ('A029', -180, 'inducir_celo', -120, 'cumplida'),
  ('A029', -100, 'tacto', -55, 'cumplida'),
  ('A029', -55, 'parto', 158, 'vigente'),
  ('A029', -55, 'secado', 98, 'vigente'),
  ('A023', -130, 'sin_celo', -85, 'cumplida'),
  ('A023', -130, 'inducir_celo', -70, 'cumplida'),
  ('A023', -40, 'tacto', 5, 'cumplida'),
  ('A023', -19, 'tacto', 26, 'vigente'),
  ('A007', -200, 'sin_celo', -155, 'cumplida'),
  ('A007', -200, 'inducir_celo', -140, 'cumplida'),
  ('A007', -130, 'tacto', -85, 'cumplida'),
  ('A007', -85, 'parto', 153, 'vigente'),
  ('A007', -85, 'secado', 93, 'vigente'),
  ('A047', -160, 'sin_celo', -115, 'cumplida'),
  ('A047', -160, 'inducir_celo', -100, 'cumplida'),
  ('A047', -90, 'tacto', -45, 'cumplida'),
  ('A047', -40, 'parto', 193, 'vigente'),
  ('A047', -40, 'secado', 133, 'vigente'),
  ('A125', -330, 'sin_celo', -285, 'cumplida'),
  ('A125', -330, 'inducir_celo', -270, 'cumplida'),
  ('A125', -250, 'tacto', -205, 'cumplida'),
  ('A125', -205, 'parto', 33, 'vigente'),
  ('A125', -205, 'secado', -27, 'cumplida'),
  ('A003', -30, 'tacto', 15, 'vigente'),
  ('A021', -100, 'tacto', -55, 'cumplida'),
  ('A021', -55, 'parto', 183, 'vigente')
) AS v(caravana, dias_evento, tipo_alerta, dias, estado)
CROSS JOIN demo_hoy h
JOIN demo_evento d ON d.caravana = v.caravana AND d.dias = v.dias_evento
JOIN evento e ON e.id_captura = d.id_captura;

INSERT INTO advertencia (id_evento, tipo_advertencia, detalle, resuelta)
SELECT e.id_evento, v.tipo_advertencia, v.detalle, v.resuelta
FROM demo_hoy h
CROSS JOIN LATERAL (VALUES
  ('A029', -100, 'servicio_no_coincidente',
   format('El tacto del %s da la concepción el %s, a 25 días de este servicio',
          to_char(h.hoy - 55, 'DD/MM'), to_char(h.hoy - 125, 'DD/MM')), false),
  ('A023', -40, 'repeticion_celo',
   'Repetición de celo: hubo un nuevo servicio el ' || to_char(h.hoy - 19, 'DD/MM'), true),
  ('A138', 0, 'dato_no_entendido',
   'No se entendió el toro: el número de la pajuela no se lee completo', false),
  ('A090', 0, 'otra_caravana',
   'El texto nombra A014; el evento quedó en A090', false)
) AS v(caravana, dias_evento, tipo_advertencia, detalle, resuelta)
JOIN demo_evento d ON d.caravana = v.caravana AND d.dias = v.dias_evento
JOIN evento e ON e.id_captura = d.id_captura;

COMMIT;

SELECT
  (SELECT count(*) FROM animal WHERE id_establecimiento = 2) AS animales,
  (SELECT count(*) FROM captura c JOIN animal a ON a.id_animal = c.id_animal WHERE a.id_establecimiento = 2) AS capturas,
  (SELECT count(*) FROM evento e JOIN animal a ON a.id_animal = e.id_animal WHERE a.id_establecimiento = 2) AS eventos,
  (SELECT count(*) FROM alerta l JOIN animal a ON a.id_animal = l.id_animal WHERE a.id_establecimiento = 2) AS alertas,
  (SELECT count(*) FROM advertencia v JOIN evento e ON e.id_evento = v.id_evento
     JOIN animal a ON a.id_animal = e.id_animal WHERE a.id_establecimiento = 2) AS advertencias;
