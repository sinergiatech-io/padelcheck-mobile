import * as React from 'react'
import { AccessibilityInfo, ActivityIndicator, Pressable, Text, View, type PressableProps } from 'react-native'
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
  loadingLabel?: string
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
      loadingLabel = 'Procesando…',
      leftIcon,
      rightIcon,
      disabled,
      children,
      accessibilityLabel,
      accessibilityState,
      ...props
    },
    ref,
  ) => {
    const isString = typeof children === 'string' || typeof children === 'number'
    const [reduceMotion, setReduceMotion] = React.useState(false)
    React.useEffect(() => {
      let active = true
      void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReduceMotion(value) })
      const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
      return () => { active = false; subscription.remove() }
    }, [])
    const blocked = Boolean(disabled || loading)
    return (
      <Pressable
        ref={ref}
        disabled={blocked}
        accessibilityRole="button"
        accessibilityLabel={loading ? loadingLabel : accessibilityLabel ?? (isString ? String(children) : undefined)}
        accessibilityState={{ ...accessibilityState, disabled: blocked, busy: Boolean(loading) }}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        <View className="flex-row items-center justify-center gap-2" style={{ opacity: loading ? 0 : 1 }}
          accessibilityElementsHidden={Boolean(loading)} importantForAccessibility={loading ? 'no-hide-descendants' : 'auto'}>
          {leftIcon}
          {isString ? (
            <Text className={cn(textVariants({ variant, size }))}>{children}</Text>
          ) : (
            children
          )}
          {rightIcon}
        </View>
        {loading && (
          <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
            className="absolute inset-0 items-center justify-center">
            {reduceMotion ? (
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                borderColor: variant === 'destructive' ? '#fff' : '#120F18', borderTopColor: 'transparent' }} />
            ) : (
              <ActivityIndicator size="small" color={variant === 'destructive' ? '#fff' : '#120F18'} />
            )}
          </View>
        )}
      </Pressable>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
