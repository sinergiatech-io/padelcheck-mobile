const { mkdtempSync, writeFileSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const ts = require('typescript')

const directory = mkdtempSync(path.join(tmpdir(), 'padelcheck-plan-'))
try {
  const source = readFileSync(path.join(__dirname, '../src/features/club/plan/plan-model.ts'), 'utf8')
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } })
  const compiled = path.join(directory, 'plan-model.cjs')
  writeFileSync(compiled, output.outputText)
  const loadSource = readFileSync(path.join(__dirname, '../src/features/club/plan/plan-load.ts'), 'utf8')
  const loadOutput = ts.transpileModule(loadSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } })
  const loadCompiled = path.join(directory, 'plan-load.cjs')
  writeFileSync(loadCompiled, loadOutput.outputText.replace("require(\"./plan-model\")", "require(\"./plan-model.cjs\")"))
  const linkSource = readFileSync(path.join(__dirname, '../src/features/club/plan/payment-return-link.ts'), 'utf8')
  const linkCompiled = path.join(directory, 'payment-return-link.cjs')
  writeFileSync(linkCompiled, ts.transpileModule(linkSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText)
  const result = spawnSync(process.execPath, ['--test', path.join(__dirname, '../tests/plan-model.test.cjs')], {
    stdio: 'inherit',
    env: { ...process.env, PLAN_TEST_MODULE: compiled, PLAN_LOAD_TEST_MODULE: loadCompiled, PAYMENT_RETURN_TEST_MODULE: linkCompiled },
  })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  rmSync(directory, { recursive: true, force: true })
}
