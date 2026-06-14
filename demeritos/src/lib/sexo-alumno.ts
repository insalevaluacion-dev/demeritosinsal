/** M = Mujer, H = Hombre */

const MASC_TERMINA_A = new Set([
  'JOSE', 'JESUS', 'MOISES', 'MATIAS', 'TOMAS', 'NICOLAS', 'ELIAS', 'LUCAS',
  'JOSHUA', 'NOAH', 'ISRAEL', 'DANIEL', 'SAMUEL', 'GABRIEL', 'RAFAEL', 'ISAIAS',
  'ESTEBAN', 'CRISTOBAL', 'ABDIAS', 'ANANIAS', 'EMANUEL', 'EMMANUEL',
])

const MASC_EXPLICIT = new Set([
  'ANGEL', 'MANUEL', 'RAUL', 'OSCAR', 'CARLOS', 'MIGUEL', 'PEDRO', 'PABLO', 'MARIO',
  'JORGE', 'LUIS', 'JUAN', 'DAVID', 'EDWIN', 'KEVIN', 'BRYAN', 'BRIAN', 'ALEX',
  'HENRY', 'EDUARDO', 'FERNANDO', 'ROBERTO', 'RICARDO', 'SERGIO', 'ANTONIO',
  'FRANCISCO', 'ALEXANDER', 'CHRISTOPHER', 'JONATHAN', 'WILLIAM', 'BENJAMIN',
  'SEBASTIAN', 'ADRIAN', 'WILBER', 'CALEB', 'VLADIMIR', 'REYNALDO', 'ISAAC',
  'CRISTIAN', 'GEOVANI', 'ROQUE', 'AMAURY', 'MARVIN', 'RENE', 'OVIDIO', 'RENÉ',
  'WILDER', 'ALFREDO', 'ALEJANDRO', 'ANDERSON', 'BRANDON', 'CHRISTIAN', 'DIEGO',
  'EDGAR', 'ELMER', 'ERICK', 'ERIC', 'FABIO', 'FELIPE', 'GERARDO', 'GILBERTO',
  'GUSTAVO', 'HECTOR', 'HÉCTOR', 'IVAN', 'IVÁN', 'JAIME', 'JAVIER', 'JESUS',
  'JOEL', 'JONATHAN', 'JORDAN', 'JOSUE', 'JOSUÉ', 'JULIO', 'KEVIN', 'LEONARDO',
  'MARCO', 'MARTIN', 'MARTÍN', 'MAURICIO', 'NESTOR', 'NÉSTOR', 'OMAR', 'ORLANDO',
  'PATRICIO', 'RAFAEL', 'RAMON', 'RAMÓN', 'RODRIGO', 'RUBEN', 'RUBÉN', 'SALVADOR',
  'VICTOR', 'VÍCTOR', 'WALTER', 'WILFREDO', 'WILSON', 'YAHIR', 'YAIR',
])

