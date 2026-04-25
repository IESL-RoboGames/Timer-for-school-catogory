import { Stack, Button, Typography } from '@mui/material'
import type { Session } from '../../types'

interface AdminControlProps {
  session: Session | null
  onStart: () => void
  onStop: () => void
  onChargeStart: () => void
  onChargeStop: () => void
  onResume: () => void
}

export function AdminControl({
  session,
  onStart,
  onStop,
  onChargeStart,
  onChargeStop,
  onResume
}: AdminControlProps) {
  const isRunning = session?.status === 'running'
  const isFinished = session?.status === 'finished'
  const isCharging = session?.chargeStatus === 'running'

  return (
    <Stack spacing={4} sx={{ width: '100%', maxWidth: 400 }}>
      {/* Main Timer Row */}
      <Stack direction="row" spacing={2}>
        {!isRunning && !isFinished ? (
          <Button fullWidth variant="contained" sx={{ height: 100, fontSize: '1.8rem' }} onClick={onStart}>START</Button>
        ) : isRunning ? (
          <Button fullWidth variant="contained" color="error" sx={{ height: 100, fontSize: '1.8rem' }} onClick={onStop}>PAUSE</Button>
        ) : (
          <Button fullWidth variant="contained" color="warning" sx={{ height: 100, fontSize: '1.8rem' }} onClick={onResume}>RESUME</Button>
        )}
      </Stack>

      {/* Charging Timer Row */}
      <Stack direction="row" spacing={2}>
        {!isCharging ? (
          <Button fullWidth variant="outlined" size="large" sx={{ height: 80 }} onClick={onChargeStart} disabled={!isRunning}>CHARGE START</Button>
        ) : (
          <Button fullWidth variant="contained" color="warning" size="large" sx={{ height: 80 }} onClick={onChargeStop}>CHARGE STOP</Button>
        )}
      </Stack>

      <Stack spacing={1} sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary" align="center" sx={{ fontSize: '0.9rem' }}>
          Shortcuts: <b>Space</b> (Start/Pause) | <b>Shift</b> (Charge)
        </Typography>
      </Stack>
    </Stack>
  )
}
