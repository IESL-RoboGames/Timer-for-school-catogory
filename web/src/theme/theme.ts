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
          primary: { main: '#2ec4b6' }, 
          background: { default: '#000000', paper: '#0a0a0a' },
          text: { primary: '#ffffff' }
        }
      : role === 'judge'
        ? { mode: 'light' as const, primary: { main: '#0b6e4f' }, background: { default: '#f3f8f5', paper: '#ffffff' } }
        : { mode: 'light' as const, primary: { main: '#0f4c81' }, background: { default: '#eef3f9', paper: '#ffffff' } }

  return createTheme({
    typography: {
      fontFamily: '"DM Sans", "Roboto Mono", "Segoe UI", sans-serif',
      h1: { fontWeight: 900, letterSpacing: '-0.02em' },
      h2: { fontWeight: 700 },
    },
    palette,
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  })
}
