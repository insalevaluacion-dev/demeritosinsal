/** Esquema app (Railway: demeritos; local legacy: public). Ver DB_SCHEMA en .env.local */
function parseSchemaName(raw: string | undefined): string {
  const name = (raw || 'demeritos').trim()
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`DB_SCHEMA inválido: ${name}`)
  }
  return name
}

export const APP_SCHEMA = parseSchemaName(process.env.DB_SCHEMA)

export function qualify(table: string): string {
  return `${APP_SCHEMA}.${table}`
}

export function pgSearchPathOption(): string {
  return `-c search_path=${APP_SCHEMA},principal,public`
}
