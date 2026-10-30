const {test}=require('node:test')
const assert=require('node:assert/strict')
const {parseCatalog,parsePolicy,example}=require(process.env.CATEGORY_POLICY_TEST_MODULE)
const catalog=()=>Array.from({length:8},(_,i)=>({id:'level-'+(i+1),code:'C'+(i+1),name:String(i+1),rankOrder:i+1}))
test('catalog preserves canonical IDs and returns an ordered copy',()=>{
 const input=catalog().reverse();const parsed=parseCatalog(input)
 assert.deepEqual(parsed.map(c=>c.id),catalog().map(c=>c.id))
 assert.equal(input[0].rankOrder,8)
})
test('empty, incomplete, duplicate or malformed catalog cannot become fictional categories',()=>{
 for(const value of [[],null,{},catalog().slice(1),[...catalog(),catalog()[0]]])assert.throws(()=>parseCatalog(value))
 const duplicate=catalog();duplicate[1].rankOrder=1;assert.throws(()=>parseCatalog(duplicate))
 const badName=catalog();badName[0].name=null;assert.throws(()=>parseCatalog(badName))
 const duplicateId=catalog();duplicateId[1].id=duplicateId[0].id;assert.throws(()=>parseCatalog(duplicateId))
})
test('a policy response from a different club is not accepted',()=>{
 assert.throws(()=>parsePolicy({clubId:'other',allowedHigherCategoriesCount:2},'current'))
})
test('policy accepts both boundaries and rejects coercion and out of range responses',()=>{
 for(const count of [0,7])assert.equal(parsePolicy({clubId:'club',allowedHigherCategoriesCount:count},'club').allowedHigherCategoriesCount,count)
 for(const count of [-1,8,2.5,'2',null,undefined])assert.throws(()=>parsePolicy({clubId:'club',allowedHigherCategoriesCount:count},'club'))
})
test('example uses available catalog values and never crosses its strongest boundary',()=>{
 assert.equal(example(catalog(),0),'Ejemplo en Simple: un jugador de 7ma puede jugar en 7.')
 assert.match(example(catalog(),2),/7, 6 o 5/)
 assert.equal(example(catalog(),7),'Ejemplo en Simple: un jugador de 7ma puede jugar en 7, 6, 5, 4, 3, 2 o 1.')
})
