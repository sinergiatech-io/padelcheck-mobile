import * as React from 'react'
import { Pressable, Text, View } from 'react-native'
import { Circle } from 'lucide-react-native'
import { cn } from '@/lib/utils'

type RadioGroupCtx = {
  value?: string
  onValueChange?: (v: string) => void
}

const RadioGroupContext = React.createContext<RadioGroupCtx | undefined>(undefined)

function useRadioGroup() {
  const ctx = React.useContext(RadioGroupContext)
  if (!ctx) throw new Error('RadioGroupItem must be inside RadioGroup')
  return ctx
}

export interface RadioGroupProps {
  value?: string
  onValueChange?: (v: string) => void
  className?: string
  children: React.ReactNode
}

function RadioGroup({ value, onValueChange, className, children }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <View className={cn('gap-2', className)}>{children}</View>
    </RadioGroupContext.Provider>
  )
}

export interface RadioGroupItemProps {
  value: string
  className?: string
  children?: React.ReactNode
  id?: string
}

function RadioGroupItem({ value, className, children, id }: RadioGroupItemProps) {
  const { value: selected, onValueChange } = useRadioGroup()
  const selectedItem = selected === value
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: selectedItem }}
      nativeID={id}
      onPress={() => onValueChange?.(value)}
      className={cn('flex flex-row items-center gap-2', className)}
    >
      <View
        className={cn(
          'h-4 w-4 items-center justify-center rounded-full border border-dark-900',
          selectedItem && 'border-primary-600',
        )}
      >
        {selectedItem ? <Circle size={8} color="#B4BA2F" fill="#B4BA2F" /> : null}
      </View>
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text className="font-sans text-body-sm text-dark-900">{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  )
}

export { RadioGroup, RadioGroupItem }
