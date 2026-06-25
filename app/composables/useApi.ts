/** Unwrap the { data, error, meta } envelope; throw on error. */
async function unwrap<T>(promise: Promise<any>): Promise<T> {
  const res = await promise
  if (res?.error) throw new Error(res.error.message)
  return res.data as T
}

export function useApi() {
  const getSummary = (params: Record<string, any>) => unwrap<any>($fetch('/api/summary', { params }))
  const getPayments = (params: Record<string, any>) => unwrap<any[]>($fetch('/api/payments', { params }))
  const getExpenses = (params: Record<string, any>) => unwrap<any[]>($fetch('/api/expenses', { params }))
  const getProjects = () => unwrap<any[]>($fetch('/api/projects'))
  const patchAct = (id: string, body: Record<string, any>) =>
    unwrap<any>($fetch(`/api/acts/${id}`, { method: 'PATCH', body }))
  return { getSummary, getPayments, getExpenses, getProjects, patchAct }
}
