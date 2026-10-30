const { test } = require('node:test')
const assert = require('node:assert/strict')

const { SESSION_CHECK_TIMEOUT_MS, decideSessionCheck } = require(process.env.SESSION_CHECK_MODULE)

test('GET /auth/me session check has a finite 10 second deadline', () => {
  assert.equal(SESSION_CHECK_TIMEOUT_MS, 10_000)
  assert.ok(SESSION_CHECK_TIMEOUT_MS > 0)
  assert.ok(SESSION_CHECK_TIMEOUT_MS < 2_147_483_648)
})

test('a current successful check may restore access', () => {
  assert.equal(decideSessionCheck({ attempt: 4, current: 4, error: null }), 'ready')
})

test('a current 401 retires the session, including a body that timed out after the status', () => {
  assert.equal(decideSessionCheck({ attempt: 4, current: 4, error: { status: 401 } }), 'expired')
})

test('timeout, network and 5xx end the check as unverified and do not expire the session', () => {
  for (const error of [{ status: 0 }, { status: 500 }, { status: 502 }, { status: 503 }]) {
    assert.equal(decideSessionCheck({ attempt: 4, current: 4, error }), 'unverified')
  }
})

test('a late success, 401 or timeout after exit or a newer attempt does not restore access', () => {
  for (const error of [null, { status: 401 }, { status: 0 }, { status: 500 }]) {
    assert.equal(decideSessionCheck({ attempt: 4, current: 5, error }), 'ignore')
  }
})
