import { Stack, Typography, Paper, Box } from '@mui/material'
import type { Session } from '../types'
import { TimerDisplay } from '../components/common/TimerDisplay'

interface PublicPageProps {
  session: Session | null
  elapsedMs: number
  chargingMs: number
}

export function PublicPage({ session, elapsedMs, chargingMs }: PublicPageProps) {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Stack spacing={8} sx={{ alignItems: 'center', width: '100%' }}>
        <TimerDisplay ms={elapsedMs} isFinished={session?.status === 'finished'} isRunning={session?.status === 'running'} />

        <Box sx={{ border: '2px solid #333', p: 4, borderRadius: 2, textAlign: 'center' }}>
          <TimerDisplay ms={chargingMs} size="small" isRunning={session?.chargeStatus === 'running'} isFinished={session?.chargeStatus === 'finished'} />
        </Box>
      </Stack>
    </Box>
  )
}
