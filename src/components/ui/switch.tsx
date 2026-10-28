import * as React from 'react'
import { Switch as RNSwitch, type SwitchProps } from 'react-native'

const trackFalse = '#E6E6E6'
const trackTrue = '#C9CF38'
const thumb = '#FFFFFF'

const Switch = React.forwardRef<React.ElementRef<typeof RNSwitch>, SwitchProps>((props, ref) => (
  <RNSwitch
    ref={ref}
    trackColor={{ false: trackFalse, true: trackTrue }}
    thumbColor={thumb}
    ios_backgroundColor={trackFalse}
    {...props}
  />
))
Switch.displayName = 'Switch'

export { Switch }
