import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from '@mui/material'
import type { ResultEntry } from '../../types'
import { formatTime } from './TimerDisplay'
import { TEAM_COLORS } from '../../theme/theme'

interface ResultsTableProps {
  results: ResultEntry[]
  role: 'admin' | 'judge' | 'public'
  onHide?: (id: string) => void
}

export function ResultsTable({ results, role, onHide }: ResultsTableProps) {
  const isAdmin = role === 'admin'

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ width: '100%', maxWidth: 850, bgcolor: 'background.paper' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Team</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Round</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Main Time</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Charge Time</TableCell>
            {isAdmin && <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {results.length === 0 && (
            <TableRow>
              <TableCell colSpan={isAdmin ? 6 : 5} align="center" sx={{ py: 3 }}>
                No finished teams yet
              </TableCell>
            </TableRow>
          )}
          {results.map((result, index) => {
            const teamColor = TEAM_COLORS[result.team] || 'inherit'
            return (
              <TableRow key={`${result.id}-${index}`} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell>{index + 1}</TableCell>
                <TableCell sx={{ color: teamColor, fontWeight: 800, fontSize: '1rem' }}>
                  {result.team}
                </TableCell>
                <TableCell>RD {result.round}</TableCell>
                <TableCell align="right" sx={{ fontFamily: '"Roboto Mono", monospace', fontWeight: 700 }}>
                  {formatTime(result.elapsedMs)}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: '"Roboto Mono", monospace', color: 'text.secondary' }}>
                  {formatTime(result.chargeMs)}
                </TableCell>
                {isAdmin && onHide && (
                  <TableCell align="right">
                    <Button size="small" color="error" onClick={() => onHide(result.id)}>
                      Hide
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
