import { Stack, Typography, Container, Box } from '@mui/material'
import type { Session, ResultEntry } from '../types'
import { TimerDisplay } from '../components/common/TimerDisplay'
import { ResultsTable } from '../components/common/ResultsTable'

interface JudgePageProps {
  session: Session | null
  results: ResultEntry[]
  elapsedMs: number
  chargingMs: number
  selectedTeam: string
  selectedRound: number
}

export function JudgePage({ session, results, elapsedMs, chargingMs, selectedTeam, selectedRound }: JudgePageProps) {
  const displayTeam = session?.team || selectedTeam
  const displayRound = session?.round || selectedRound

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', width: '100%', overflowX: 'hidden' }}>
      <Container maxWidth="md" sx={{ py: 2 }}>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Stack direction="row" spacing={4} sx={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>MAIN TIMER</Typography>
              <TimerDisplay ms={elapsedMs} size="small" isFinished={session?.status === 'finished'} isRunning={session?.status === 'running'} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>CHARGING</Typography>
              <TimerDisplay ms={chargingMs} size="small" isRunning={session?.chargeStatus === 'running'} isFinished={session?.chargeStatus === 'finished'} />
            </Box>
          </Stack>
          
          {displayTeam && (
            <Typography variant="h4" color="primary" sx={{ 
              fontWeight: 900, 
              textAlign: 'center',
              textTransform: 'uppercase',
              mb: 1
            }}>
              {displayTeam} <Box component="span" sx={{ ml: 1, color: 'text.secondary', fontSize: '0.8em' }}>RD {displayRound}</Box>
            </Typography>
          )}

          <ResultsTable results={results} role="judge" />
        </Stack>
      </Container>
    </Box>
  )
}
