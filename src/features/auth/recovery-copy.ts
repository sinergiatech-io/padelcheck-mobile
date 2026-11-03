import type { RecoveryState } from './recovery-machine'
export function recoveryCopy(state: RecoveryState) {
  const first = state.passwordAction === 'CREATE_PASSWORD'
  switch (state.stage) {
    case 'request': return { title: 'Recuperá el acceso a tu cuenta', detail: 'Ingresá tu email. Si tiene una cuenta, te enviaremos un enlace de un solo uso para crear o restablecer tu contraseña.', help: 'Ingresar tu email no habilita el acceso. También sirve si hasta ahora entrabas solo con Google.', action: 'Enviar enlace' }
    case 'sent': return { title: 'Revisá tu correo', detail: 'Si existe una cuenta con ese email, te enviaremos un enlace para cambiar tu contraseña.', action: '' }
    case 'password': return { title: first ? 'Creá tu contraseña de PadelCheck' : 'Creá una nueva contraseña', detail: first ? 'Tu enlace fue verificado. Vas a poder ingresar con esta contraseña o seguir usando Google.' : 'Tu enlace fue verificado. La nueva contraseña reemplazará la anterior; Google seguirá disponible si ya lo habías vinculado.', help: 'Usá al menos 8 caracteres.', action: 'Guardar contraseña' }
    case 'invalid': return { title: 'Este enlace ya no está disponible', detail: 'Solicitá uno nuevo para cambiar tu contraseña', action: 'Solicitar otro enlace' }
    case 'success': return { title: 'Tu contraseña está lista', detail: '', action: 'Ir al acceso' }
    case 'cleanup': return { title: 'Tu contraseña se guardó', detail: 'Cerrá la sesión anterior en este dispositivo para volver al acceso.', action: 'Reintentar' }
    default: return { title: 'Verificá tu enlace', detail: state.stage === 'inspect' ? 'Verificando enlace…' : 'No pudimos verificar el enlace. Intentá de nuevo.', action: 'Reintentar' }
  }
}
