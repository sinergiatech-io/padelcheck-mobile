const { mkdtempSync, writeFileSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const ts = require('typescript')
const directory = mkdtempSync(path.join(tmpdir(), 'padelcheck-startup-'))
function compile(sourceName, outputName) {
  const source = readFileSync(path.join(__dirname, '..', sourceName), 'utf8')
  const result = ts.transpileModule(source, { compilerOptions:{ target:ts.ScriptTarget.ES2020, module:ts.ModuleKind.CommonJS } })
  const output = path.join(directory, outputName)
  writeFileSync(output, result.outputText)
  return output
}
try {
  const startup = compile('src/features/startup/startup-state.ts', 'startup.cjs')
  const storage = compile('src/lib/storage-deadline.ts', 'storage.cjs')
  const result = spawnSync(process.execPath, ['--test', path.join(__dirname, '../tests/startup.test.cjs')], {
    stdio:'inherit', env:{ ...process.env, STARTUP_TEST_MODULE:startup, STORAGE_TEST_MODULE:storage },
  })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally { rmSync(directory, { recursive:true, force:true }) }
