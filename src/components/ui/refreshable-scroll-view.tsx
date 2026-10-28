import { RefreshControl, ScrollView, type ScrollViewProps } from 'react-native'

const REFRESH_COLOR = '#C9CF38'

type RefreshableScrollViewProps = ScrollViewProps & {
  refreshing: boolean
  onRefresh: () => void
}

/** ScrollView with pull-to-refresh — use on list/detail screens that load remote data. */
export function RefreshableScrollView({
  refreshing,
  onRefresh,
  children,
  ...props
}: RefreshableScrollViewProps) {
  return (
    <ScrollView
      {...props}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={REFRESH_COLOR}
          colors={[REFRESH_COLOR]}
        />
      }
    >
      {children}
    </ScrollView>
  )
}
