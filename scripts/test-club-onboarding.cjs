const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), ts = require('typescript')
const { spawnSync } = require('node:child_process')

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'padelcheck-club-onboarding-'))
try {
  const source = path.join(__dirname, '../src/features/club-onboarding')
  for (const name of ['onboarding-model', 'onboarding-flow']) {
    const output = ts.transpileModule(fs.readFileSync(path.join(source, `${name}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } })
    fs.writeFileSync(path.join(directory, `${name}.cjs`), output.outputText.replace('require("./onboarding-model")', 'require("./onboarding-model.cjs")'))
  }
  const result = spawnSync(process.execPath, ['--test', path.join(__dirname, '../tests/club-onboarding.test.cjs')], { stdio: 'inherit', env: { ...process.env, ONBOARDING_TEST_DIR: directory } })
  process.exitCode = result.status ?? 1
} finally { fs.rmSync(directory, { recursive: true, force: true }) }
