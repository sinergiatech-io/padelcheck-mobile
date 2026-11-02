import * as React from 'react'
import { Keyboard, Modal, Pressable, ScrollView, Text, View, type PressableProps } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import { cn } from '@/lib/utils'

type SelectCtx = {
  value?: string
  onValueChange?: (v: string) => void
  open: boolean
  setOpen: (o: boolean) => void
  labels: Record<string, string>
  registerLabel: (value: string, label: string) => void
}

const SelectCtx = React.createContext<SelectCtx | undefined>(undefined)

function useSelect() {
  const ctx = React.useContext(SelectCtx)
  if (!ctx) throw new Error('Select parts must be used within Select')
  return ctx
}

export function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string
  onValueChange?: (v: string) => void
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [labels, setLabels] = React.useState<Record<string, string>>({})
  const registerLabel = React.useCallback((v: string, label: string) => {
    setLabels((prev) => (prev[v] === label ? prev : { ...prev, [v]: label }))
  }, [])
  const ctx = React.useMemo(
    () => ({ value, onValueChange, open, setOpen, labels, registerLabel }),
    [value, onValueChange, open, labels, registerLabel],
  )
  return <SelectCtx.Provider value={ctx}>{children}</SelectCtx.Provider>
}

export function SelectTrigger({ className, children, indicator, ...props }: PressableProps & { children?: React.ReactNode; indicator?: React.ReactNode }) {
  const { setOpen } = useSelect()
  return (
    <Pressable
      {...props}
      onPress={() => { Keyboard.dismiss(); setOpen(true) }}
      className={cn(
        'flex h-9 w-full flex-row items-center justify-between rounded-md border border-divider bg-surface px-3',
        className,
      )}
    >
      {children}
      {indicator ?? <ChevronDown size={16} color="#6b7280" />}
    </Pressable>
  )
}

export function SelectValue({ placeholder, className }: { placeholder?: string; className?: string }) {
  const { value, labels } = useSelect()
  const label = value != null ? labels[value] : undefined
  return (
    <Text className={cn('font-sans text-sm text-dark-900', className)} numberOfLines={1}>
      {label ?? placeholder ?? ''}
    </Text>
  )
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useSelect()
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
        <Pressable onPress={(e) => e.stopPropagation()} className="max-h-80 rounded-t-lg bg-surface p-2">
          <ScrollView>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function SelectItem({ value, children }: { value: string; children: string }) {
  const { value: selected, onValueChange, setOpen, registerLabel } = useSelect()
  React.useEffect(() => {
    registerLabel(value, children)
  }, [value, children, registerLabel])
  const active = selected === value
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        onValueChange?.(value)
        setOpen(false)
      }}
      className={cn('rounded-md px-3 py-2', active && 'bg-primary-100')}
    >
      <Text className="font-sans text-sm text-dark-900">{children}</Text>
    </Pressable>
  )
}

export function SelectSeparator() {
  return <View className="my-1 h-px bg-divider" />
}
