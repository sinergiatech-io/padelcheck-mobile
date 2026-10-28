import * as React from 'react'
import { Text, View, type TextProps, type ViewProps } from 'react-native'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('flex flex-row items-center rounded-md border px-2 py-0.5', {
  variants: {
    variant: {
      default: 'border-transparent bg-dark-900',
      primary: 'border-transparent bg-primary-500',
      success: 'border-transparent bg-success',
      warning: 'border-transparent bg-warning',
      destructive: 'border-transparent bg-error',
      info: 'border-transparent bg-info',
      neutral: 'border-divider bg-background',
      outline: 'border-divider bg-surface',
    },
    size: {
      sm: 'px-1.5 py-0.5',
      default: 'py-0.5',
      lg: 'px-3 py-1',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

const badgeTextVariants = cva('text-caption font-inter-500', {
  variants: {
    variant: {
      default: 'text-surface',
      primary: 'text-dark-900',
      success: 'text-surface',
      warning: 'text-dark-900',
      destructive: 'text-surface',
      info: 'text-surface',
      neutral: 'text-dark-900',
      outline: 'text-dark-900',
    },
    size: {
      sm: 'text-[0.65rem]',
      default: '',
      lg: 'text-body-sm',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

export interface BadgeProps extends ViewProps, VariantProps<typeof badgeVariants> {
  children?: React.ReactNode
  textClassName?: string
}

function Badge({ className, variant, size, children, textClassName, ...props }: BadgeProps) {
  const isText = typeof children === 'string' || typeof children === 'number'
  return (
    <View className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {isText ? (
        <Text className={cn(badgeTextVariants({ variant, size }), textClassName)}>{children}</Text>
      ) : (
        children
      )}
    </View>
  )
}

export { Badge, badgeVariants }
