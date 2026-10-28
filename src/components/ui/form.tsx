import * as React from 'react'
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form'
import { Text, View, type TextProps, type ViewProps } from 'react-native'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue | undefined>(undefined)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const FormItemContext = React.createContext<{ id: string } | undefined>(undefined)

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  if (!fieldContext) {
    throw new Error('useFormField debe usarse dentro de <FormField>')
  }

  if (!itemContext) {
    throw new Error('useFormField debe usarse dentro de <FormItem>')
  }

  const fieldState = getFieldState(fieldContext.name, formState)
  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

const FormItem = React.forwardRef<View, ViewProps>(({ className, ...props }, ref) => {
  const id = React.useId().replace(/:/g, '_')
  return (
    <FormItemContext.Provider value={{ id }}>
      <View ref={ref} className={cn('gap-2', className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = 'FormItem'

const FormLabel = React.forwardRef<Text, React.ComponentPropsWithoutRef<typeof Label>>(
  ({ className, ...props }, ref) => {
    const { error, formItemId } = useFormField()
    return <Label ref={ref} className={cn(error && 'text-error', className)} {...props} />
  },
)
FormLabel.displayName = 'FormLabel'

const FormControl = ({ children }: { children: React.ReactNode }) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()
  if (!React.isValidElement(children)) {
    throw new Error('FormControl espera un único elemento hijo (p. ej. Input).')
  }
  return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    nativeID: formItemId,
    accessibilityState: { invalid: !!error },
    accessibilityLabelledBy: error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId,
  })
}
FormControl.displayName = 'FormControl'

const FormDescription = React.forwardRef<Text, TextProps>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()
  return (
    <Text
      ref={ref}
      nativeID={formDescriptionId}
      className={cn('font-sans text-caption text-dark-700', className)}
      {...props}
    />
  )
})
FormDescription.displayName = 'FormDescription'

const FormMessage = React.forwardRef<Text, TextProps>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error.message ?? '') : children

  if (!body) {
    return null
  }

  return (
    <Text
      ref={ref}
      nativeID={formMessageId}
      className={cn('font-inter-500 text-caption text-error', className)}
      {...props}
    >
      {body}
    </Text>
  )
})
FormMessage.displayName = 'FormMessage'

export { useFormField, Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField }
