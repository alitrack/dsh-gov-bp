/**
 * Key-free end-to-end check for the skill package.
 *
 * Drives the plugin through the same `ctx.skills` surface dsh provides, with no
 * model and no network, and asserts the things a user depends on: the plugin
 * declares the right identity, registers exactly one provider, and every skill
 * it advertises can actually be loaded with its references intact.
 *
 * Run: node tests/e2e/keyless.mjs
 */

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pluginUrl = pathToFileURL(join(import.meta.dirname, '..', '..', 'lib', 'index.js')).href
const plugin = await import(pluginUrl)

let failures = 0
async function check(name, fn) {
  try {
    await fn()
    console.log(`ok   - ${name}`)
  } catch (error) {
    failures += 1
    console.error(`FAIL - ${name}: ${error.message}`)
  }
}

const ctx = {
  skills: {
    providers: [],
    registerProvider(factory) {
      this.providers.push(factory)
      return factory
    },
  },
}

plugin.apply(ctx)

await check('the plugin declares its identity and injects the skills registry', () => {
  assert.equal(plugin.name, 'dsh-gov-bp')
  assert.deepEqual(plugin.inject, ['skills'])
  assert.equal(typeof plugin.apply, 'function')
})

await check('exactly one provider is registered, lazily', () => {
  assert.equal(ctx.skills.providers.length, 1)
  assert.equal(typeof ctx.skills.providers[0], 'function')
})

await check('the provider advertises the four government-BP skills', async () => {
  const provider = ctx.skills.providers[0]()
  const candidates = await provider.list()
  assert.deepEqual(
    candidates.map((candidate) => candidate.name).sort(),
    ['gov-bp-outline', 'gov-bp-pitch', 'gov-bp-quote', 'gov-bp-review'],
  )
  for (const candidate of candidates) {
    assert.ok(candidate.description.length > 40, `${candidate.name}: description too short to route on`)
    assert.equal(candidate.invocation.modelInvocable, true)
  }
})

await check('every skill loads with a usable body and reachable references', async () => {
  const provider = ctx.skills.providers[0]()
  for (const candidate of await provider.list()) {
    const definition = await provider.get(candidate)
    assert.ok(definition.content.length > 1000, `${candidate.name}: body too thin`)
    assert.ok(!definition.content.includes('name: gov-bp'), `${candidate.name}: frontmatter leaked`)
    const referenced = [...definition.content.matchAll(/references\/[\w./-]+\.md/g)].map((match) => match[0])
    assert.ok(referenced.length > 0, `${candidate.name}: no reference file is pointed at`)
    for (const relative of new Set(referenced)) {
      assert.ok(existsSync(join(candidate.resourceBase.path, relative)), `${candidate.name}: missing ${relative}`)
    }
  }
})

await check('skill content is self-contained (no Hermes-only tool names)', async () => {
  const provider = ctx.skills.providers[0]()
  for (const candidate of await provider.list()) {
    const { content } = await provider.get(candidate)
    for (const forbidden of ['browser_navigate', 'browser_vision', 'delegate_task', 'skill_view', 'feishu-send-file', 'MEDIA:']) {
      assert.ok(!content.includes(forbidden), `${candidate.name} references a host-specific tool: ${forbidden}`)
    }
  }
})

await check('routing descriptions cover the trigger phrases users actually type', async () => {
  const provider = ctx.skills.providers[0]()
  const byName = new Map((await provider.list()).map((candidate) => [candidate.name, candidate.description]))
  assert.match(byName.get('gov-bp-review'), /评审|review/i)
  assert.match(byName.get('gov-bp-outline'), /骨架|结构|章节/)
  assert.match(byName.get('gov-bp-pitch'), /申报|路演|话术|叙事/)
  assert.match(byName.get('gov-bp-quote'), /报价|人月|成本/)
})

if (failures > 0) {
  console.error(`\n${failures} keyless e2e check(s) failed`)
  process.exit(1)
}
console.log('\nkeyless e2e: all checks passed')
