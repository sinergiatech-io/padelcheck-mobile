import { useCallback, useState } from 'react'

/** Pull-to-refresh helper — wrap screen data loaders and pass to `RefreshableScrollView`. */
export function useRefreshControl(onRefresh: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }, [onRefresh])

  return { refreshing, onRefresh: handleRefresh }
}
