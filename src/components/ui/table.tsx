import * as React from 'react'
import { ScrollView, Text, View, type TextProps, type ViewProps } from 'react-native'
import { cn } from '@/lib/utils'

const Table = React.forwardRef<React.ComponentRef<typeof View>, ViewProps>(({ className, ...props }, ref) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="w-full">
    <View ref={ref} className={cn('min-w-full', className)} {...props} />
  </ScrollView>
))
Table.displayName = 'Table'

const TableHeader = React.forwardRef<React.ComponentRef<typeof View>, ViewProps>(({ className, ...props }, ref) => (
  <View ref={ref} className={cn('flex flex-row border-b border-divider', className)} {...props} />
))
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<React.ComponentRef<typeof View>, ViewProps>(({ className, ...props }, ref) => (
  <View ref={ref} className={cn('', className)} {...props} />
))
TableBody.displayName = 'TableBody'

const TableRow = React.forwardRef<React.ComponentRef<typeof View>, ViewProps>(({ className, ...props }, ref) => (
  <View ref={ref} className={cn('flex flex-row border-b border-divider', className)} {...props} />
))
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<React.ComponentRef<typeof Text>, TextProps>(({ className, ...props }, ref) => (
  <Text
    ref={ref}
    className={cn('flex-1 p-3 font-inter-500 text-body-sm text-dark-700', className)}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<React.ComponentRef<typeof Text>, TextProps>(({ className, ...props }, ref) => (
  <Text ref={ref} className={cn('flex-1 p-3 font-sans text-body-sm text-dark-900', className)} {...props} />
))
TableCell.displayName = 'TableCell'

const TableCaption = React.forwardRef<React.ComponentRef<typeof Text>, TextProps>(({ className, ...props }, ref) => (
  <Text ref={ref} className={cn('mt-2 font-sans text-caption text-dark-700', className)} {...props} />
))
TableCaption.displayName = 'TableCaption'

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption }
