-- =============================================================================
--  Base de deméritos  (esquema demeritos)
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS demeritos;
SET search_path TO demeritos, public;

DO $$ BEGIN CREATE TYPE demeritos.tipo_notif_enum   AS ENUM ('demerito','reconocimiento','redencion'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE demeritos.causal_letra_enum AS ENUM ('A','B','C','D'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE demeritos.opcion_letra_enum AS ENUM ('A','B','C'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE demeritos.tipo_rc_enum      AS ENUM ('A','B'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS demeritos.causales_demerito (
  id_causal   SERIAL PRIMARY KEY,
  letra       demeritos.causal_letra_enum NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS demeritos.opciones_redencion (
  id_opcion   SERIAL PRIMARY KEY,
  letra       demeritos.opcion_letra_enum NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS demeritos.tipos_reconocimiento (
  id_tipo     SERIAL PRIMARY KEY,
  letra       demeritos.tipo_rc_enum NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS demeritos.demeritos (
  id_demerito      BIGSERIAL PRIMARY KEY,
  nie              VARCHAR(20) NOT NULL,
  id_causal        INTEGER NOT NULL REFERENCES demeritos.causales_demerito(id_causal),
  causal_letra     demeritos.causal_letra_enum NOT NULL,
  id_maestro       INTEGER NOT NULL,
  fecha            DATE NOT NULL DEFAULT CURRENT_DATE,
  observacion      TEXT,
  sexo_alumno      CHAR(1) CHECK (sexo_alumno IN ('M','H')),
  redimido         BOOLEAN NOT NULL DEFAULT FALSE,
  alumno_firmo     BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_redencion  TIMESTAMPTZ,
  id_mov_redencion BIGINT,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demeritos.reconocimientos (
  id_reconocimiento BIGSERIAL PRIMARY KEY,
  nie               VARCHAR(20) NOT NULL,
  id_tipo           INTEGER NOT NULL REFERENCES demeritos.tipos_reconocimiento(id_tipo),
  tipo_letra        demeritos.tipo_rc_enum NOT NULL,
  id_maestro        INTEGER NOT NULL,
  fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
  observacion       TEXT,
  sexo_alumno       CHAR(1),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demeritos.movimientos_redencion (
  id_mov       BIGSERIAL PRIMARY KEY,
  nie          VARCHAR(20) NOT NULL,
  id_demerito  BIGINT NOT NULL REFERENCES demeritos.demeritos(id_demerito) ON DELETE CASCADE,
  id_opcion    INTEGER NOT NULL REFERENCES demeritos.opciones_redencion(id_opcion),
  opcion_letra demeritos.opcion_letra_enum NOT NULL,
  id_maestro   INTEGER NOT NULL,
  observacion  TEXT,
  fecha_hora   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demeritos.notificaciones (
  id_notif     BIGSERIAL PRIMARY KEY,
  nie          VARCHAR(20) NOT NULL,
  tipo         demeritos.tipo_notif_enum NOT NULL,
  nivel_alerta SMALLINT NOT NULL DEFAULT 0 CHECK (nivel_alerta BETWEEN 0 AND 3),
  titulo       VARCHAR(255) NOT NULL,
  mensaje      TEXT NOT NULL,
  leida        BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_hora   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE demeritos.demeritos
    ADD CONSTRAINT fk_demeritos_mov_redencion
    FOREIGN KEY (id_mov_redencion)
    REFERENCES demeritos.movimientos_redencion(id_mov)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_dem_nie      ON demeritos.demeritos(nie);
CREATE INDEX IF NOT EXISTS idx_dem_fecha    ON demeritos.demeritos(fecha);
CREATE INDEX IF NOT EXISTS idx_dem_redimido ON demeritos.demeritos(redimido);
CREATE INDEX IF NOT EXISTS idx_rc_nie       ON demeritos.reconocimientos(nie);
CREATE INDEX IF NOT EXISTS idx_notif_nie    ON demeritos.notificaciones(nie);
CREATE INDEX IF NOT EXISTS idx_notif_leida  ON demeritos.notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notif_hora   ON demeritos.notificaciones(fecha_hora DESC);

INSERT INTO demeritos.causales_demerito (letra, descripcion, activo) VALUES
  ('A', 'NO SALUDAR AL ENTRAR O AL SALIR DEL AULA', TRUE),
  ('B', 'OMITIR POR FAVOR AL HACER UNA PETICIÓN', TRUE),
  ('C', 'OMITIR GRACIAS AL RECIBIR UN FAVOR, MATERIAL O ATENCIÓN', TRUE),
  ('D', 'USAR UN TONO GROSERO O IRRESPETUOSO HACIA COMPAÑEROS, DOCENTES O PERSONAL', TRUE)
ON CONFLICT (letra) DO UPDATE SET descripcion = EXCLUDED.descripcion, activo = TRUE;

INSERT INTO demeritos.opciones_redencion (letra, descripcion, activo) VALUES
  ('A', 'CUMPLIR UNA SEMANA COMPLETA CON SALUDOS Y EXPRESIONES DE CORTESÍA EJEMPLARES', TRUE),
  ('B', 'APOYAR VOLUNTARIAMENTE EN ACTIVIDADES DE ORDEN Y LIMPIEZA ESCOLAR', TRUE),
  ('C', 'PARTICIPAR EN CAMPAÑAS DE VALORES ORGANIZADAS POR EL CENTRO EDUCATIVO', TRUE)
ON CONFLICT (letra) DO UPDATE SET descripcion = EXCLUDED.descripcion, activo = TRUE;

INSERT INTO demeritos.tipos_reconocimiento (letra, descripcion, activo) VALUES
  ('A', 'MENCIÓN HONORÍFICA EN MURAL ESCOLAR DE CORTESÍA ESCOLAR', TRUE),
  ('B', 'OTORGAR DIPLOMAS O MENCIONES EN MURALES ESCOLARES', TRUE)
ON CONFLICT (letra) DO UPDATE SET descripcion = EXCLUDED.descripcion, activo = TRUE;
