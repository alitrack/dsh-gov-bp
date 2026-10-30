import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { SKILL_NAMES, SKILL_RANK, PROVIDER_NAME, assetRootOf, buildProvider, parseFrontmatter } from '../lib/index.js'

const root = assetRootOf()

test('every declared skill ships a SKILL.md whose frontmatter matches its directory', () => {
  for (const name of SKILL_NAMES) {
    const path = join(root, name, 'SKILL.md')
    assert.ok(existsSync(path), `missing ${path}`)
    const parsed = parseFrontmatter(readFileSync(path, 'utf8'))
    assert.ok(parsed, `${name}: no frontmatter`)
    assert.equal(parsed.data.name, name, `${name}: frontmatter name mismatch`)
    assert.ok(parsed.data.description.length > 40, `${name}: description too short to route on`)
    assert.ok(parsed.body.length > 1000, `${name}: body too thin to be useful`)
  }
})

test('no extra skill directories are left unregistered', () => {
  const onDisk = readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  assert.deepEqual(onDisk.sort(), [...SKILL_NAMES].sort())
})

test('every references/ file mentioned in a body actually exists', () => {
  for (const name of SKILL_NAMES) {
    const body = parseFrontmatter(readFileSync(join(root, name, 'SKILL.md'), 'utf8')).body
    const mentioned = [...body.matchAll(/references\/[\w./-]+\.md/g)].map((match) => match[0])
    for (const relative of new Set(mentioned)) {
      assert.ok(existsSync(join(root, name, relative)), `${name}: body points at missing ${relative}`)
    }
  }
})

test('the provider ranks below every filesystem root so local skills win', () => {
  assert.equal(SKILL_RANK, 650)
  assert.ok(SKILL_RANK > 500, 'user roots use 400-500; a plugin must not outrank them')
})

test('the provider lists the four skills with the shape the registry expects', async () => {
  const provider = buildProvider()
  assert.equal(provider.name, PROVIDER_NAME)
  const candidates = await provider.list()
  assert.equal(candidates.length, SKILL_NAMES.length)
  for (const candidate of candidates) {
    assert.ok(SKILL_NAMES.includes(candidate.name))
    assert.equal(candidate.provider, PROVIDER_NAME)
    assert.equal(candidate.source, 'plugin')
    assert.equal(candidate.rank, SKILL_RANK)
    assert.equal(candidate.invocation.modelInvocable, true)
    assert.equal(candidate.invocation.userInvocable, true)
    assert.equal(candidate.resourceBase.kind, 'directory')
    assert.ok(candidate.resourceBase.path.endsWith(candidate.name))
    assert.ok(existsSync(candidate.locator))
  }
})

test('get() returns the body without frontmatter plus the resource directory', async () => {
  const provider = buildProvider()
  const [candidate] = await provider.list()
  const definition = await provider.get(candidate)
  assert.ok(!definition.content.startsWith('---'), 'frontmatter leaked into the body')
  assert.ok(definition.content.includes('## Resources'))
  assert.ok(definition.content.includes(candidate.resourceBase.path))
  assert.equal(definition.name, candidate.name)
  assert.equal(definition.rank, undefined, 'rank must not leak into the definition')
})

test('an explicit assetRoot is honoured and must be absolute', async () => {
  assert.throws(() => assetRootOf({ assetRoot: 'relative/dir' }), /absolute/)
  const provider = buildProvider({ assetRoot: root })
  assert.equal((await provider.list()).length, SKILL_NAMES.length)
})
