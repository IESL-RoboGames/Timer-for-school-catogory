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
      <Stack spacing={4} sx={{ alignItems: 'center', width: '100%' }}>
        <TimerDisplay ms={elapsedMs} isFinished={session?.status === 'finished'} isRunning={session?.status === 'running'} />

        {session && (
          <Typography variant="h2" color="primary" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
            {session.team} <Typography component="span" variant="h4" color="text.secondary">RD {session.round}</Typography>
          </Typography>
        )}

        <Box sx={{ border: '2px solid #333', p: 4, borderRadius: 2, textAlign: 'center' }}>
          <TimerDisplay ms={chargingMs} size="small" isRunning={session?.chargeStatus === 'running'} isFinished={session?.chargeStatus === 'finished'} />
        </Box>
      </Stack>
    </Box>
  )
}
