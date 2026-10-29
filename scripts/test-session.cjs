const { mkdtempSync, writeFileSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const ts = require('typescript')

const directory = mkdtempSync(path.join(tmpdir(), 'padelcheck-session-'))
try {
  const source = readFileSync(path.join(__dirname, '../src/features/auth/access-destination.ts'), 'utf8')
  const result = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  })
  const compiled = path.join(directory, 'access-destination.cjs')
  writeFileSync(compiled, result.outputText)
  const testFile = path.join(__dirname, '../tests/access-destination.test.cjs')
  const run = spawnSync(process.execPath, ['--test', testFile], {
    stdio: 'inherit',
    env: { ...process.env, SESSION_TEST_MODULE: compiled },
  })
  if (run.error) throw run.error
  process.exitCode = run.status ?? 1
} finally {
  rmSync(directory, { recursive: true, force: true })
}
