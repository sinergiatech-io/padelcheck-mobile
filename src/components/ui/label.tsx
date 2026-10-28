import * as React from 'react'
import { Text, type TextProps } from 'react-native'
import { cn } from '@/lib/utils'

const Label = React.forwardRef<React.ComponentRef<typeof Text>, TextProps>(({ className, ...props }, ref) => (
  <Text
    ref={ref}
    className={cn('text-body-sm font-inter-500 leading-none text-dark-900', className)}
    {...props}
  />
))
Label.displayName = 'Label'

export { Label }
