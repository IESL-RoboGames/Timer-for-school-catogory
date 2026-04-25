import { Stack, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material'
import { TEAM_LIST } from '../../theme/theme'

interface AdminSelectionProps {
  selectedTeam: string
  selectedRound: number
  onTeamChange: (team: string) => void
  onRoundChange: (round: number) => void
  onContinue: () => void
  onReset: () => void
}

export function AdminSelection({
  selectedTeam,
  selectedRound,
  onTeamChange,
  onRoundChange,
  onContinue,
  onReset
}: AdminSelectionProps) {
  return (
    <Stack spacing={3} sx={{ width: '100%', maxWidth: 400 }}>
      <FormControl fullWidth>
        <InputLabel>Select Team</InputLabel>
        <Select value={selectedTeam} label="Select Team" onChange={(e) => onTeamChange(e.target.value)}>
          {TEAM_LIST.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel>Select Round</InputLabel>
        <Select value={selectedRound} label="Select Round" onChange={(e) => onRoundChange(Number(e.target.value))}>
          {[1, 2, 3].map(r => <MenuItem key={r} value={r}>Round {r}</MenuItem>)}
        </Select>
      </FormControl>
      <Stack direction="row" spacing={2}>
        <Button fullWidth size="large" variant="contained" disabled={!selectedTeam} onClick={onContinue}>Continue</Button>
        <Button fullWidth size="large" variant="outlined" color="error" onClick={onReset}>Reset All</Button>
      </Stack>
    </Stack>
  )
}
