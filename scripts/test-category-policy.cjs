const {mkdtempSync,writeFileSync,readFileSync,rmSync}=require('node:fs')
const {tmpdir}=require('node:os')
const path=require('node:path')
const {spawnSync}=require('node:child_process')
const ts=require('typescript')
const directory=mkdtempSync(path.join(tmpdir(),'padelcheck-category-policy-'))
try{
 const source=readFileSync(path.join(__dirname,'../src/features/club/category-policy/category-policy.ts'),'utf8')
 const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}})
 const compiled=path.join(directory,'policy.cjs');writeFileSync(compiled,output.outputText)
 const result=spawnSync(process.execPath,['--test',path.join(__dirname,'../tests/category-policy.test.cjs')],{stdio:'inherit',env:{...process.env,CATEGORY_POLICY_TEST_MODULE:compiled}})
 if(result.error)throw result.error
 process.exitCode=result.status??1
}finally{rmSync(directory,{recursive:true,force:true})}
