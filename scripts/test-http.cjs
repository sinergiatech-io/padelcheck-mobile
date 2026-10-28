/* eslint-env node */
const { mkdtempSync, writeFileSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const ts = require('typescript')

// Compile the actual platform-independent transport, without loading browser or native storage.
const directory = mkdtempSync(path.join(tmpdir(), 'padelcheck-http-'))
try {
  for (const name of ['http-client', 'api-config']) {
    const source = readFileSync(path.join(__dirname, '../src/lib', `${name}.ts`), 'utf8')
    const result = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    })
    writeFileSync(path.join(directory, `${name}.cjs`), result.outputText)
  }
  const smoke = process.argv.includes('--smoke')
  const result = spawnSync(process.execPath, smoke
    ? [path.join(__dirname, '../tests/smoke-http.cjs')]
    : ['--test', path.join(__dirname, '../tests/http-client.test.cjs')], {
    stdio: 'inherit', env: { ...process.env, HTTP_TEST_DIRECTORY: directory },
  })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  rmSync(directory, { recursive: true, force: true })
}
