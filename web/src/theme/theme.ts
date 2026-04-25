import { createTheme } from '@mui/material'

export const TEAM_LIST = [
  'NeuraX',
  'Genesis',
  'R2D2',
  'VisionSpark',
  'Axiom',
  'Codex Robotics',
  'Controlled Chaos',
  '404 Team Not Found',
]

export const TEAM_COLORS: Record<string, string> = {
  'NeuraX': '#ff595e',
  'Genesis': '#ffca3a',
  'R2D2': '#8ac926',
  'VisionSpark': '#1982c4',
  'Axiom': '#6a4c93',
  'Codex Robotics': '#ff924c',
  'Controlled Chaos': '#4267b2',
  '404 Team Not Found': '#999999',
}

export function buildTheme(role: 'admin' | 'judge' | 'public') {
  const isPublic = role === 'public'
  
  const palette =
    isPublic
      ? { 
          mode: 'dark' as const, 
          primary: { main: '#00d2ff' }, 
          background: { default: '#0a192f', paper: '#112240' },
          text: { primary: '#ffffff' }
        }
      : role === 'judge'
        ? { mode: 'light' as const, primary: { main: '#0b6e4f' }, background: { default: '#f3f8f5', paper: '#ffffff' } }
        : { mode: 'dark' as const, primary: { main: '#64ffda' }, background: { default: '#020c1b', paper: '#112240' } }

  return createTheme({
    typography: {
      fontFamily: '"DM Sans", "Roboto Mono", "Segoe UI", sans-serif',
      h1: { fontWeight: 900, letterSpacing: '-0.02em' },
      h2: { fontWeight: 800, fontSize: '3.5rem' },
    },
    palette,
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 700,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 16,
          },
        },
      },
    },
  })
}
