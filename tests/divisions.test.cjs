const {test}=require('node:test')
const assert=require('node:assert/strict')
const m=require(process.env.DIVISIONS_TEST_MODULE)
const codes=['1RA','2DA','3RA','4TA','5TA','6TA','7MA','8VA']
const catalog=codes.map((code,i)=>({id:'c'+(i+1),code,name:code.toLowerCase(),rankOrder:i+1}))
const name=m.catalogNames(catalog)
const selection=(values)=>({...m.emptySelection(),...values})

test('the step 4 grid goes from 8va to 1ra and OPEN excludes numeric categories',()=>{
 assert.deepEqual(m.gridOrder(catalog).map(c=>c.name),['8va','7ma','6ta','5ta','4ta','3ra','2da','1ra'])
 assert.deepEqual(m.toggleCategory(['c6','c7'],m.OPEN),[m.OPEN])
 assert.deepEqual(m.toggleCategory([m.OPEN],'c6'),['c6'])
 assert.deepEqual(m.toggleCategory(['c6'],'c7',true),['c7'])
 assert.deepEqual(m.toggleCategory(['c6','c7'],'c6'),['c7'])
})
test('Simple with several categories creates one independent division per category',()=>{
 const writes=m.toWrites(selection({categoryIds:['c6','c7'],maxPairsText:'16',substitutesAllowed:false}))
 assert.deepEqual(writes,[
  {genderType:'MALE',maxPairs:16,substitutesAllowed:false,criterion:'SIMPLE',categoryId:'c6'},
  {genderType:'MALE',maxPairs:16,substitutesAllowed:false,criterion:'SIMPLE',categoryId:'c7'}])
 assert.equal(m.selectionSize(selection({categoryIds:['c6','c7','c8']})),3)
 assert.equal(m.selectionSize(selection({type:'SUMA',sumText:'13'})),1)
 assert.deepEqual(m.toWrites(selection({categoryIds:[m.OPEN],maxPairsText:'8',substitutesAllowed:true,genderType:'MIXED'})),
  [{genderType:'MIXED',maxPairs:8,substitutesAllowed:true,criterion:'OPEN'}])
})
test('Suma accepts integers formable from two catalog categories (2–16) only',()=>{
 assert.deepEqual(m.sumRange(catalog).min,2);assert.equal(m.sumRange(catalog).max,16)
 for(const ok of ['2','13','16',' 9 '])assert.equal(m.validSum(ok,catalog),true,ok)
 for(const bad of ['1','17','0','-4','12.5','','abc','1e1'])assert.equal(m.validSum(bad,catalog),false,bad)
 assert.equal(m.validSum('13',[]),false)
})
test('quota: empty, 0, negative or fraction are the same invalid state',()=>{
 for(const bad of ['','0','-1','2.5','1,5',' '])assert.equal(m.validMaxPairs(bad),false,bad)
 for(const ok of ['1','32',' 8 '])assert.equal(m.validMaxPairs(ok),true,ok)
})
test('a division needs criterion parameters, a valid quota and an explicit substitutes choice',()=>{
 const base={categoryIds:['c6'],maxPairsText:'8'}
 assert.equal(m.validSelection(selection(base),catalog),false)
 assert.equal(m.validSelection(selection({...base,substitutesAllowed:false}),catalog),true)
 assert.equal(m.validCriterion(selection({type:'COMBINADO',first:'c6'}),catalog),false)
 assert.equal(m.validCriterion(selection({type:'COMBINADO',first:'c7',second:'c6'}),catalog),true)
 assert.equal(m.validCriterion(selection({categoryIds:[]}),catalog),false)
})
test('labels follow the KAN-77 cards',()=>{
 const simple={criterion:'SIMPLE',genderType:'MALE',categoryId:'c6'}
 const suma={criterion:'SUMA',genderType:'MALE',sumTarget:13}
 const comb={criterion:'COMBINADO',genderType:'FEMALE',categoryId:'c6',secondCategoryId:'c7'}
 const open={criterion:'OPEN',genderType:'MIXED'}
 assert.deepEqual([simple,suma,comb,open].map(d=>m.divisionTitle(d,name)),['Caballeros · 6ta','Caballeros · Suma 13','Damas · 6ta + 7ma','Mixto · OPEN'])
 assert.deepEqual([simple,suma,comb,open].map(m.criterionLabel),['Simple','Suma 13','Combinado','OPEN'])
 assert.equal(m.selectionSummary(selection({categoryIds:['c6']}),catalog),'Simple · Caballeros 6ta')
})
test('saved divisions round-trip to the form and back without losing parameters',()=>{
 const saved={id:'d1',eventId:'e',name:'x',criterion:'COMBINADO',categoryId:'c6',categoryCode:'6TA',categoryName:'6ta',secondCategoryId:'c7',
  secondCategoryCode:'7MA',secondCategoryName:'7ma',sumTarget:null,genderType:'FEMALE',maxPairs:12,substitutesAllowed:false,status:'DRAFT',cancelledAt:null}
 const write=m.divisionWrite(saved)
 assert.deepEqual(m.toWrites(m.toSelection([write])),[write])
 assert.equal(m.divisionTitle(saved,m.savedNames(saved)),'Damas · 6ta + 7ma')
 assert.equal(m.selectionSummary(m.toSelection([write]),m.savedCatalog(saved)),'Combinado · Damas 6ta + 7ma')
})
test('plan limit: remaining quota, the 403 code distinguished from other 403s, and the KAN-149 reasons',()=>{
 const limit={key:'MAX_DIVISIONS_PER_EVENT',planCode:'FREE',eventId:null,state:'LIMITED',limit:2,used:0,remaining:2,reached:false}
 assert.equal(m.remainingQuota(limit,1),1);assert.equal(m.remainingQuota(limit,3),0)
 assert.equal(m.remainingQuota({...limit,state:'UNLIMITED',limit:null},9),null);assert.equal(m.remainingQuota(undefined,9),null)
 const planError={status:403,details:{status:403,code:'PLAN_DIVISION_LIMIT_EXCEEDED',details:{limit:2,used:1,requested:2,remaining:1}}}
 assert.equal(m.planLimitRemaining(planError),1)
 assert.equal(m.planLimitRemaining({status:403,details:{status:403,code:'AUTH_FORBIDDEN'}}),null)
 assert.equal(m.planLimitRemaining({status:409,details:{code:'PLAN_DIVISION_LIMIT_EXCEEDED'}}),null)
 assert.deepEqual(m.limitReason(2,'FREE','wizard'),{title:'Límite de divisiones',detail:'FREE permite 2 divisiones por torneo. Podés continuar con las divisiones que ya agregaste.'})
 assert.equal(m.limitReason(2,'FREE','wizard',1).detail,'FREE permite 2 divisiones por torneo. Podés agregar 1 categoría más.')
 assert.equal(m.limitReason(5,'PRO','wizard',3).detail,'PRO permite 5 divisiones por torneo. Podés agregar 3 categorías más.')
 assert.deepEqual(m.limitReason(2,'FREE','hub'),{title:'Límite de categorías',detail:'Alcanzaste las 2 categorías permitidas por tu plan en este torneo.'})
})
test('the wizard intent keeps one Idempotency-Key per payload, also across reloads, and changes it after edits',()=>{
 const data=new Map();const store={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}
 let n=0;const create=()=>'key-'+(++n)
 const first=m.intentKey(store,'club','payload-a',create)
 assert.equal(m.intentKey(store,'club','payload-a',create),first)
 assert.notEqual(m.intentKey(store,'club','payload-b',create),first)
 assert.notEqual(m.intentKey(store,'other','payload-b',create),undefined)
 m.clearIntent(store,'club');assert.equal(m.intentKey(store,'club','payload-b',create),'key-4')
 data.set('padelcheck:event-draft-intent:club','{broken');assert.equal(m.intentKey(store,'club','payload-b',create),'key-5')
 assert.equal(m.intentKey(undefined,'club','x',create),'key-6')
})
test('moving back from the review reopens the last batch instead of duplicating it',()=>{
 const plan={...m.initialPlan(),step:6,divisions:[{localId:'a',criterion:'SIMPLE',genderType:'MALE',categoryId:'c6',maxPairs:8,substitutesAllowed:true},
  {localId:'b',criterion:'SIMPLE',genderType:'MALE',categoryId:'c7',maxPairs:8,substitutesAllowed:true}],lastBatch:['a','b']}
 const resumed=m.resumePlan(plan)
 assert.deepEqual(resumed.editing,['a','b']);assert.deepEqual(resumed.selection.categoryIds,['c6','c7']);assert.equal(resumed.selection.maxPairsText,'8')
 assert.equal(m.resumePlan({...plan,lastBatch:['gone']}).editing,null)
 assert.deepEqual(m.withoutLocalId(plan.divisions[0]),{criterion:'SIMPLE',genderType:'MALE',categoryId:'c6',maxPairs:8,substitutesAllowed:true})
})

test('pull-to-refresh: repeated gestures share one request and the indicator stops on success and error',async()=>{
 const states=[];let calls=0;let release
 const refresh=m.singleFlight(()=>{calls++;return new Promise(r=>{release=r})},v=>states.push(v))
 const first=refresh();await refresh();await refresh()
 assert.equal(calls,1);release();await first
 assert.deepEqual(states,[true,false])
 const failing=m.singleFlight(()=>{calls++;return Promise.reject(new Error('500'))},v=>states.push(v))
 await failing();assert.deepEqual(states.slice(-2),[true,false])
 await failing();assert.equal(calls,3,'a later gesture retries after an error')
})
