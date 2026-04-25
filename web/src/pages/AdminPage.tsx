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
  const displayTeam = props.session?.team || props.selectedTeam
  const displayRound = props.session?.round || props.selectedRound

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', width: '100%', overflowX: 'hidden' }}>
      <Container maxWidth="md" sx={{ py: 2, px: { xs: 1, sm: 2 } }}>
        <Stack spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
          {props.isAdminControlView && (
            <Box sx={{ alignSelf: 'flex-start', width: '100%' }}>
              <IconButton onClick={props.onBack} disabled={props.session?.status === 'running'} sx={{ color: 'primary.main' }}>
                <ArrowBackIcon fontSize="medium" />
              </IconButton>
            </Box>
          )}

          <Stack direction="row" spacing={4} sx={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>MAIN TIMER</Typography>
              <TimerDisplay ms={props.elapsedMs} size="small" isFinished={props.session?.status === 'finished'} isRunning={props.session?.status === 'running'} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>CHARGING</Typography>
              <TimerDisplay ms={props.chargingMs} size="small" isRunning={props.session?.chargeStatus === 'running'} isFinished={props.session?.chargeStatus === 'finished'} />
            </Box>
          </Stack>
          
          {(props.isAdminControlView || props.session) && (
            <Typography variant="h4" color="primary" sx={{ 
              fontWeight: 900, 
              textAlign: 'center',
              textTransform: 'uppercase',
              mb: 1
            }}>
              {displayTeam} 
              <Box component="span" sx={{ ml: 2, color: 'text.secondary', fontSize: '0.8em' }}>
                RD {displayRound}
              </Box>
            </Typography>
          )}

          {!props.isAdminControlView ? (
            <Stack spacing={3} sx={{ width: '100%', alignItems: 'center' }}>
              <AdminSelection 
                selectedTeam={props.selectedTeam} selectedRound={props.selectedRound}
                onTeamChange={props.onTeamChange} onRoundChange={props.onRoundChange}
                onContinue={props.onContinue}
              />
              <ResultsTable results={props.results} role="admin" onHide={props.onHide} />
            </Stack>
          ) : (
            <AdminControl 
              session={props.session} onStart={props.onStart} onStop={props.onStop}
              onChargeStart={props.onChargeStart} onChargeStop={props.onChargeStop} 
              onResume={props.onResume} onReset={props.onReset} onFinish={props.onFinish}
            />
          )}
        </Stack>
      </Container>
    </Box>
  )
}
