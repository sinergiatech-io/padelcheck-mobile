import { StartupReady } from '@/features/startup/StartupReady'
import { PricingScreen } from '@/features/pricing/PricingScreen'

/** Public plan comparison (KAN-141). Readable without a session; GET /plans is public. */
export default function PricingRoute() {
  return <StartupReady><PricingScreen /></StartupReady>
}
