BEGIN;

DELETE FROM advertencia
WHERE id_evento IN (SELECT e.id_evento FROM evento e
                    JOIN animal a ON a.id_animal = e.id_animal
                    WHERE a.id_establecimiento = 1);

DELETE FROM alerta
WHERE id_animal IN (SELECT id_animal FROM animal WHERE id_establecimiento = 1);

DELETE FROM evento
WHERE id_animal IN (SELECT id_animal FROM animal WHERE id_establecimiento = 1);

DELETE FROM captura
WHERE id_animal IN (SELECT id_animal FROM animal WHERE id_establecimiento = 1);

UPDATE animal AS a SET categoria = v.categoria, estado_reproductivo = v.estado_reproductivo
FROM (VALUES
  ('A100', 'vaca en ordeñe', 'servida sin tacto'),
  ('A176', 'vaca en ordeñe', 'servida sin tacto'),
  ('A146', 'vaquillona', 'vacía'),
  ('A057', 'vaca en ordeñe', 'servida sin tacto'),
  ('A004', 'vaca en ordeñe', 'servida sin tacto'),
  ('A025', 'vaca en ordeñe', 'servida sin tacto'),
  ('A091', 'vaca seca', 'servida sin tacto'),
  ('A095', 'vaca seca', 'preñada'),
  ('A017', 'vaca seca', 'servida sin tacto'),
  ('A055', 'vaca en ordeñe', 'preñada'),
  ('A029', 'vaca en ordeñe', 'servida sin tacto'),
  ('A023', 'vaca en ordeñe', 'servida sin tacto'),
  ('A058', 'vaca en ordeñe', 'servida sin tacto'),
  ('A088', 'vaca en ordeñe', 'servida sin tacto'),
  ('A090', 'vaca en ordeñe', 'preñada'),
  ('A089', 'vaca en ordeñe', 'servida sin tacto'),
  ('A032', 'vaca en ordeñe', 'servida sin tacto'),
  ('A007', 'vaca en ordeñe', 'preñada'),
  ('A031', 'vaca en ordeñe', 'servida sin tacto'),
  ('A012', 'vaca en ordeñe', 'servida sin tacto'),
  ('A047', 'vaca en ordeñe', 'preñada'),
  ('A169', 'vaca en ordeñe', 'preñada'),
  ('A011', 'vaca en ordeñe', 'servida sin tacto'),
  ('A037', 'vaca en ordeñe', 'servida sin tacto'),
  ('A008', 'vaca en ordeñe', 'vacía'),
  ('A076', 'vaca en ordeñe', 'servida sin tacto'),
  ('A035', 'vaca en ordeñe', 'servida sin tacto'),
  ('A081', 'vaca en ordeñe', 'servida sin tacto'),
  ('A124', 'vaca en ordeñe', 'servida sin tacto'),
  ('A000', 'vaca en ordeñe', 'vacía'),
  ('A127', 'vaca en ordeñe', 'preñada'),
  ('A131', 'vaca en ordeñe', 'servida sin tacto'),
  ('A125', 'vaca seca', 'preñada'),
  ('A086', 'vaca en ordeñe', 'servida sin tacto'),
  ('A014', 'vaca en ordeñe', 'preñada'),
  ('A138', 'vaca en ordeñe', 'vacía'),
  ('A065', 'vaca en ordeñe', 'vacía'),
  ('A016', 'vaca en ordeñe', 'preñada'),
  ('A077', 'vaca en ordeñe', 'vacía'),
  ('A048', 'vaca en ordeñe', 'servida sin tacto'),
  ('3946', 'vaca en ordeñe', 'vacía'),
  ('A015', 'vaca seca', 'preñada'),
  ('A028', 'vaca en ordeñe', 'preñada'),
  ('A082', 'vaca en ordeñe', 'servida sin tacto'),
  ('A030', 'vaca seca', 'preñada'),
  ('A013', 'vaca en ordeñe', 'vacía'),
  ('A104', 'vaca seca', 'preñada'),
  ('A003', 'vaquillona', 'servida sin tacto'),
  ('A021', 'vaquillona', 'servida sin tacto'),
  ('A024', 'vaquillona', 'servida sin tacto'),
  ('A078', 'vaquillona', 'servida sin tacto'),
  ('A085', 'vaquillona', 'servida sin tacto'),
  ('A136', 'vaquillona', NULL),
  ('A137', 'vaquillona', NULL),
  ('A141', 'vaquillona', NULL),
  ('A142', 'vaquillona', NULL),
  ('A145', 'vaquillona', NULL),
  ('A147', 'vaquillona', 'servida sin tacto'),
  ('A171', 'vaquillona', 'servida sin tacto'),
  ('A168', 'vaquillona', 'servida sin tacto'),
  ('A158', 'vaquillona', NULL),
  ('A019', 'vaquillona', 'servida sin tacto'),
  ('A079', 'vaquillona', 'servida sin tacto'),
  ('A128', 'vaquillona', 'servida sin tacto'),
  ('A135', 'vaquillona', 'servida sin tacto'),
  ('A080', 'vaquillona', 'servida sin tacto'),
  ('A075', 'vaquillona', 'servida sin tacto'),
  ('3962', 'vaca seca', 'preñada'),
  ('A170', 'vaquillona', 'servida sin tacto'),
  ('A172', 'vaquillona', 'servida sin tacto'),
  ('A174', 'vaquillona', 'preñada'),
  ('A018', 'vaquillona', 'servida sin tacto'),
  ('A148', 'vaquillona', 'servida sin tacto'),
  ('A183', 'ternera', NULL)
) AS v(caravana, categoria, estado_reproductivo)
WHERE a.id_establecimiento = 1 AND a.caravana = v.caravana;

COMMIT;

SELECT
  (SELECT count(*) FROM animal WHERE id_establecimiento = 1) AS animales,
  (SELECT count(*) FROM captura c JOIN animal a ON a.id_animal = c.id_animal WHERE a.id_establecimiento = 1) AS capturas,
  (SELECT count(*) FROM evento e JOIN animal a ON a.id_animal = e.id_animal WHERE a.id_establecimiento = 1) AS eventos,
  (SELECT count(*) FROM alerta l JOIN animal a ON a.id_animal = l.id_animal WHERE a.id_establecimiento = 1) AS alertas,
  (SELECT count(*) FROM advertencia v JOIN evento e ON e.id_evento = v.id_evento
     JOIN animal a ON a.id_animal = e.id_animal WHERE a.id_establecimiento = 1) AS advertencias;
