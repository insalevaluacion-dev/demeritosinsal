-- ================================================================
--  INSAL — Setup deméritos tables (run AFTER setup-schema.sql)
-- ================================================================

DO $$ BEGIN CREATE TYPE tipo_notif_enum   AS ENUM ('demerito','reconocimiento','redencion'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE causal_letra_enum AS ENUM ('A','B','C','D'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE opcion_letra_enum AS ENUM ('A','B','C'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE tipo_rc_enum      AS ENUM ('A','B'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS causales_demerito (
  id_causal SERIAL PRIMARY KEY,
  letra causal_letra_enum NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS opciones_redencion (
  id_opcion SERIAL PRIMARY KEY,
  letra opcion_letra_enum NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS tipos_reconocimiento (
  id_tipo SERIAL PRIMARY KEY,
  letra tipo_rc_enum NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS demeritos (
  id_demerito BIGSERIAL PRIMARY KEY,
  nie VARCHAR(20) NOT NULL,
  id_causal INTEGER NOT NULL REFERENCES causales_demerito(id_causal),
  causal_letra causal_letra_enum NOT NULL,
  id_maestro INTEGER NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  observacion TEXT,
  sexo_alumno CHAR(1) CHECK (sexo_alumno IN ('M','H')),
  redimido BOOLEAN NOT NULL DEFAULT FALSE,
  alumno_firmo BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_redencion TIMESTAMPTZ,
  id_mov_redencion BIGINT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS reconocimientos (
  id_reconocimiento BIGSERIAL PRIMARY KEY,
  nie VARCHAR(20) NOT NULL,
  id_tipo INTEGER NOT NULL REFERENCES tipos_reconocimiento(id_tipo),
  tipo_letra tipo_rc_enum NOT NULL,
  id_maestro INTEGER NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  observacion TEXT,
  sexo_alumno CHAR(1),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS movimientos_redencion (
  id_mov BIGSERIAL PRIMARY KEY,
  nie VARCHAR(20) NOT NULL,
  id_demerito BIGINT NOT NULL REFERENCES demeritos(id_demerito) ON DELETE CASCADE,
  id_opcion INTEGER NOT NULL REFERENCES opciones_redencion(id_opcion),
  opcion_letra opcion_letra_enum NOT NULL,
  id_maestro INTEGER NOT NULL,
  observacion TEXT,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS notificaciones (
  id_notif BIGSERIAL PRIMARY KEY,
  nie VARCHAR(20) NOT NULL,
  tipo tipo_notif_enum NOT NULL,
  nivel_alerta SMALLINT NOT NULL DEFAULT 0 CHECK (nivel_alerta BETWEEN 0 AND 3),
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK hacia principal (cuando existe dbInsal). Idempotente vía migrate-public-fks.mjs en Railway.

CREATE INDEX IF NOT EXISTS idx_dem_nie      ON demeritos(nie);
CREATE INDEX IF NOT EXISTS idx_dem_fecha    ON demeritos(fecha);
CREATE INDEX IF NOT EXISTS idx_dem_redimido ON demeritos(redimido);
CREATE INDEX IF NOT EXISTS idx_rc_nie       ON reconocimientos(nie);
CREATE INDEX IF NOT EXISTS idx_notif_nie    ON notificaciones(nie);
CREATE INDEX IF NOT EXISTS idx_notif_leida  ON notificaciones(leida);

SELECT '✅ Tablas de deméritos creadas.' AS status;
