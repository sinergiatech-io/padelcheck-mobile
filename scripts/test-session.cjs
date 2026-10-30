const { mkdtempSync, writeFileSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const ts = require('typescript')

const directory = mkdtempSync(path.join(tmpdir(), 'padelcheck-session-'))

function compile(sourceName, outName) {
  const source = readFileSync(path.join(__dirname, '../src/features/auth', sourceName), 'utf8')
  const result = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  })
  const compiled = path.join(directory, outName)
  writeFileSync(compiled, result.outputText)
  return compiled
}

function run(testName, envName, modulePath) {
  const runResult = spawnSync(process.execPath, ['--test', path.join(__dirname, '../tests', testName)], {
    stdio: 'inherit',
    env: { ...process.env, [envName]: modulePath },
  })
  if (runResult.error) throw runResult.error
  return runResult.status ?? 1
}

try {
  const access = compile('access-destination.ts', 'access-destination.cjs')
  const check = compile('session-check.ts', 'session-check.cjs')
  const accessStatus = run('access-destination.test.cjs', 'SESSION_TEST_MODULE', access)
  const checkStatus = run('session-check.test.cjs', 'SESSION_CHECK_MODULE', check)
  process.exitCode = accessStatus === 0 && checkStatus === 0 ? 0 : accessStatus || checkStatus
} finally {
  rmSync(directory, { recursive: true, force: true })
}
