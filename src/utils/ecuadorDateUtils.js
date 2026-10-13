// crm-charbela/mcp-server/src/utils/ecuadorDateUtils.js
// Utilidades de Fechas y Zona Horaria para Ecuador (America/Guayaquil - UTC-5)
// Previene desajustes de fecha provocados por servidores en UTC (Cloud Run, Docker)

const ECUADOR_TZ = "America/Guayaquil";

/**
 * Retorna la fecha actual en hora continental de Ecuador en formato 'YYYY-MM-DD'.
 */
export function getEcuadorToday() {
  const now = new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ECUADOR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

/**
 * Normaliza cualquier entrada de fecha (string, timestamp, Date) a 'YYYY-MM-DD' en Ecuador.
 * Soporta formatos: 'YYYY-MM-DD', 'DD/MM/YYYY', 'DD-MM-YYYY', ISO Strings y Firestore Timestamps.
 */
export function normalizeEcuadorDate(input) {
  if (!input) return getEcuadorToday();

  // 1. Si es Firestore Timestamp
  if (input.toDate && typeof input.toDate === "function") {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: ECUADOR_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(input.toDate());
  }

  // 2. Si tiene seconds (objeto Timestamp serializado)
  if (input.seconds && typeof input.seconds === "number") {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: ECUADOR_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date(input.seconds * 1000));
  }

  // 3. Si es objeto Date
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return getEcuadorToday();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: ECUADOR_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(input);
  }

  const str = String(input).trim();

  // 4. Formato estándar 'YYYY-MM-DD' (o ISO 'YYYY-MM-DDTHH:mm:ss...')
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  // 5. Formato latino 'DD/MM/YYYY' o 'DD-MM-YYYY'
  const latinMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (latinMatch) {
    const dia = latinMatch[1].padStart(2, "0");
    const mes = latinMatch[2].padStart(2, "0");
    const anio = latinMatch[3];
    return `${anio}-${mes}-${dia}`;
  }

  // 6. Número de serie de Excel (días desde 1900)
  const num = parseFloat(str);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const dateFromExcel = new Date(excelEpoch.getTime() + num * 86400000);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: ECUADOR_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(dateFromExcel);
  }

  // Fallback con Date.parse
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: ECUADOR_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(parsed);
    }
  } catch (_) {}

  return getEcuadorToday();
}

/**
 * Obtiene el mes contable 'YYYY-MM' exacto para un registro en Ecuador.
 */
export function getEcuadorMesContable(input) {
  const dateStr = normalizeEcuadorDate(input);
  return dateStr.substring(0, 7);
}

/**
 * Retorna la diferencia en días entre dos fechas 'YYYY-MM-DD'.
 */
export function diffDays(dateA, dateB) {
  const normA = normalizeEcuadorDate(dateA);
  const normB = normalizeEcuadorDate(dateB);
  const [y1, m1, d1] = normA.split("-").map(Number);
  const [y2, m2, d2] = normB.split("-").map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.abs(Math.round((t1 - t2) / 86400000));
}
