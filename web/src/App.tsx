import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Alert,
} from '@mui/material'
import type { Session, ResultEntry, WsEvent, StateResponse, ResultsResponse } from './types'
import { buildTheme } from './theme/theme'
import { AuthGate } from './components/common/AuthGate'
import { PublicPage } from './pages/PublicPage'
import { AdminPage } from './pages/AdminPage'
import { JudgePage } from './pages/JudgePage'
import { useTimer } from './hooks/useTimer'
import { useWebSocket } from './hooks/useWebSocket'
import { useApi } from './hooks/useApi'

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
const ADMIN_TOKEN_KEY = 'robogames-admin-token'

export default function App() {
  const role = useMemo(() => {
    const p = window.location.pathname
    return p.startsWith('/judge') ? 'judge' : p.startsWith('/public') ? 'public' : 'admin'
  }, [])

  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY) || '')
  const [session, setSession] = useState<Session | null>(null)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [serverOffset, setServerOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedRound, setSelectedRound] = useState(1)
  const [controlView, setControlView] = useState(false)

  const currentSessionRef = useRef<Session | null>(null)
  useEffect(() => { currentSessionRef.current = session }, [session])

  const { get, post } = useApi(API_BASE, token)
  const { elapsedMs, chargingMs } = useTimer(session, serverOffset)

  const fetchResults = useCallback(async () => {
    try { const res: ResultsResponse = await get('/results'); setResults(res.results) } catch {}
  }, [get])

  const startTimer = useCallback(async () => {
    if (!selectedTeam) return
    try {
      const res = await post('/start', { team: selectedTeam, round: selectedRound, source: 'web' })
      setSession(res)
    } catch { setError('Failed to start') }
  }, [selectedTeam, selectedRound, post])

  const stopTimer = useCallback(async () => {
    if (!currentSessionRef.current || currentSessionRef.current.status !== 'running') return
    try {
      const res = await post('/stop', { stopTime: Date.now() + serverOffset, source: 'web' })
      setSession(res)
    } catch { setError('Failed to stop') }
  }, [serverOffset, post])

  const startCharging = useCallback(async () => {
    try {
      const res = await post('/charge/start')
      setSession(res)
    } catch { }
  }, [post])

  const stopCharging = useCallback(async () => {
    try {
      const res = await post('/charge/stop', { chargeStopTime: Date.now() + serverOffset })
      setSession(res)
    } catch { }
  }, [serverOffset, post])

  const resumeTimer = useCallback(async () => {
    try {
      const res = await post('/resume')
      setSession(res)
    } catch { }
  }, [post])

  const resetTimer = useCallback(async () => {
    try {
      await post('/reset')
      setSession(null); void fetchResults()
    } catch { }
  }, [post, fetchResults])

  const finishTimer = useCallback(async () => {
    try {
      await post('/finish')
      setSession(null); void fetchResults()
    } catch { }
  }, [post, fetchResults])

  const handleContinue = useCallback(async () => {
    if (!selectedTeam) return
    try {
      await post('/select', { team: selectedTeam, round: selectedRound })
      setControlView(true)
    } catch { setError('Selection failed') }
  }, [selectedTeam, selectedRound, post])

  const sync = useCallback(async () => {
    try {
      const start = Date.now(); const res: StateResponse = await get('/state')
      setServerOffset(res.serverTime - (start + Date.now()) / 2)
      setSession(res.session); if (res.session) {
        setControlView(true); setSelectedTeam(res.session.team); setSelectedRound(res.session.round)
      }
    } catch { if (token) setToken('') }
  }, [get, token])

  const onWsMessage = useCallback((data: WsEvent) => {
    if (data.event === 'SELECT') {
      if (role !== 'admin') { setSelectedTeam(data.team); setSelectedRound(data.round) }
    } else if (data.event === 'START') { 
      setSession({ team: data.team, round: data.round, startTime: data.startTime, status: 'running' })
      setSelectedTeam(data.team); setSelectedRound(data.round)
      void fetchResults() 
    }
    else if (data.event === 'STOP') { setSession(prev => prev ? { ...prev, status: 'paused', endTime: data.endTime } : null); fetchResults() }
    else if (data.event === 'RESET') { setSession(null); fetchResults() }
    else if (data.event === 'RESULTS_UPDATED') fetchResults()
    else if (data.event === 'CHARGE_START') setSession(prev => prev ? { ...prev, chargeStartTime: data.chargeStartTime, chargeStatus: 'running' } : null)
    else if (data.event === 'CHARGE_STOP') setSession(prev => prev ? { ...prev, chargeEndTime: data.chargeEndTime, chargeStatus: 'finished' } : null)
  }, [role, fetchResults])

  useWebSocket(WS_URL, onWsMessage)
  useEffect(() => { if (token) { sync(); fetchResults() } }, [token, sync, fetchResults])

  const handleLogin = async (pw: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
      const data = await res.json()
      if (res.ok && data.token) { setToken(data.token); localStorage.setItem(ADMIN_TOKEN_KEY, data.token) } else setError('Invalid password')
    } catch { setError('Auth failed') }
  }

  useEffect(() => {
    if (role !== 'admin' || !controlView) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space') { 
        e.preventDefault()
        const s = currentSessionRef.current
        if (s?.status === 'running') void stopTimer()
        else if (s?.status === 'paused' || s?.status === 'finished') void resumeTimer()
        else void startTimer()
      } else if (e.key === 'Shift') { 
        const s = currentSessionRef.current
        if (s?.status === 'running') {
          if (s.chargeStatus === 'running') void stopCharging()
          else void startCharging()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [role, controlView, startTimer, stopTimer, startCharging, stopCharging, resumeTimer])

  if (!token) return <ThemeProvider theme={buildTheme(role)}><CssBaseline /><AuthGate onLogin={handleLogin} error={error} /></ThemeProvider>

  const commonProps = { session, results, elapsedMs, chargingMs, selectedTeam, selectedRound }
  return (
    <ThemeProvider theme={buildTheme(role)}>
      <CssBaseline />
      {error && (
        <Box sx={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: '100%', maxWidth: 400 }}>
          <Alert severity="error" variant="filled" onClose={() => setError(null)}>{error}</Alert>
        </Box>
      )}
      {role === 'public' ? <PublicPage {...commonProps} /> :
       role === 'judge' ? <JudgePage {...commonProps} /> :
       <AdminPage {...commonProps} 
         isAdminControlView={controlView}
         onTeamChange={setSelectedTeam} onRoundChange={setSelectedRound} onContinue={handleContinue} onBack={() => setControlView(false)}
         onStart={startTimer}
         onStop={stopTimer}
         onChargeStart={startCharging}
         onChargeStop={stopCharging}
         onResume={resumeTimer}
         onReset={resetTimer}
         onFinish={finishTimer}
         onHide={(id) => post('/hide-result', { id }).then(fetchResults)}
       />}
    </ThemeProvider>
  )
}
