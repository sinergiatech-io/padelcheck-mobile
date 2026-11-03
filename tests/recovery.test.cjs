const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs')
const { RecoveryMachine, validateRecovery } = require(path.join(process.env.RECOVERY_TEST_DIR, 'recovery-machine.cjs'))
const fields = { email: '', password: '', confirmPassword: '' }
const fixtureProof = () => require('node:crypto').randomBytes(32).toString('base64url')
function deferred() { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b }); return { promise, resolve, reject } }
function setup(token, handler = () => undefined, cleanup = () => true, now) {
  const calls=[]; const transport={ post: async (url,body,options) => { calls.push({url,body,options}); return handler(url,body) } }
  return { machine: new RecoveryMachine(transport, 'WEB', token, cleanup, now), calls }
}
test('required email and syntax never submit; trimmed address and platform only', async () => {
  const { machine:m, calls }=setup();await m.run();assert.equal(calls.length,0);assert.equal(m.state.errors.email,'El email es obligatorio');
  m.setField('email','bad');await m.run();assert.equal(calls.length,0);assert.equal(m.state.errors.email,'Email inválido');
  m.setField('email','  test@example.invalid  ');await m.run();assert.equal(m.state.stage,'sent');assert.deepEqual(calls[0].body,{email:'test@example.invalid',platform:'WEB'});assert.equal(m.state.fields.email,'');
})
test('minimum eight, required confirmation, equality; whitespace remains part of password', () => {
  assert.deepEqual(validateRecovery(fields,true),{password:'La contraseña es obligatoria',confirmPassword:'Confirmá tu contraseña'});
  assert.equal(validateRecovery({...fields,password:'short',confirmPassword:'other'},true).password,'Usá al menos 8 caracteres');
  assert.equal(validateRecovery({...fields,password:'12345678',confirmPassword:'other'},true).confirmPassword,'Las contraseñas no coinciden');
  assert.deepEqual(validateRecovery({...fields,password:'        ',confirmPassword:'        '},true),{});
})
for(const action of ['CREATE_PASSWORD','RESET_PASSWORD'])test('server capability '+action+' and explicit Save, cleanup before success',async()=>{
  let cleaned=0;const proof=fixtureProof();const {machine:m,calls}=setup(proof, url=>url.endsWith('inspect')?{passwordAction:action}:undefined,()=>{cleaned++;return true});
  await m.run();assert.equal(m.state.stage,'password');assert.equal(m.state.passwordAction,action);assert.equal(calls.length,1);assert.equal(cleaned,0);
  m.setField('password',' 12345678 ');m.setField('confirmPassword',' 12345678 ');await m.run();assert.equal(cleaned,1);assert.equal(m.state.stage,'success');
  assert.equal(calls[1].body.password,' 12345678 ');assert.equal(calls[1].body.token,proof);assert.equal(m.state.fields.password,'');assert.equal(calls[1].options.cache,'no-store');await m.run();assert.equal(calls.length,2);
})
test('absent, blank, oversized proof unavailable without a request',async()=>{
  for(const token of ['', ' ', 'x'.repeat(101)]){const {machine,calls}=setup(token);await machine.run();assert.equal(machine.state.stage,'invalid');assert.equal(calls.length,0)}
})
for(const reason of ['invalid','expired','used','replaced'])test(reason+' links share server rejection on inspect and Save',async()=>{
  for(const atSave of [false,true]){const {machine:m}=setup(fixtureProof(),url=>{
    if(atSave&&url.endsWith('inspect'))return {passwordAction:'RESET_PASSWORD'};
    throw {status:400,code:'PASSWORD_RECOVERY_INVALID_LINK'};
  });await m.run();if(atSave){m.setField('password','12345678');m.setField('confirmPassword','12345678');await m.run()}
  assert.equal(m.state.stage,'invalid');assert.equal(m.state.fields.password,'');}
})
test('unknown/missing server action fails closed and permits inspection retry',async()=>{
  const {machine:m}=setup(fixtureProof(),()=>({passwordAction:'OTHER'}));await m.run();assert.equal(m.state.stage,'inspectError');await m.run();assert.equal(m.state.stage,'inspectError');
})
test('network/503 remain retryable, never imply an invalid link; Save preserves draft',async()=>{
  for(const failure of [{status:0},{status:503}]){let fail=true;const {machine:m}=setup(fixtureProof(),url=>{if(fail)throw failure;return url.endsWith('inspect')?{passwordAction:'RESET_PASSWORD'}:undefined});
    await m.run();assert.equal(m.state.stage,'inspectError');fail=false;await m.run();assert.equal(m.state.stage,'password');
    m.setField('password','12345678');m.setField('confirmPassword','12345678');fail=true;await m.run();assert.equal(m.state.stage,'password');assert.equal(m.state.fields.password,'12345678');
    fail=false;await m.run();assert.equal(m.state.stage,'success');}
})
test('429 uses the real Retry-After deadline and blocks duplicate/premature retries',async()=>{
  let now=1000,fail=true;const {machine:m,calls}=setup(undefined,()=>{if(fail)throw {status:429,retryAfterMs:60000}},()=>true,()=>now);
  m.setField('email','test@example.invalid');await m.run();assert.equal(m.state.retryAt,61000);await m.run();assert.equal(calls.length,1);
  now=61000;fail=false;await m.run();assert.equal(m.state.stage,'sent');assert.equal(calls.length,2);
})
test('a single flight, cancellation aborts and ignores late responses after navigation',async()=>{
  const pending=deferred();const {machine:m,calls}=setup(fixtureProof(),()=>pending.promise);const run=m.run();await m.run();assert.equal(calls.length,1);assert.equal(m.state.busy,true);
  m.cancel();assert.equal(calls[0].options.signal.aborted,true);pending.resolve({passwordAction:'RESET_PASSWORD'});await run;assert.notEqual(m.state.stage,'password');
})
test('cleanup failure does not report success; retry only cleanup, never resubmits consumed proof',async()=>{
  let cleanup=false;const {machine:m,calls}=setup(fixtureProof(),()=>({passwordAction:'RESET_PASSWORD'}),()=>cleanup);
  await m.run();m.setField('password','12345678');m.setField('confirmPassword','12345678');await m.run();assert.equal(m.state.stage,'cleanup');assert.equal(m.state.fields.password,'');assert.ok(m.state.notice);
  cleanup=true;await m.run();assert.equal(m.state.stage,'success');assert.equal(calls.length,2);
})
const nativeLink = path.join(process.env.RECOVERY_TEST_DIR,'recovery-link.cjs')
if(fs.existsSync(nativeLink))test('installed-app cold/warm links strip proof before router; each arrival gets its own instance',()=>{
  const link=require(nativeLink);const first=fixtureProof(),second=fixtureProof();
  const a=link.redirectRecoveryLink('padelcheck://reset-password?token='+first);assert.ok(!a.includes(first));assert.equal(link.readRecoveryLink().token,first);
  const b=link.redirectRecoveryLink('padelcheck://reset-password?token='+second);assert.notEqual(a,b);assert.equal(link.readRecoveryLink().token,second);
  assert.equal(link.redirectRecoveryLink('padelcheck://events'),'padelcheck://events');link.clearRecoveryLink();assert.equal(link.readRecoveryLink(),undefined);
  link.redirectRecoveryLink('padelcheck://reset-password?token=a&token=b');assert.equal(link.readRecoveryLink().token,'');
})
