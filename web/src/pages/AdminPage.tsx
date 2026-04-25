import { Stack, Typography, Paper, Container, IconButton, Box } from '@mui/material'
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material'
import type { Session, ResultEntry } from '../types'
import { TimerDisplay } from '../components/common/TimerDisplay'
import { ResultsTable } from '../components/common/ResultsTable'
import { AdminSelection } from '../components/admin/AdminSelection'
import { AdminControl } from '../components/admin/AdminControl'

interface AdminPageProps {
  session: Session | null
  results: ResultEntry[]
  elapsedMs: number
  chargingMs: number
  selectedTeam: string
  selectedRound: number
  isAdminControlView: boolean
  onTeamChange: (t: string) => void
  onRoundChange: (r: number) => void
  onContinue: () => void
  onBack: () => void
  onStart: () => void
  onStop: () => void
  onChargeStart: () => void
  onChargeStop: () => void
  onResume: () => void
  onReset: () => void
  onFinish: () => void
  onHide: (id: string) => void
}

export function AdminPage(props: AdminPageProps) {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={4} sx={{ alignItems: 'center' }}>
        {props.isAdminControlView && (
          <Box sx={{ alignSelf: 'flex-start' }}>
            <IconButton onClick={props.onBack} disabled={props.session?.status === 'running'}>
              <ArrowBackIcon />
            </IconButton>
          </Box>
        )}

        <TimerDisplay ms={props.elapsedMs} isFinished={props.session?.status === 'finished'} isRunning={props.session?.status === 'running'} />
        
        {props.session && (
          <Typography variant="h4" color="primary" sx={{ fontWeight: 800 }}>
            {props.session.team} <Typography component="span" variant="h5" color="text.secondary">Round {props.session.round}</Typography>
          </Typography>
        )}

        <Paper variant="outlined" sx={{ p: 2, minWidth: 280, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>CHARGING</Typography>
          <TimerDisplay ms={props.chargingMs} size="small" isRunning={props.session?.chargeStatus === 'running'} isFinished={props.session?.chargeStatus === 'finished'} />
        </Paper>

        {!props.isAdminControlView ? (
          <>
            <AdminSelection 
              selectedTeam={props.selectedTeam} selectedRound={props.selectedRound}
              onTeamChange={props.onTeamChange} onRoundChange={props.onRoundChange}
              onContinue={props.onContinue}
            />
            <ResultsTable results={props.results} role="admin" onHide={props.onHide} />
          </>
        ) : (
          <AdminControl 
            session={props.session} onStart={props.onStart} onStop={props.onStop}
            onChargeStart={props.onChargeStart} onChargeStop={props.onChargeStop} 
            onResume={props.onResume} onReset={props.onReset} onFinish={props.onFinish}
          />
        )}
      </Stack>
    </Container>
  )
}
