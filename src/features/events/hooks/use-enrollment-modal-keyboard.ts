import { useEffect, useRef, useState } from 'react'
import { Dimensions, Keyboard, Platform, StatusBar as RNStatusBar, type KeyboardEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/** Altura de la fila del header de evento (padding + botón + padding) — ver EventMobileHeader. */
const EVENT_MOBILE_HEADER_ROW_HEIGHT = 64
const MODAL_GAP_BELOW_HEADER = 8
const MODAL_BOTTOM_GAP = 16

export function useEnrollmentModalKeyboard(isOpen: boolean, modalHeight: number) {
  const insets = useSafeAreaInsets()
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const wasOpenRef = useRef(isOpen)

  const statusBarFallback = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0
  const headerBottom = Math.max(insets.top, statusBarFallback) + EVENT_MOBILE_HEADER_ROW_HEIGHT
  const keyboardOpen = keyboardHeight > 0
  const windowHeight = Dimensions.get('window').height
  const keyboardPaddingTop = headerBottom + MODAL_GAP_BELOW_HEADER
  const centeredPaddingTop =
    modalHeight > 0 ? Math.max(keyboardPaddingTop, (windowHeight - modalHeight) / 2) : 0
  const overlayPaddingTop = keyboardOpen ? keyboardPaddingTop : centeredPaddingTop
  const maxModalHeight = keyboardOpen
    ? windowHeight - overlayPaddingTop - keyboardHeight - MODAL_BOTTOM_GAP
    : undefined

  useEffect(() => {
    if (!isOpen) {
      setKeyboardHeight(0)
      return
    }

    const onShow = (event: KeyboardEvent) => setKeyboardHeight(event.endCoordinates.height)
    const onHide = () => setKeyboardHeight(0)

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const showSub = Keyboard.addListener(showEvent, onShow)
    const hideSub = Keyboard.addListener(hideEvent, onHide)

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [isOpen])

  useEffect(() => {
    if (!wasOpenRef.current || isOpen) {
      wasOpenRef.current = isOpen
      return
    }
    wasOpenRef.current = isOpen
    Keyboard.dismiss()
  }, [isOpen])

  return { keyboardOpen, overlayPaddingTop, maxModalHeight }
}
