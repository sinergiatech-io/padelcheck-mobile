import { redirectGoogleEmailLink } from '@/features/auth/google-email-link'
import { redirectRecoveryLink } from '@/features/auth/recovery-link'
import { redirectPaymentReturn } from '@/features/club/plan/payment-return-link'

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return redirectGoogleEmailLink(redirectRecoveryLink(redirectPaymentReturn(path)))
}
