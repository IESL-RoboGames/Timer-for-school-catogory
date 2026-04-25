import { Typography } from '@mui/material'

interface TimerDisplayProps {
  ms: number
  isFinished?: boolean
  isRunning?: boolean
  size?: 'large' | 'small'
}

export function formatTime(ms: number): string {
  const safe = Math.max(0, ms)
  const totalSeconds = Math.floor(safe / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const deciseconds = Math.floor((safe % 1000) / 100)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${deciseconds}`
}

export function TimerDisplay({ ms, isFinished, isRunning, size = 'large' }: TimerDisplayProps) {
  const color = isFinished ? 'error.main' : isRunning ? 'success.main' : 'text.primary'
  
  return (
    <Typography
      sx={{
        fontFamily: '"Roboto Mono", monospace',
        fontSize: size === 'large' 
          ? { xs: '5rem', sm: '10rem', md: '15rem' } 
          : '2rem',
        fontWeight: 900,
        lineHeight: 1,
        color: color,
        textShadow: size === 'large' ? '0 0 20px rgba(0,0,0,0.5)' : 'none',
      }}
    >
      {formatTime(ms)}
    </Typography>
  )
}
