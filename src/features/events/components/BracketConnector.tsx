import Svg, { Path } from 'react-native-svg'

type BracketConnectorProps = {
  height: number
  /** Centro Y de cada brazo, relativo al top del par. */
  arms: number[]
}

/** Líneas de unión entre rondas — brazos alineados al layout calculado. */
export function BracketConnector({ height, arms }: BracketConnectorProps) {
  if (arms.length < 2 || height <= 0) return null

  const width = height > 280 ? 83 : 67
  const forkX = width / 2
  const midY = (arms[0] + arms[1]) / 2

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <Path d={`M0 ${arms[0]} H${forkX} V${midY} H${width}`} stroke="#676767" strokeWidth={1} />
      <Path d={`M0 ${arms[1]} H${forkX} V${midY}`} stroke="#676767" strokeWidth={1} />
    </Svg>
  )
}
