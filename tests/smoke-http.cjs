const assert = require('node:assert/strict')
const path = require('node:path')
const { createApiClient, ApiError } = require(path.join(process.env.HTTP_TEST_DIRECTORY, 'http-client.cjs'))
const { resolveApiBase } = require(path.join(process.env.HTTP_TEST_DIRECTORY, 'api-config.cjs'))

async function smoke() {
  const baseUrl = resolveApiBase(process.env.HTTP_SMOKE_BASE_URL || 'https://padelcheck-api.onrender.com/api', false, '')
  const client = createApiClient({ baseUrl, getToken: () => null })
  // Operational smoke deadline only. No product/client default is introduced.
  const health = await client.get('/actuator/health', { timeoutMs: 240000 })
  assert.equal(health.status, 'UP')
  console.log('GET /actuator/health: UP')
  await assert.rejects(client.get('/auth/me', { timeoutMs: 30000 }), error => error instanceof ApiError && error.status === 401)
  console.log('GET /auth/me without token: 401 preserved')
}
smoke().catch(error => { console.error('HTTP smoke failed:', error.kind || error.name, 'status:', error.status ?? 'unavailable'); process.exitCode = 1 })
