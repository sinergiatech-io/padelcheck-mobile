import { useCallback, useEffect, useState } from 'react'
import { myTournamentsMockService } from '@/features/my-tournaments/api/my-tournaments.mock'
import type { MyTournament } from '@/features/my-tournaments/types'

export function useMyTournamentsQuery() {
  const [active, setActive] = useState<MyTournament[]>([])
  const [history, setHistory] = useState<MyTournament[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [nextActive, nextHistory] = await Promise.all([
      myTournamentsMockService.listActive(),
      myTournamentsMockService.listHistory(),
    ])
    setActive(nextActive)
    setHistory(nextHistory)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { active, history, loading, reload: load }
}
