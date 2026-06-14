

CREATE TABLE IF NOT EXISTS roles (
  rol_id   SERIAL PRIMARY KEY,
  nombre   VARCHAR(50) NOT NULL UNIQUE,
  activo   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS turno (
  turno_id SERIAL PRIMARY KEY,
  nombre   VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS materia (
  materia_id SERIAL PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS maestros (
  maestro_id     SERIAL PRIMARY KEY,
  nombre         VARCHAR(255) NOT NULL,
  email          VARCHAR(255) UNIQUE,
  contrasena     TEXT NOT NULL,
  materia_id     INTEGER REFERENCES materia(materia_id),
  turno_id       INTEGER REFERENCES turno(turno_id),
  rol_id         INTEGER NOT NULL REFERENCES roles(rol_id),
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grados (
  grado_id      SERIAL PRIMARY KEY,
  nivel         INTEGER NOT NULL,
  especialidad  VARCHAR(20) NOT NULL,
  seccion_letra VARCHAR(5) NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  anio_escolar  INTEGER NOT NULL DEFAULT 2026
);

CREATE TABLE IF NOT EXISTS seccion (
  seccion_id SERIAL PRIMARY KEY,
  grado_id   INTEGER NOT NULL REFERENCES grados(grado_id),
  turno_id   INTEGER NOT NULL REFERENCES turno(turno_id)
);

CREATE TABLE IF NOT EXISTS estudiantes (
  estudiante_id        SERIAL PRIMARY KEY,
  nombre_completo      VARCHAR(255) NOT NULL,
  nie                  VARCHAR(20) NOT NULL UNIQUE,
  fecha_de_nacimiento  DATE NOT NULL,
  telefono             VARCHAR(20) NOT NULL,
  direccion            TEXT NOT NULL,
  responsable          VARCHAR(255) NOT NULL,
  telefono_responsable VARCHAR(20) NOT NULL,
  grado_id             INTEGER REFERENCES grados(grado_id),
  seccion_id           INTEGER REFERENCES seccion(seccion_id),
  anio_escolar         INTEGER NOT NULL,
  estado               BOOLEAN NOT NULL DEFAULT TRUE,
  foto_url             TEXT
);

CREATE TABLE IF NOT EXISTS orientador (
  orientador_id SERIAL PRIMARY KEY,
  maestro_id    INTEGER NOT NULL REFERENCES maestros(maestro_id),
  grado_id      INTEGER REFERENCES grados(grado_id),
  anio_escolar  INTEGER NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT orientador_anio_check CHECK (anio_escolar >= 2000)
);

-- ── Deméritos schema tables ───────────────────────────────────────

DO $$ BEGIN CREATE TYPE tipo_notif_enum   AS ENUM ('demerito','reconocimiento','redencion'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE causal_letra_enum AS ENUM ('A','B','C','D'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE opcion_letra_enum AS ENUM ('A','B','C'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE tipo_rc_enum      AS ENUM ('A','B'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS causales_demerito (
  id_causal   SERIAL PRIMARY KEY,
  letra       causal_letra_enum NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS opciones_redencion (
  id_opcion   SERIAL PRIMARY KEY,
  letra       opcion_letra_enum NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS tipos_reconocimiento (
  id_tipo     SERIAL PRIMARY KEY,
  letra       tipo_rc_enum NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS demeritos (
  id_demerito      BIGSERIAL PRIMARY KEY,
  nie              VARCHAR(20) NOT NULL,
  id_causal        INTEGER NOT NULL REFERENCES causales_demerito(id_causal),
  causal_letra     causal_letra_enum NOT NULL,
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

CREATE TABLE IF NOT EXISTS reconocimientos (
  id_reconocimiento BIGSERIAL PRIMARY KEY,
  nie               VARCHAR(20) NOT NULL,
  id_tipo           INTEGER NOT NULL REFERENCES tipos_reconocimiento(id_tipo),
  tipo_letra        tipo_rc_enum NOT NULL,
  id_maestro        INTEGER NOT NULL,
  fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
  observacion       TEXT,
  sexo_alumno       CHAR(1),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimientos_redencion (
  id_mov       BIGSERIAL PRIMARY KEY,
  nie          VARCHAR(20) NOT NULL,
  id_demerito  BIGINT NOT NULL REFERENCES demeritos(id_demerito),
  id_opcion    INTEGER NOT NULL REFERENCES opciones_redencion(id_opcion),
  opcion_letra opcion_letra_enum NOT NULL,
  id_maestro   INTEGER NOT NULL,
  observacion  TEXT,
  fecha_hora   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id_notif     BIGSERIAL PRIMARY KEY,
  nie          VARCHAR(20) NOT NULL,
  tipo         tipo_notif_enum NOT NULL,
  nivel_alerta SMALLINT NOT NULL DEFAULT 0 CHECK (nivel_alerta BETWEEN 0 AND 3),
  titulo       VARCHAR(255) NOT NULL,
  mensaje      TEXT NOT NULL,
  leida        BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_hora   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_est_nie        ON estudiantes(nie);
CREATE INDEX IF NOT EXISTS idx_est_grado      ON estudiantes(grado_id);
CREATE INDEX IF NOT EXISTS idx_est_anio       ON estudiantes(anio_escolar);
CREATE INDEX IF NOT EXISTS idx_dem_nie        ON demeritos(nie);
CREATE INDEX IF NOT EXISTS idx_dem_fecha      ON demeritos(fecha);
CREATE INDEX IF NOT EXISTS idx_dem_redimido   ON demeritos(redimido);
CREATE INDEX IF NOT EXISTS idx_rc_nie         ON reconocimientos(nie);
CREATE INDEX IF NOT EXISTS idx_notif_nie      ON notificaciones(nie);
CREATE INDEX IF NOT EXISTS idx_notif_leida    ON notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notif_hora     ON notificaciones(fecha_hora DESC);

SELECT '✅ Schema creado exitosamente.' AS status;
