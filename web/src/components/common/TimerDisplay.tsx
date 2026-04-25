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
  const centiseconds = Math.floor((safe % 1000) / 10)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
}

export function TimerDisplay({ ms, isFinished, isRunning, size = 'large' }: TimerDisplayProps) {
  const color = isFinished ? 'error.main' : isRunning ? 'success.main' : 'text.primary'
  
  return (
    <Typography
      sx={{
        fontFamily: '"Roboto Mono", monospace',
        fontSize: size === 'large' 
          ? { xs: '22vmin', sm: '24vmin', md: '26vmin' } 
          : { xs: '10vmin', sm: '8vmin', md: '7vmin' },
        fontWeight: 900,
        lineHeight: 0.9,
        color: color,
        textShadow: size === 'large' ? '0 0 40px rgba(0,0,0,0.3)' : 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {formatTime(ms)}
    </Typography>
  )
}
