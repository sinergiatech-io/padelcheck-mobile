import * as React from 'react'
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'flex flex-row items-center justify-center gap-2 rounded-md active:opacity-90 disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500',
        secondary: 'border border-dark-900 bg-transparent',
        destructive: 'bg-error',
        ghost: 'bg-transparent',
        link: 'bg-transparent px-0 py-0',
      },
      size: {
        sm: 'h-8 px-3',
        default: 'h-9 px-4',
        lg: 'h-10 px-5',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

const textVariants = cva('text-center text-sm font-inter-500', {
  variants: {
    variant: {
      primary: 'text-dark-900',
      secondary: 'text-dark-900',
      destructive: 'text-surface',
      ghost: 'text-dark-900',
      link: 'text-dark-900 underline',
    },
    size: {
      sm: 'text-xs',
      default: 'text-sm',
      lg: 'text-base',
      icon: '',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'default',
  },
})

export interface ButtonProps extends Omit<PressableProps, 'children'>, VariantProps<typeof buttonVariants> {
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children?: React.ReactNode
}

const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const isString = typeof children === 'string' || typeof children === 'number'
    return (
      <Pressable
        ref={ref}
        disabled={disabled ?? loading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {loading ? <ActivityIndicator color={variant === 'destructive' ? '#fff' : '#120F18'} /> : null}
        {!loading && leftIcon}
        {!loading &&
          (isString ? (
            <Text className={cn(textVariants({ variant, size }))}>{children}</Text>
          ) : (
            children
          ))}
        {!loading && rightIcon}
      </Pressable>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
