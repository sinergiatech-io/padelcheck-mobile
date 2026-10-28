import * as React from 'react'
import { TextInput, View, type TextInputProps } from 'react-native'
import { cn } from '@/lib/utils'

const PLACEHOLDER = '#6b7280'

const Input = React.forwardRef<React.ComponentRef<typeof TextInput>, TextInputProps>(({ className, placeholderTextColor, ...props }, ref) => {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor ?? PLACEHOLDER}
      className={cn(
        'h-9 w-full rounded-md border border-divider bg-surface px-3 py-2 font-sans text-body text-dark-900',
        className,
      )}
      {...props}
    />
  )
})
Input.displayName = 'Input'

function InputGroup({
  className,
  left,
  children,
}: {
  className?: string
  left?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <View className={cn('relative w-full', className)}>
      {left != null ? (
        <View className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">{left}</View>
      ) : null}
      {children}
    </View>
  )
}

export { Input, InputGroup }
