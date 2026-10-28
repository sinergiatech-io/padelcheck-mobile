import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useEnrollmentModal } from '@/features/events/context/EnrollmentModalContext'
import {
  CATEGORY_ENROLL_FAB_BOTTOM_GAP,
  CATEGORY_ENROLL_FAB_HEIGHT,
  CATEGORY_ENROLL_FAB_WIDTH,
} from './category-enroll-fab.constants'

type CategoryEnrollFabProps = {
  eventId: string
  categoryId: string
}

/**
 * CTA flotante centrado sobre el scroll (Figma 378:6058).
 * Sin barra de footer: el contenido pasa por detrás con padding reservado al final.
 */
export function CategoryEnrollFab(_props: CategoryEnrollFabProps) {
  const { openCreate } = useEnrollmentModal()

  return (
    <View
      pointerEvents="box-none"
      style={[styles.anchor, { bottom: CATEGORY_ENROLL_FAB_BOTTOM_GAP }]}
    >
      <Pressable style={styles.button} onPress={openCreate}>
        <View pointerEvents="none" style={styles.insetShadow} />
        <Text className="font-sans text-body-sm font-medium text-dark-900">Inscribirse</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  button: {
    width: CATEGORY_ENROLL_FAB_WIDTH,
    maxWidth: '100%',
    height: CATEGORY_ENROLL_FAB_HEIGHT,
    borderRadius: 8,
    backgroundColor: '#C9CF38',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  insetShadow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.16)',
  },
})
