import * as Location from 'expo-location'
import { PositionError, type PositionProvider } from './registration-location'

export const nativePosition: PositionProvider = {
  async permission() {
    const permission = await Location.getForegroundPermissionsAsync()
    return permission.granted ? 'granted' : permission.canAskAgain ? 'prompt' : 'denied'
  },
  async position(signal) {
    let permission = await Location.getForegroundPermissionsAsync()
    if (signal.aborted) throw new PositionError('unavailable')
    if (!permission.granted && permission.canAskAgain) permission = await Location.requestForegroundPermissionsAsync()
    if (!permission.granted) throw new PositionError('denied')
    if (signal.aborted || !await Location.hasServicesEnabledAsync()) throw new PositionError('unavailable')
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: false })
    if (signal.aborted) throw new PositionError('unavailable')
    return { latitude: position.coords.latitude, longitude: position.coords.longitude }
  },
}
