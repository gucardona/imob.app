ALTER TABLE imoveis ADD COLUMN area_construida_m2 REAL NOT NULL DEFAULT 0;
ALTER TABLE imoveis ADD COLUMN area_total_m2 REAL NOT NULL DEFAULT 0;
ALTER TABLE imoveis ADD COLUMN area_util_m2 REAL NOT NULL DEFAULT 0;
ALTER TABLE imoveis ADD COLUMN frente_m REAL NOT NULL DEFAULT 0;
ALTER TABLE imoveis ADD COLUMN lado_m REAL NOT NULL DEFAULT 0;

UPDATE imoveis
SET area_construida_m2 = CASE WHEN tipo != 'terreno' THEN area_m2 ELSE 0 END,
    area_total_m2 = area_m2
WHERE area_m2 > 0;
