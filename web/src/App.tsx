import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  CssBaseline,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material'

type SessionStatus = 'running' | 'finished'

type Session = {
  id?: string
  team: string
  startTime: number
  endTime?: number
  status: SessionStatus
  chargeStartTime?: number
  chargeEndTime?: number
  chargeStatus?: 'running' | 'finished'
}

type StateResponse = {
  serverTime: number
  session: Session | null
  authRequired?: boolean
  error?: string
}

type PendingStop = {
  id: string
  stopTime: number
  source: string
  createdAt: number
}

type ResultEntry = {
  team: string
  startTime: number
  endTime: number
  elapsedMs: number
}

type ResultsResponse = {
  results: ResultEntry[]
  error?: string
}

type WsEvent =
  | {
      event: 'START'
      team: string
      startTime: number
    }
  | {
      event: 'STOP'
      team: string
      endTime: number
      requestId?: string
    }
  | {
      event: 'CHARGE_START'
      team: string
      chargeStartTime: number
    }
  | {
      event: 'CHARGE_STOP'
      team: string
      chargeEndTime: number
    }

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''
const WS_BASE = (import.meta.env.VITE_WS_BASE as string | undefined)?.replace(/\/$/, '')
const STATIC_ADMIN_TOKEN = (import.meta.env.VITE_ADMIN_KEY as string | undefined)?.trim() ?? ''
const ADMIN_TOKEN_STORAGE_KEY = 'robogames-admin-token'

const STOP_DB_NAME = 'robogames-timer-db'
const STOP_STORE = 'stop_queue'

function apiUrl(path: string): string {
  return `${API_BASE}${path}`
}

