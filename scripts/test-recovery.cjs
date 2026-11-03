const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), ts = require('typescript')
const { spawnSync } = require('node:child_process')
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'padelcheck-recovery-'))
try {
  for (const name of ['recovery-machine', 'recovery-link']) {
    const source = path.join(__dirname, '../src/features/auth', name + '.ts')
    if (fs.existsSync(source)) fs.writeFileSync(path.join(directory, name + '.cjs'), ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)
  }
  const result = spawnSync(process.execPath, ['--test', path.join(__dirname, '../tests/recovery.test.cjs')], { stdio: 'inherit', env: { ...process.env, RECOVERY_TEST_DIR: directory } })
  process.exitCode = result.status ?? 1
} finally { fs.rmSync(directory, { recursive: true, force: true }) }
