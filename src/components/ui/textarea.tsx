import * as React from 'react'
import { TextInput, type TextInputProps } from 'react-native'
import { cn } from '@/lib/utils'

const PLACEHOLDER = '#6b7280'

const Textarea = React.forwardRef<TextInput, TextInputProps>(({ className, multiline, placeholderTextColor, ...props }, ref) => {
  return (
    <TextInput
      ref={ref}
      multiline={multiline ?? true}
      textAlignVertical="top"
      placeholderTextColor={placeholderTextColor ?? PLACEHOLDER}
      className={cn(
        'min-h-16 w-full rounded-md border border-divider bg-surface px-3 py-2 font-sans text-body text-dark-900',
        className,
      )}
      {...props}
    />
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }
