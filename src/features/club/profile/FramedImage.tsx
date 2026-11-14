import { useState } from 'react'
import { Image, View } from 'react-native'
import { framedTransform, type ImageFraming } from './club-profile-model'

/** Render the saved framing consistently in the editor and the published profile. */
export function FramedImage({ uri, framingValue, mode, style }: {
  uri: string
  framingValue: ImageFraming
  mode: 'contain' | 'cover'
  style: object
}) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  return (
    <View style={[style, { overflow: 'hidden' }]} onLayout={e => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {size.width > 0 && (
        <Image source={{ uri }} resizeMode={mode} style={{
          width: size.width,
          height: size.height,
          transform: [...framedTransform(framingValue, size.width, size.height)],
        }} />
      )}
    </View>
  )
}