const FEM_EXPLICIT = new Set([
  'KATHERINE', 'KATHY', 'CATHERINE', 'ALEXANDRA', 'VALERIA', 'VANESSA', 'ABIGAIL',
  'SELENA', 'STEPHANY', 'STEFANY', 'STEFANI', 'STEFANIE', 'ASHLEY', 'SARAI', 'SARAHI',
  'LIZBETH', 'LIZBET', 'YANIRA', 'ARELI', 'MELANIE', 'MELANY', 'MARIA', 'MARÍA',
  'MARIANA', 'MICHELLE', 'NICOLE', 'PATRICIA', 'GLORIA', 'SANDRA', 'ANDREA', 'DIANA',
  'LAURA', 'PAOLA', 'KARLA', 'KAREN', 'KARIN', 'INGRID', 'MARISOL', 'BETHZY', 'BETZI',
  'KIMBERLY', 'EMILY', 'NATALY', 'NATHALY', 'NATALIA', 'NATHALIA', 'JOSSELYN', 'Joselyn',
  'JENNIFER', 'JENIFER', 'JESSICA', 'YESSICA', 'YESENIA', 'XIOMARA', 'XIOMARA', 'ROCIO',
  'ROCÍO', 'SOFIA', 'SOFÍA', 'DANIELA', 'GABRIELA', 'FERNANDA', 'ALEJANDRA', 'ADRIANA',
  'ANA', 'CLAUDIA', 'CRISTINA', 'ELIZABETH', 'ELIZABET', 'ESMERALDA', 'FABIOLA', 'GRACIELA',
  'GUADALUPE', 'HELEN', 'HELENA', 'IRMA', 'ISABEL', 'JIMENA', 'JULISSA', 'KARINA',
  'LILIANA', 'LILIAN', 'LORENA', 'LUCIA', 'LUCÍA', 'MARGARITA', 'MARTA', 'MAYRA',
  'MIRNA', 'NANCY', 'NORMA', 'OLGA', 'RAQUEL', 'REBECA', 'RUTH', 'SILVIA', 'SUSANA',
  'TERESA', 'VERONICA', 'VERÓNICA', 'VIVIANA', 'WENDY', 'YOLANDA', 'ZOE', 'ZOÉ',
  'ALISSON', 'ALISON', 'ALLISON', 'STEPHANIE', 'STEFANIA', 'VALERIE', 'VALERY',
  'BRENDA', 'CARMEN', 'CECILIA', 'CELINA', 'DEBORA', 'DÉBORA', 'ELENA', 'EVELYN',
  'FATIMA', 'FÁTIMA', 'GLADYS', 'GLENDA', 'GISELA', 'GISELLE', 'GLORIA', 'HAZEL',
  'IRENE', 'JANET', 'JANETH', 'JOHANA', 'JOHANNA', 'JOSEFINA', 'JUDITH', 'JULIA',
  'KAROL', 'CAROL', 'CAROLINA', 'KATIA', 'KATYA', 'LIDIA', 'LIGIA', 'LINDA',
  'LISSETH', 'LISSETTE', 'LIZETH', 'LIZBETH', 'LUZ', 'MADELIN', 'MADELYN', 'MAYRA',
  'MELISSA', 'MELISA', 'MILAGRO', 'MILAGROS', 'MIRIAM', 'MONICA', 'MÓNICA', 'NAYELI',
  'NAYELY', 'NELLY', 'NOEMI', 'NOEMÍ', 'OLIVIA', 'PAMELA', 'PAULA', 'REINA',
  'ROSA', 'ROSARIO', 'SARA', 'SARAH', 'SHIRLEY', 'SONIA', 'SORAYA', 'TANIA',
  'TATIANA', 'VANESSA', 'VICTORIA', 'VILMA', 'XIMENA', 'YASMIN', 'YASMÍN', 'YESSENIA',
])

function normalizeNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}


export function inferirSexoDesdeNombre(nombreCompleto: string): 'M' | 'H' {
  const tokens = normalizeNombre(nombreCompleto).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return 'H'

  const nombresPila = tokens.length >= 3 ? tokens.slice(2) : [tokens[tokens.length - 1]]

  let fem = 0
  let masc = 0
  for (const nombre of nombresPila) {
    if (FEM_EXPLICIT.has(nombre)) fem++
    else if (MASC_EXPLICIT.has(nombre) || MASC_TERMINA_A.has(nombre)) masc++
    else if (nombre.endsWith('A')) fem++
    else masc++
  }

  return fem >= masc ? 'M' : 'H'
}

/** Resuelve sexo: primero registro en DB, si no hay, inferencia por nombre. */
export function resolverSexoAlumno(
  sexoRegistro: string | null | undefined,
  nombreCompleto: string
): 'M' | 'H' {
  if (sexoRegistro === 'M' || sexoRegistro === 'H') return sexoRegistro
  return inferirSexoDesdeNombre(nombreCompleto)
}
