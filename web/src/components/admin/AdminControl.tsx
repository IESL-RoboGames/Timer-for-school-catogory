import { Stack, Button, Typography } from '@mui/material'
import type { Session } from '../../types'

interface AdminControlProps {
  session: Session | null
  onStart: () => void
  onStop: () => void
  onChargeStart: () => void
  onChargeStop: () => void
  onResume: () => void
  onReset: () => void
  onFinish: () => void
}

export function AdminControl({
  session,
  onStart,
  onStop,
  onChargeStart,
  onChargeStop,
  onResume,
  onReset,
  onFinish
}: AdminControlProps) {
  const isRunning = session?.status === 'running'
  const isPaused = session?.status === 'paused'
  const isFinished = session?.status === 'finished'
  const isCharging = session?.chargeStatus === 'running'

  return (
    <Stack spacing={4} sx={{ width: '100%', maxWidth: 400 }}>
      {/* Main Timer Row */}
      <Stack direction="row" spacing={2}>
        {!isRunning && !isPaused && !isFinished ? (
          <Button fullWidth variant="contained" sx={{ height: 100, fontSize: '1.8rem' }} onClick={onStart}>START</Button>
        ) : isRunning ? (
          <Button fullWidth variant="contained" color="error" sx={{ height: 100, fontSize: '1.8rem' }} onClick={onStop}>PAUSE</Button>
        ) : (
          <Button fullWidth variant="contained" color="warning" sx={{ height: 100, fontSize: '1.8rem' }} onClick={onResume}>RESUME</Button>
        )}
      </Stack>

      {/* Save Row (Visible only when paused/finished) */}
      {(isPaused || isFinished) && (
        <Button fullWidth variant="contained" color="success" size="large" sx={{ height: 60, fontSize: '1.2rem' }} onClick={onFinish}>
          SAVE & FINISH
        </Button>
      )}

      {/* Charging Timer Row */}
      <Stack direction="row" spacing={2}>
        {!isCharging ? (
          <Button fullWidth variant="outlined" size="large" sx={{ height: 80 }} onClick={onChargeStart} disabled={!isRunning}>CHARGE START</Button>
        ) : (
          <Button fullWidth variant="contained" color="warning" size="large" sx={{ height: 80 }} onClick={onChargeStop}>CHARGE STOP</Button>
        )}
      </Stack>

      {/* Reset Row */}
      <Button fullWidth variant="outlined" color="error" onClick={onReset}>RESET TO 0 (NO SAVE)</Button>

      <Stack spacing={1} sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary" align="center" sx={{ fontSize: '0.9rem' }}>
          Shortcuts: <b>Space</b> (Start/Pause) | <b>Shift</b> (Charge)
        </Typography>
      </Stack>
    </Stack>
  )
}
