import { Stack, Typography, Box, IconButton } from '@mui/material'
import { Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon } from '@mui/icons-material'
import { useState, useEffect } from 'react'
import type { Session } from '../types'
import { TimerDisplay } from '../components/common/TimerDisplay'

interface PublicPageProps {
  session: Session | null
  elapsedMs: number
  chargingMs: number
  selectedTeam: string
  selectedRound: number
}

export function PublicPage({ session, elapsedMs, chargingMs, selectedTeam, selectedRound }: PublicPageProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const displayTeam = session?.team || selectedTeam
  const displayRound = session?.round || selectedRound

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  return (
    <Box sx={{ 
      minHeight: '100dvh', 
      bgcolor: 'background.default', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      overflow: 'hidden',
      p: 2,
      position: 'relative'
    }}>
      <IconButton 
        onClick={toggleFullscreen}
        sx={{ position: 'absolute', top: 20, right: 20, color: 'rgba(255,255,255,0.2)' }}
      >
        {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
      </IconButton>

      <Stack spacing={{ xs: 1, md: 2 }} sx={{ alignItems: 'center', width: '100%' }}>
        <TimerDisplay ms={elapsedMs} isFinished={session?.status === 'finished'} isRunning={session?.status === 'running'} />

        {displayTeam && (
          <Typography variant="h2" color="primary" sx={{ 
            fontWeight: 900, 
            textTransform: 'uppercase',
            fontSize: { xs: '8vmin', sm: '7vmin', md: '6vmin' },
            textAlign: 'center',
            lineHeight: 1,
            mb: 1
          }}>
            {displayTeam} 
            <Box component="span" sx={{ ml: 2, color: 'text.secondary', opacity: 0.6, fontSize: '0.7em' }}>
              RD {displayRound}
            </Box>
          </Typography>
        )}

        <Box sx={{ border: '2px solid rgba(100, 255, 218, 0.1)', p: { xs: 1, md: 2 }, px: { xs: 3, md: 5 }, borderRadius: 4, textAlign: 'center', bgcolor: 'rgba(17, 34, 64, 0.3)', backdropFilter: 'blur(10px)', width: 'fit-content' }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 800, fontSize: { xs: '2.5vmin', md: '1.5vmin' }, opacity: 0.7 }}>
            CHARGING
          </Typography>
          <TimerDisplay ms={chargingMs} size="small" isRunning={session?.chargeStatus === 'running'} isFinished={session?.chargeStatus === 'finished'} />
        </Box>
      </Stack>
    </Box>
  )
}
