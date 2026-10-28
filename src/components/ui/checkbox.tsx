import * as React from 'react'
import { Pressable, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { cn } from '@/lib/utils'

export interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
}

function Checkbox({ checked, onCheckedChange, disabled, className, id }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!checked, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onCheckedChange?.(!checked)}
      className={cn('h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-dark-900', className)}
      nativeID={id}
    >
      {checked ? (
        <View className="h-full w-full items-center justify-center rounded-sm bg-primary-500">
          <Check size={12} color="#120F18" strokeWidth={3} />
        </View>
      ) : (
        <View className="h-full w-full rounded-sm bg-surface" />
      )}
    </Pressable>
  )
}

export { Checkbox }
