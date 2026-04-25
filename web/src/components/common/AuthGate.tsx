import React, { useState } from 'react'
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

interface AuthGateProps {
  onLogin: (password: string) => Promise<void>
  error: string | null
}

export function AuthGate({ onLogin, error }: AuthGateProps) {
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.trim()) {
      void onLogin(password)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)',
      }}
    >
      <Container maxWidth="xs">
        <Paper elevation={10} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              ROBOGAMES
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Access Protected
            </Typography>
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && (
              <Typography variant="caption" color="error">
                {error}
              </Typography>
            )}
            <Button
              fullWidth
              size="large"
              variant="contained"
              type="submit"
              sx={{ py: 1.5, fontWeight: 'bold' }}
            >
              Enter Dashboard
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}
