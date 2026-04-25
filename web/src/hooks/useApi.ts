import { useCallback } from 'react'

export function useApi(baseUrl: string, token: string) {
  const adminHeaders = useCallback((): HeadersInit => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, [token])

  const post = useCallback(async (path: string, body?: any) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: adminHeaders(),
      body: body ? JSON.stringify(body) : undefined
    })
    if (!res.ok) throw new Error(`API Error: ${res.status}`)
    return res.json()
  }, [baseUrl, adminHeaders])

  const get = useCallback(async (path: string) => {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: adminHeaders()
    })
    if (!res.ok) throw new Error(`API Error: ${res.status}`)
    return res.json()
  }, [baseUrl, adminHeaders])

  return { post, get }
}
