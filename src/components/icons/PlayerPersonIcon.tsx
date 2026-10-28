import Svg, { Path } from 'react-native-svg'

const PERSON_PATH =
  'M10 10C11.8409 10 13.3333 8.50762 13.3333 6.66667C13.3333 4.82572 11.8409 3.33333 10 3.33333C8.15905 3.33333 6.66667 4.82572 6.66667 6.66667C6.66667 8.50762 8.15905 10 10 10ZM10 11.6667C7.775 11.6667 3.33333 12.7833 3.33333 15V16.6667H16.6667V15C16.6667 12.7833 12.225 11.6667 10 11.6667Z'

type PlayerPersonIconProps = {
  size?: number
  color?: string
}

export function PlayerPersonIcon({ size = 20, color = '#C9CF38' }: PlayerPersonIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d={PERSON_PATH} fill={color} />
    </Svg>
  )
}
