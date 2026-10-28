import { TextInput, View, type TextInputProps } from 'react-native'
import { SearchFieldIcon } from '@/components/icons/SearchFieldIcon'
import { cn } from '@/lib/utils'

type FigmaSearchFieldProps = Omit<TextInputProps, 'className'> & {
  className?: string
  inputClassName?: string
}

export function FigmaSearchField({
  className,
  inputClassName,
  placeholder = 'Buscar...',
  placeholderTextColor = '#605e64',
  ...props
}: FigmaSearchFieldProps) {
  return (
    <View
      className={cn(
        'min-h-12 flex-row items-center gap-2 rounded-2xl border border-[#b6b5b7] bg-[#fefefe] px-4 py-2',
        className,
      )}
    >
      <SearchFieldIcon size={24} color="#605E64" />
      <TextInput
        className={cn('min-h-6 flex-1 p-0 font-inter-500 text-body-sm text-dark-900', inputClassName)}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        style={{ includeFontPadding: false, textAlignVertical: 'center' }}
        {...props}
      />
    </View>
  )
}
