const { test } = require('node:test')
const assert = require('node:assert/strict')

const {
  resolveAccessDestination,
  acceptedReturnPath,
  guardRedirect,
} = require(process.env.SESSION_TEST_MODULE)

const player = { activity: 'PLAYER', playerId: 'p1' }

test('only club activity may reach the category policy editor on both platforms', () => {
  for (const platform of ['web', 'native']) {
    assert.equal(guardRedirect(platform, { kind: 'club', clubId: 'c1' }, '/club/settings/categories'), null)
    assert.equal(guardRedirect(platform, { kind: 'player' }, '/club/settings/categories'), platform === 'web' ? '/app/events' : '/events')
    assert.equal(guardRedirect(platform, { kind: 'club', clubId: 'c1' }, '/club/settings/other'), platform === 'web' ? '/app' : '/dashboard')
  }
})
const club = (status = 'UNKNOWN', extra = {}) => ({
  activity: 'CLUB',
  clubId: 'c1',
  initialSetupStatus: status,
  clubStatus: 'ACTIVE',
  ...extra,
})

test('a single player enters the player root and ignores legacy fields', () => {
  assert.deepEqual(resolveAccessDestination([player]), { kind: 'player' })
  assert.equal(acceptedReturnPath('web', { kind: 'player' }, '/app/events'), '/app/events')
  assert.equal(acceptedReturnPath('web', { kind: 'player' }, '/app/events/1'), '/app/events')
  assert.equal(acceptedReturnPath('native', { kind: 'player' }, 'https://evil.test'), '/events')
})

test('a single club with UNKNOWN or INACTIVE enters the club shell', () => {
  assert.deepEqual(resolveAccessDestination([club('UNKNOWN', { clubStatus: 'INACTIVE' })]), {
    kind: 'club',
    clubId: 'c1',
  })
  assert.equal(acceptedReturnPath('web', { kind: 'club', clubId: 'c1' }, '/app'), '/app')
  assert.equal(guardRedirect('native', { kind: 'club', clubId: 'c1' }, '/events'), '/dashboard')
})

test('PENDING club setup is not the same message path as several activities or an empty context', () => {
  assert.equal(resolveAccessDestination([club('PENDING')]).reason, 'pending-setup')
  assert.equal(
    resolveAccessDestination([player, club('UNKNOWN')]).reason,
    'multiple-activities',
  )
  assert.equal(
    resolveAccessDestination([club('UNKNOWN'), { ...club('ACTIVE'), clubId: 'c2' }]).reason,
    'multiple-activities',
  )
  assert.equal(resolveAccessDestination([]).reason, 'unavailable')
  assert.equal(resolveAccessDestination([{ activity: 'CLUB' }]).reason, 'unavailable')
  assert.equal(resolveAccessDestination(undefined).reason, 'unavailable')
})

test('an activeClub-shaped payload without accessContexts does not choose a destination', () => {
  assert.equal(resolveAccessDestination(undefined).kind, 'continue')
})

test('player guards keep the player shell and send the club root back', () => {
  assert.equal(guardRedirect('web', { kind: 'player' }, '/app/events/abc'), null)
  assert.equal(guardRedirect('web', { kind: 'player' }, '/app'), '/app/events')
  assert.equal(guardRedirect('web', { kind: 'continue', reason: 'unavailable' }, '/app/events'), '/auth/continue')
})
