import { Text, View } from 'react-native'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CategoryBracketsTab } from '@/features/events/components/CategoryBracketsTab'
import { CategoryQualifierTab } from '@/features/events/components/CategoryQualifierTab'
import { RegistrationList } from './RegistrationList'
import type { EventCategory } from '../types'

export function CategoryMatchesTab({ category }: { category: EventCategory }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Partidos · {category.name}</CardTitle>
      </CardHeader>
      <CardContent className="gap-2">
        {category.matches.map((match) => (
          <View key={match.id} className="rounded-md border border-divider p-3">
            <Text className="font-sans text-caption font-medium uppercase tracking-wide text-[#605e64]">
              {match.scheduledLabel}
            </Text>
            <Text className="font-sans text-body-sm text-dark-700">{match.court}</Text>
            <Text className="mt-2 font-sans text-body-sm font-medium text-dark-900">
              {match.teamA} vs {match.teamB}
            </Text>
            {match.score ? <Text className="font-sans text-body-sm text-dark-700">{match.score}</Text> : null}
          </View>
        ))}
      </CardContent>
    </Card>
  )
}

export function CategoryRegistrationsTab({ category }: { category: EventCategory }) {
  return <RegistrationList registrations={category.registrations} />
}

export function CategoryQualifierTabPanel({ category }: { category: EventCategory }) {
  return <CategoryQualifierTab zones={category.qualifierZones} />
}

export function CategoryBracketsTabPanel({ category }: { category: EventCategory }) {
  return <CategoryBracketsTab rounds={category.bracketRounds} />
}
