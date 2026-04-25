export type SessionStatus = 'running' | 'finished' | 'cancelled' | 'hidden'

export type Session = {
  id?: string
  team: string
  round: number
  startTime: number
  endTime?: number
  status: SessionStatus
  chargeStartTime?: number
  chargeEndTime?: number
  chargeStatus?: 'running' | 'finished'
}

export type StateResponse = {
  serverTime: number
  session: Session | null
  authRequired?: boolean
  error?: string
}

export type ResultEntry = {
  id: string
  team: string
  round: number
  startTime: number
  endTime: number
  elapsedMs: number
  chargeMs: number
}

export type ResultsResponse = {
  results: ResultEntry[]
  error?: string
}

export type WsEvent =
  | {
      event: 'START'
      team: string
      round: number
      startTime: number
    }
  | {
      event: 'STOP'
      team: string
      endTime: number
      requestId?: string
    }
  | {
      event: 'CHARGE_START'
      team: string
      chargeStartTime: number
    }
  | {
      event: 'CHARGE_STOP'
      team: string
      chargeEndTime: number
    }
  | {
      event: 'RESET'
    }
  | {
      event: 'RESULTS_UPDATED'
    }
