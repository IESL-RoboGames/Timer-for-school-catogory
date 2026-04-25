import { Stack, Typography, Paper, Container } from '@mui/material'
import type { Session, ResultEntry } from '../types'
import { TimerDisplay } from '../components/common/TimerDisplay'
import { ResultsTable } from '../components/common/ResultsTable'

interface JudgePageProps {
  session: Session | null
  results: ResultEntry[]
  elapsedMs: number
  chargingMs: number
}

export function JudgePage({ session, results, elapsedMs, chargingMs }: JudgePageProps) {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={4} sx={{ alignItems: 'center' }}>
        <TimerDisplay ms={elapsedMs} isFinished={session?.status === 'finished'} isRunning={session?.status === 'running'} />
        
        {session && (
          <Typography variant="h4" color="primary" sx={{ fontWeight: 800 }}>
            {session.team} <Typography component="span" variant="h5" color="text.secondary">Round {session.round}</Typography>
          </Typography>
        )}

        <Paper variant="outlined" sx={{ p: 2, minWidth: 280, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>CHARGING</Typography>
          <TimerDisplay ms={chargingMs} size="small" isRunning={session?.chargeStatus === 'running'} isFinished={session?.chargeStatus === 'finished'} />
        </Paper>

        <ResultsTable results={results} role="judge" />
      </Stack>
    </Container>
  )
}
