/** Standard API envelope: { data, error, meta }. */
export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return { data, error: null, meta: meta ?? null }
}
export function fail(message: string, code = 'ERROR') {
  return { data: null, error: { code, message }, meta: null }
}
