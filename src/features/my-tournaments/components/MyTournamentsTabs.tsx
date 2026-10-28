import { Pressable, Text, View } from 'react-native'
import { cn } from '@/lib/utils'
import type { MyTournamentTab } from '../types'

type MyTournamentsTabsProps = {
  activeTab: MyTournamentTab
  onChange: (tab: MyTournamentTab) => void
}

export function MyTournamentsTabs({ activeTab, onChange }: MyTournamentsTabsProps) {
  return (
    <View
      className="flex-row bg-surface"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 3,
      }}
    >
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'activos' }}
        className={cn(
          'h-[57px] flex-1 items-center justify-center px-2 py-4',
          activeTab === 'activos' ? 'border-b border-primary-600 bg-[#FAFAEB]' : 'bg-surface',
        )}
        onPress={() => onChange('activos')}
      >
        <Text
          className={cn(
            'text-body-sm leading-6',
            activeTab === 'activos' ? 'font-inter-600 text-primary-600' : 'font-inter-500 text-[#605e64]',
          )}
        >
          Activos
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'historial' }}
        className={cn(
          'h-[57px] flex-1 items-center justify-center px-2 py-4',
          activeTab === 'historial' ? 'border-b border-primary-600 bg-[#FAFAEB]' : 'bg-surface',
        )}
        onPress={() => onChange('historial')}
      >
        <Text
          className={cn(
            'text-body-sm leading-6',
            activeTab === 'historial' ? 'font-inter-600 text-primary-600' : 'font-inter-500 text-[#605e64]',
          )}
        >
          Historial
        </Text>
      </Pressable>
    </View>
  )
}
