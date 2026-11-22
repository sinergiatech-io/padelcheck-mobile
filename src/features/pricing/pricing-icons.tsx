import Svg, { Path } from 'react-native-svg'
import type { LimitKey } from './pricing-model'

type IconProps = { size?: number; color?: string }

/* Same outline glyphs as padelcheck-fe /pricing (KAN-141), drawn for the KAN-140 frames. */
const PATHS: Record<Exclude<LimitKey, 'MAX_ACTIVE_TOURNAMENTS'>, string> = {
  MAX_ENTRIES_PER_EVENT: 'M9 11a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 9 11Zm-6 8.5v-.75A4.75 4.75 0 0 1 7.75 14h2.5A4.75 4.75 0 0 1 15 18.75v.75M15.5 4.6a3.25 3.25 0 0 1 0 6.3M17.5 14.2a4.75 4.75 0 0 1 3.5 4.55v.75',
  MAX_DIVISIONS_PER_EVENT: 'M5 5h5v4H5zM5 15h5v4H5zM10 7h3.5v10H10M13.5 12H19m-2.5-2.5L19 12l-2.5 2.5',
  MAX_STAFF_USERS: 'M12 11.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5ZM5 20v-.75A5.25 5.25 0 0 1 10.25 14h3.5A5.25 5.25 0 0 1 19 19.25V20',
}

export function LimitGlyph({ limit, size = 22, color = '#E7E7E8' }: IconProps & { limit: Exclude<LimitKey, 'MAX_ACTIVE_TOURNAMENTS'> }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={PATHS[limit]} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function CheckGlyph({ size = 18, color = '#FAFAEB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="m3.5 8.5 3 3 6-7" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function CrossGlyph({ size = 18, color = '#B6B5B7' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="m4.5 4.5 7 7m0-7-7 7" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

export function MissingGlyph({ size = 18, color = '#B6B5B7' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M4 8h8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

export function MenuGlyph({ size = 24, color = '#FAFAEB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16M4 12h16M4 17h16" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

export function CloseGlyph({ size = 24, color = '#FAFAEB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m6 6 12 12M18 6 6 18" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}
