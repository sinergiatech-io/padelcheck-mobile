import { Redirect } from 'expo-router'

/** The old `/register` form was a mock. Club registration now lives in the wizard. */
export default function RegisterScreen() {
  return <Redirect href="/register/club" />
}
