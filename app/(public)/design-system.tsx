import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Bell, Calendar, Mail, MapPin, Search, Trophy, Users } from 'lucide-react-native'
import { Button } from '@/components/ui/button'
import { Input, InputGroup } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const swatches = [
  { name: 'Primary 500', hex: '#C9CF38' },
  { name: 'Primary 600', hex: '#B4BA2F' },
  { name: 'Dark 900', hex: '#120F18' },
  { name: 'Background', hex: '#F5F5F5' },
  { name: 'Surface', hex: '#FFFFFF' },
  { name: 'Divider', hex: '#E6E6E6' },
  { name: 'Success', hex: '#22C55E' },
  { name: 'Error', hex: '#EF4444' },
]

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <View className="gap-6 border-b border-divider pb-12">
      <View>
        <Text className="font-inter-600 text-h2 text-dark-900">{title}</Text>
        {description ? <Text className="mt-2 font-sans text-body-sm text-dark-700">{description}</Text> : null}
      </View>
      {children}
    </View>
  )
}

export default function DesignSystemScreen() {
  const [catA, setCatA] = useState(true)
  const [catB, setCatB] = useState(false)
  const [notif, setNotif] = useState(true)
  const [format, setFormat] = useState('grupos')
  const [cat, setCat] = useState('a')

  return (
    <ScrollView className="flex-1 bg-background px-4 py-10">
      <View className="mx-auto w-full max-w-xl gap-12 pb-24">
        <View>
          <Text className="font-inter-500 text-caption uppercase text-dark-700">Padel Check</Text>
          <Text className="mt-2 font-inter-700 text-display text-dark-900">UI Kit (mobile)</Text>
          <Text className="mt-4 font-sans text-body text-dark-700">
            Tokens y componentes alineados con padelcheck-fe y el Figma.
          </Text>
        </View>

        <Section title="Colores" description="Referencia rápida (hex).">
          <View className="flex flex-row flex-wrap gap-3">
            {swatches.map(({ name, hex }) => (
              <View key={name} className="w-[47%] overflow-hidden rounded-lg border border-divider bg-surface shadow-card">
                <View style={{ height: 56, backgroundColor: hex }} />
                <View className="p-2">
                  <Text className="font-inter-500 text-body-sm text-dark-900">{name}</Text>
                  <Text className="font-sans text-caption text-dark-700">{hex}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Tipografía">
          <View className="gap-4 rounded-lg border border-divider bg-surface p-6 shadow-card">
            <Text className="font-inter-700 text-display text-dark-900">Display</Text>
            <Text className="font-inter-600 text-h2 text-dark-900">Heading H2</Text>
            <Text className="font-inter-600 text-h3 text-dark-900">Subheading H3</Text>
            <Text className="font-inter-500 text-h4 text-dark-900">Section H4</Text>
            <Text className="font-sans text-body text-dark-900">Body regular</Text>
            <Text className="font-sans text-body-sm text-dark-700">Body small</Text>
            <Text className="font-sans text-caption text-dark-700">Caption</Text>
          </View>
        </Section>

        <Section title="Botones">
          <View className="flex flex-row flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Eliminar</Button>
            <Button variant="ghost">Ghost</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </View>
        </Section>

        <Section title="Inputs">
          <View className="gap-4">
            <View className="gap-2">
              <Label>Nombre</Label>
              <Input placeholder="Juan Pérez" />
            </View>
            <View className="gap-2">
              <Label>Email</Label>
              <InputGroup left={<Mail size={20} color="#6b7280" />}>
                <Input className="pl-10" keyboardType="email-address" placeholder="correo@ejemplo.com" />
              </InputGroup>
            </View>
            <View className="gap-2">
              <Label>Buscar</Label>
              <InputGroup left={<Search size={20} color="#6b7280" />}>
                <Input className="pl-10" placeholder="Buscar..." />
              </InputGroup>
            </View>
            <View className="gap-2">
              <Label>Notas</Label>
              <Textarea placeholder="Texto multilinea..." />
            </View>
            <View className="gap-2">
              <Label>Categoría</Label>
              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegí categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">Categoría A</SelectItem>
                  <SelectItem value="b">Categoría B</SelectItem>
                </SelectContent>
              </Select>
            </View>
            <View className="flex flex-row items-center gap-2">
              <Checkbox checked={catA} onCheckedChange={setCatA} />
              <Text className="font-sans text-body-sm text-dark-900">Categoría A</Text>
            </View>
            <View className="flex flex-row items-center gap-2">
              <Checkbox checked={catB} onCheckedChange={setCatB} />
              <Text className="font-sans text-body-sm text-dark-900">Categoría B</Text>
            </View>
            <View className="flex flex-row items-center justify-between">
              <Label>Notificaciones</Label>
              <Switch value={notif} onValueChange={setNotif} />
            </View>
            <View className="gap-2">
              <Label>Formato</Label>
              <RadioGroup value={format} onValueChange={setFormat}>
                <RadioGroupItem value="directa">Eliminación directa</RadioGroupItem>
                <RadioGroupItem value="grupos">Fase de grupos</RadioGroupItem>
              </RadioGroup>
            </View>
          </View>
        </Section>

        <Section title="Cards y badges">
          <View className="gap-4">
            <Card>
              <CardHeader>
                <View className="flex flex-row items-center justify-between">
                  <Badge variant="primary">Activo</Badge>
                  <Trophy size={24} color="#2A2536" />
                </View>
                <CardTitle>Torneo de Verano</CardTitle>
                <CardDescription>Masculino · Intermedio</CardDescription>
              </CardHeader>
              <CardContent className="gap-2">
                <View className="flex flex-row items-center gap-2">
                  <Calendar size={16} color="#2A2536" />
                  <Text className="font-sans text-body-sm text-dark-700">15 - 22 Marzo 2026</Text>
                </View>
                <Button className="mt-2 w-full">Ver detalles</Button>
              </CardContent>
            </Card>
            <View className="flex flex-row flex-wrap gap-2">
              <Badge variant="primary">Activo</Badge>
              <Badge variant="neutral">Inscripciones</Badge>
              <Badge variant="success">OK</Badge>
              <Badge variant="destructive">Error</Badge>
            </View>
          </View>
        </Section>

        <Section title="Iconos">
          <View className="flex flex-row flex-wrap gap-4">
            <Trophy size={28} color="#2A2536" />
            <Users size={28} color="#2A2536" />
            <Calendar size={28} color="#2A2536" />
            <Bell size={28} color="#2A2536" />
            <MapPin size={28} color="#2A2536" />
          </View>
        </Section>

        <Section title="Tabla (demo)">
          <Card>
            <CardHeader>
              <CardTitle className="text-h4">Partidos</CardTitle>
              <CardDescription>Ejemplo simple con filas flex.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <View>
                  <TableCaption>Fixture de ejemplo</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cancha</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>15 Mar</TableCell>
                      <TableCell>1</TableCell>
                      <TableCell>Finalizado</TableCell>
                    </TableRow>
                  </TableBody>
                </View>
              </Table>
            </CardContent>
            <CardFooter>
              <Text className="font-sans text-caption text-dark-700">Padel Check · mobile</Text>
            </CardFooter>
          </Card>
        </Section>
      </View>
    </ScrollView>
  )
}
