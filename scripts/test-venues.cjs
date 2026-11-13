const { mkdtempSync, writeFileSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const ts = require('typescript')
const directory = mkdtempSync(path.join(tmpdir(), 'padelcheck-venues-'))
try {
  const source = readFileSync(path.join(__dirname, '../src/features/club/venues/venues-model.ts'), 'utf8')
  const compiled = path.join(directory, 'venues.cjs')
  writeFileSync(compiled, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText)
  const result = spawnSync(process.execPath, ['--test', path.join(__dirname, '../tests/venues.test.cjs')], { stdio: 'inherit', env: { ...process.env, VENUES_TEST_MODULE: compiled } })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally { rmSync(directory, { recursive: true, force: true }) }