function wsUrl(path: string): string {
  if (WS_BASE) {
    return `${WS_BASE}${path}`
  }

  if (API_BASE) {
    const wsBase = API_BASE.replace(/^http/, 'ws')
    return `${wsBase}${path}`
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${path}`
}

function formatTime(ms: number): string {
  const safe = Math.max(0, ms)
  const totalSeconds = Math.floor(safe / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const deciseconds = Math.floor((safe % 1000) / 100)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${deciseconds}`
}

function currentRole(): 'admin' | 'judge' | 'public' {
  const path = window.location.pathname
  if (path.startsWith('/judge')) return 'judge'
  if (path.startsWith('/public')) return 'public'
  return 'admin'
}

function buildTheme(role: 'admin' | 'judge' | 'public') {
  const palette =
    role === 'public'
      ? { mode: 'dark' as const, primary: { main: '#2ec4b6' }, background: { default: '#06131f', paper: '#0a1c2f' } }
      : role === 'judge'
        ? { mode: 'light' as const, primary: { main: '#0b6e4f' }, background: { default: '#f3f8f5', paper: '#ffffff' } }
        : { mode: 'light' as const, primary: { main: '#0f4c81' }, background: { default: '#eef3f9', paper: '#ffffff' } }

  return createTheme({
    typography: {
      fontFamily: '"DM Sans", "Segoe UI", sans-serif',
      h1: { fontWeight: 700 },
    },
    palette,
  })
}

function adminHeaders(token: string): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

function openStopDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(STOP_DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STOP_STORE)) {
        db.createObjectStore(STOP_STORE, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function putPendingStop(stop: PendingStop): Promise<void> {
  const db = await openStopDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STOP_STORE, 'readwrite')
    tx.objectStore(STOP_STORE).put(stop)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function getPendingStops(): Promise<PendingStop[]> {
  const db = await openStopDb()
  const result = await new Promise<PendingStop[]>((resolve, reject) => {
    const tx = db.transaction(STOP_STORE, 'readonly')
    const req = tx.objectStore(STOP_STORE).getAll()
    req.onsuccess = () => resolve((req.result as PendingStop[]) ?? [])
    req.onerror = () => reject(req.error)
  })
  db.close()

  result.sort((a, b) => a.createdAt - b.createdAt)
  return result
}

async function deletePendingStop(id: string): Promise<void> {
  const db = await openStopDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STOP_STORE, 'readwrite')
    tx.objectStore(STOP_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

function App() {
  const role = useMemo(() => currentRole(), [])
  const theme = useMemo(() => buildTheme(role), [role])

  const [teamInput, setTeamInput] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [chargingElapsedMs, setChargingElapsedMs] = useState(0)
  const [serverOffset, setServerOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [authRequired, setAuthRequired] = useState(false)
  const [adminToken, setAdminToken] = useState<string>(() => {
    const stored = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)
    return stored?.trim() || STATIC_ADMIN_TOKEN
  })
  const [passwordInput, setPasswordInput] = useState('')

  const currentSessionRef = useRef<Session | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const retryInFlightRef = useRef(false)

  const syncState = async () => {
    const requestStart = Date.now()
    try {
      const response = await fetch(apiUrl('/state'))
      const data = (await response.json()) as StateResponse
      const requestEnd = Date.now()
      const offset = (data.serverTime ?? Date.now()) - (requestStart + requestEnd) / 2
      setServerOffset(offset)
      setAuthRequired(Boolean(data.authRequired))

      if (data.error) {
        setError(data.error)
      } else {
        setError(null)
      }

      setSession(data.session ?? null)
    } catch {
      setError('Unable to reach backend. Make sure Go server is running.')
    }
  }

  useEffect(() => {
    currentSessionRef.current = session
  }, [session])

  const fetchResults = async () => {
    try {
      const response = await fetch(apiUrl('/results'))
      const data = (await response.json()) as ResultsResponse
      if (!response.ok) {
        setError(data.error ?? 'Failed to load results')
        return
      }
      setResults(data.results ?? [])
    } catch {
      setError('Failed to load judge results.')
    }
  }

  useEffect(() => {
    void syncState()
    if (role === 'judge') {
      void fetchResults()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setElapsedMs(0)
      return
    }

    if (session.status === 'finished') {
      setElapsedMs((session.endTime ?? session.startTime) - session.startTime)
      return
    }

    const update = () => {
      setElapsedMs(Date.now() + serverOffset - session.startTime)
    }

    update()
    const timerId = window.setInterval(update, 100)
    return () => window.clearInterval(timerId)
  }, [serverOffset, session])

  useEffect(() => {
    if (!session || !session.chargeStartTime) {
      setChargingElapsedMs(0)
      return
    }

    if (session.chargeStatus === 'finished') {
      setChargingElapsedMs((session.chargeEndTime ?? session.chargeStartTime) - session.chargeStartTime)
      return
    }

    if (session.chargeStatus !== 'running') {
      setChargingElapsedMs(0)
      return
    }

    const update = () => {
      setChargingElapsedMs(Date.now() + serverOffset - session.chargeStartTime!)
    }

    update()
    const timerId = window.setInterval(update, 100)
    return () => window.clearInterval(timerId)
  }, [serverOffset, session])

  const sendStop = async (item: PendingStop): Promise<boolean> => {
    try {
      const response = await fetch(apiUrl('/stop'), {
        method: 'POST',
        headers: adminHeaders(adminToken),
        body: JSON.stringify({
          stopTime: item.stopTime,
          requestId: item.id,
          source: item.source,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        if (response.status === 401) {
          setAdminToken('')
          window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
        }
        setError(payload.error ?? 'Stop request failed')
        return false
      }

      const next = (await response.json()) as Session
      setSession(next)
      setError(null)
      await deletePendingStop(item.id)
      setPendingCount((prev) => Math.max(0, prev - 1))
      return true
    } catch {
      setError('Stop request failed, retrying...')
      return false
    }
  }

  const flushPendingStops = async () => {
    if (retryInFlightRef.current) {
      return
    }

    retryInFlightRef.current = true
    try {
      const pending = await getPendingStops()
      setPendingCount(pending.length)
      for (const item of pending) {
        await sendStop(item)
      }
    } finally {
      retryInFlightRef.current = false
    }
  }

  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null
    let closedByCleanup = false

    const connect = () => {
      ws = new WebSocket(wsUrl('/ws'))
      wsRef.current = ws

      ws.onopen = () => {
        setWsConnected(true)
        void syncState()
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data) as WsEvent

        if (data.event === 'START') {
          setSession({
            team: data.team,
            startTime: data.startTime,
            status: 'running',
          })
          setError(null)
          if (role === 'judge') {
            void fetchResults()
          }
          return
        }

        if (data.event === 'STOP') {
          setSession((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              status: 'finished',
              endTime: data.endTime,
            }
          })
          setError(null)
          if (role === 'judge') {
            void fetchResults()
          }

          if (data.requestId) {
            void deletePendingStop(data.requestId).then(() => {
              setPendingCount((prev) => Math.max(0, prev - 1))
            })
          }
        }

        if (data.event === 'CHARGE_START') {
          setSession((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              chargeStartTime: data.chargeStartTime,
              chargeEndTime: undefined,
              chargeStatus: 'running',
            }
          })
          return
        }

        if (data.event === 'CHARGE_STOP') {
          setSession((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              chargeEndTime: data.chargeEndTime,
              chargeStatus: 'finished',
            }
          })
        }
      }

      ws.onerror = () => {
        setError('WebSocket connection problem detected. Retrying...')
      }

      ws.onclose = () => {
        setWsConnected(false)
        if (!closedByCleanup) {
          void syncState()
          reconnectTimer = window.setTimeout(connect, 2000)
        }
      }
    }

    connect()

    return () => {
      closedByCleanup = true
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
      }
      wsRef.current = null
      ws?.close()
    }
  }, [])

  useEffect(() => {
    if (role !== 'admin') {
      return
    }
    if (authRequired && !adminToken) {
      return
    }

    void flushPendingStops()
    const retry = window.setInterval(() => {
      void flushPendingStops()
    }, 2000)

    return () => window.clearInterval(retry)
  }, [role, authRequired, adminToken])

  useEffect(() => {
    if (role !== 'judge') {
      return
    }
    const poll = window.setInterval(() => {
      void fetchResults()
    }, 5000)
    return () => window.clearInterval(poll)
  }, [role])

  const startTimer = async () => {
    if (!teamInput.trim()) {
      setError('Enter a team name first.')
      return
    }

    try {
      const response = await fetch(apiUrl('/start'), {
        method: 'POST',
        headers: adminHeaders(adminToken),
        body: JSON.stringify({
          team: teamInput.trim(),
          source: 'admin-web',
        }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        if (response.status === 401) {
          setAdminToken('')
          window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
        }
        setError(payload.error ?? 'Failed to start timer')
        return
      }

      const next = (await response.json()) as Session
      setSession(next)
      setTeamInput('')
      setError(null)
    } catch {
      setError('Cannot reach backend when starting timer.')
    }
  }

  const stopTimer = async () => {
    const active = currentSessionRef.current
    if (!active || active.status !== 'running') {
      setError('No running session to stop.')
      return
    }

    const item: PendingStop = {
      id: window.crypto.randomUUID(),
      stopTime: Math.round(Date.now() + serverOffset),
      source: 'admin-web',
      createdAt: Date.now(),
    }

    await putPendingStop(item)
    setPendingCount((prev) => prev + 1)

    // Best-effort WS stop signal (hub also accepts HTTP stop + indexedDB retries).
    try {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'STOP',
            stopTime: item.stopTime,
            requestId: item.id,
            source: item.source,
            adminKey: adminToken,
          }),
        )
      }
    } catch {
      // Ignore WS send issues; HTTP retry loop handles reliability.
    }

    await sendStop(item)
  }

  const loginAdmin = async () => {
    if (!passwordInput.trim()) {
      setError('Enter admin password.')
      return
    }

    try {
      const response = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      })
      const payload = (await response.json()) as { token?: string; error?: string; authRequired?: boolean }
      if (!response.ok) {
        setError(payload.error ?? 'Login failed')
        return
      }

      const token = payload.token?.trim() ?? ''
      setAuthRequired(Boolean(payload.authRequired))
      setAdminToken(token)
      if (token) {
        window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token)
      } else {
        window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
      }
      setPasswordInput('')
      setError(null)
    } catch {
      setError('Cannot reach backend for login.')
    }
  }

  const startCharging = async () => {
    const active = currentSessionRef.current
    if (!active || active.status !== 'running') {
      setError('Start main timer first.')
      return
    }

    try {
      const response = await fetch(apiUrl('/charge/start'), {
        method: 'POST',
        headers: adminHeaders(adminToken),
        body: JSON.stringify({ source: 'admin-web' }),
      })

      const payload = (await response.json()) as Session | { error?: string }
      if (!response.ok) {
        setError((payload as { error?: string }).error ?? 'Failed to start charging timer')
        return
      }

      setSession(payload as Session)
      setError(null)
    } catch {
      setError('Cannot reach backend when starting charging timer.')
    }
  }

  const stopCharging = async () => {
    const active = currentSessionRef.current
    if (!active || active.chargeStatus !== 'running') {
      setError('No running charging timer.')
      return
    }

    try {
      const response = await fetch(apiUrl('/charge/stop'), {
        method: 'POST',
        headers: adminHeaders(adminToken),
        body: JSON.stringify({
          chargeStopTime: Math.round(Date.now() + serverOffset),
          source: 'admin-web',
        }),
      })

      const payload = (await response.json()) as Session | { error?: string }
      if (!response.ok) {
        setError((payload as { error?: string }).error ?? 'Failed to stop charging timer')
        return
      }

      setSession(payload as Session)
      setError(null)
    } catch {
      setError('Cannot reach backend when stopping charging timer.')
    }
  }

  const statusChip = session?.status === 'running' ? 'RUNNING' : session?.status === 'finished' ? 'FINISHED' : 'IDLE'

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100dvh',
          background: role === 'public' ? 'radial-gradient(circle at top, #10345a 0%, #06131f 60%)' : undefined,
          py: role === 'public' ? 2 : 5,
        }}
      >
        <Container maxWidth={role === 'public' ? false : 'md'}>
          <Paper
            elevation={role === 'public' ? 0 : 4}
            sx={{
              p: role === 'public' ? 4 : 5,
              borderRadius: role === 'public' ? 0 : 3,
              textAlign: 'center',
              backgroundColor: role === 'public' ? 'transparent' : 'background.paper',
            }}
          >
            <Stack spacing={3} sx={{ alignItems: 'center' }}>
              <Typography variant={role === 'public' ? 'h2' : 'h4'} sx={{ letterSpacing: 1.2 }}>
                {role === 'admin' ? 'Admin Control' : role === 'judge' ? 'Judge Dashboard' : 'Public Display'}
              </Typography>

              <Stack direction="row" spacing={1}>
                <Chip label={statusChip} color={session?.status === 'running' ? 'success' : session?.status === 'finished' ? 'error' : 'default'} />
                <Chip label={wsConnected ? 'WS Connected' : 'WS Reconnecting'} color={wsConnected ? 'primary' : 'warning'} variant="outlined" />
                {role === 'admin' && pendingCount > 0 && <Chip label={`Pending STOP: ${pendingCount}`} color="warning" variant="outlined" />}
              </Stack>

              <Typography
                variant={role === 'public' ? 'h1' : 'h2'}
                sx={{
                  fontFamily: '"Roboto Mono", monospace',
                  fontSize: role === 'public' ? { xs: '4rem', sm: '8rem', md: '12rem' } : { xs: '3rem', sm: '5rem' },
                  lineHeight: 1,
                  color: session?.status === 'finished' ? 'error.main' : session?.status === 'running' ? 'success.main' : 'text.primary',
                }}
              >
                {formatTime(elapsedMs)}
              </Typography>

              <Typography variant={role === 'public' ? 'h4' : 'h6'} color="text.secondary">
                {session ? `Team: ${session.team}` : 'Waiting for session...'}
              </Typography>

              <Paper
                variant="outlined"
                sx={{
                  width: '100%',
                  maxWidth: 360,
                  p: 1.5,
                  textAlign: 'left',
                  alignSelf: role === 'public' ? 'flex-end' : 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Charging Timer
                </Typography>
                <Typography sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '1.4rem', lineHeight: 1.2 }}>
                  {formatTime(chargingElapsedMs)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {session?.chargeStatus === 'running'
                    ? 'RUNNING'
                    : session?.chargeStatus === 'finished'
                      ? 'FINISHED'
                      : 'IDLE'}
                </Typography>
              </Paper>

              {role === 'admin' && authRequired && !adminToken && (
                <Stack spacing={2} sx={{ width: '100%', maxWidth: 460 }}>
                  <Typography variant="h6">Admin Login</Typography>
                  <TextField
                    value={passwordInput}
                    onChange={(event) => setPasswordInput(event.target.value)}
                    label="Password"
                    type="password"
                    fullWidth
                    autoComplete="current-password"
                  />
                  <Button variant="contained" size="large" onClick={loginAdmin}>
                    Login
                  </Button>
                </Stack>
              )}

              {role === 'admin' && (!authRequired || !!adminToken) && (
                <Stack spacing={2} sx={{ width: '100%', maxWidth: 460 }}>
                  <TextField
                    value={teamInput}
                    onChange={(event) => setTeamInput(event.target.value)}
                    label="Team Name"
                    fullWidth
                    autoComplete="off"
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button variant="contained" size="large" onClick={startTimer} disabled={session?.status === 'running'}>
                      Start Timer
                    </Button>
                    <Button variant="contained" color="error" size="large" onClick={stopTimer} disabled={session?.status !== 'running'}>
                      Stop Timer
                    </Button>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={startCharging}
                      disabled={session?.status !== 'running' || session?.chargeStatus === 'running'}
                    >
                      Start Charging
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      size="large"
                      onClick={stopCharging}
                      disabled={session?.chargeStatus !== 'running'}
                    >
                      Stop Charging
                    </Button>
                  </Stack>
                </Stack>
              )}

              {role === 'judge' && (
                <TableContainer component={Paper} variant="outlined" sx={{ width: '100%', maxWidth: 760 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Team</TableCell>
                        <TableCell align="right">Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            No finished teams yet
                          </TableCell>
                        </TableRow>
                      )}
                      {results.map((result, index) => (
                        <TableRow key={`${result.team}-${result.startTime}-${index}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{result.team}</TableCell>
                          <TableCell align="right" sx={{ fontFamily: '"Roboto Mono", monospace' }}>
                            {formatTime(result.elapsedMs)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {error && (
                <Alert severity="warning" sx={{ width: '100%', maxWidth: 720 }}>
                  {error}
                </Alert>
              )}
            </Stack>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App
