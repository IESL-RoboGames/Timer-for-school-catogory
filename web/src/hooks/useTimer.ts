import { useState, useEffect } from 'react'
import type { Session } from '../types'

export function useTimer(session: Session | null, serverOffset: number) {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [chargingMs, setChargingMs] = useState(0)

  useEffect(() => {
    if (!session) {
      setElapsedMs(0)
      return
    }

    if (session.status === 'finished') {
      setElapsedMs((session.endTime ?? session.startTime) - session.startTime)
      return
    }

    const timerId = setInterval(() => {
      setElapsedMs(Date.now() + serverOffset - session.startTime)
    }, 50)
    return () => clearInterval(timerId)
  }, [session, serverOffset])

  useEffect(() => {
    if (!session || !session.chargeStartTime) {
      setChargingMs(0)
      return
    }

    if (session.chargeStatus === 'finished') {
      setChargingMs((session.chargeEndTime ?? session.chargeStartTime) - session.chargeStartTime)
      return
    }

    const timerId = setInterval(() => {
      setChargingMs(Date.now() + serverOffset - session.chargeStartTime!)
    }, 50)
    return () => clearInterval(timerId)
  }, [session, serverOffset])

  return { elapsedMs, chargingMs }
}
