/**
 * dsh-gov-bp — government-facing BP skills for DeepSeekRuntime.
 *
 * This package ships four Markdown skills (评审 / 九章骨架 / 申报话语 / 报价) and
 * registers them through the `ctx.skills` provider registry, the same surface
 * the bundled `skill-office` package uses. Nothing is copied into the user's
 * `~/.dsh/skills` — the provider serves them straight out of this package, so
 * `dsh plugin add` / `dsh plugin remove` is the whole install story.
 *
 * Design notes worth keeping:
 *   - zero dependencies: the frontmatter parser below handles the YAML subset a
 *     SKILL.md actually uses (scalars, quoted strings, folded/literal blocks),
 *     so no `yaml` package and no supply-chain surface;
 *   - rank sits below every user root (project 100-200, custom 300, user
 *     400-500), so a skill the user writes locally always wins over ours;
 *   - `get()` appends the skill's absolute resource directory to the content,
 *     which is how the model finds the reference files next to SKILL.md.
 */

import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Skill directory names shipped in assets/. Order is presentation order. */
const SKILL_NAMES = ['gov-bp-review', 'gov-bp-outline', 'gov-bp-pitch', 'gov-bp-quote']

/** Cordis plugin identity. */
const name = 'dsh-gov-bp'

/** The skill registry must exist before this plugin can register a provider. */
const inject = ['skills']

const PROVIDER_NAME = 'dsh-gov-bp'

/**
 * Precedence rank. The filesystem provider uses 100 (project .dsh) through 500
 * (user ~/.agents); the bundled packages use 600. We sit at 650 — the lowest
 * precedence of all — so anything the user writes locally overrides us without
 * having to disable the plugin.
 */
const SKILL_RANK = 650

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u

/**
 * Parse the YAML subset used by SKILL.md frontmatter.
 *
 * Supported: `key: scalar`, single/double quoted scalars, `key: >-` and
 * `key: |` block scalars, `#` comments and blank lines. Anything else is
 * ignored rather than guessed at — an unparsed key must never silently become
 * a wrong value.
 */
export function parseFrontmatter(raw) {
  const text = String(raw ?? '')
  const match = FRONTMATTER.exec(text)
  if (!match) return null

  const data = {}
  const lines = match[1].split(/\r?\n/)
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    index += 1

    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    const pair = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line)
    if (!pair) continue

    const key = pair[1]
    let value = pair[2].trim()

    if (value === '' && index < lines.length && /^\s+\S/.test(lines[index])) {
      // A bare key followed by an indented block: treat it as a literal block.
      const block = []
      while (index < lines.length && (/^\s+\S/.test(lines[index]) || lines[index].trim() === '')) {
        block.push(lines[index].trim())
        index += 1
      }
      data[key] = block.join(' ').trim()
      continue
    }

    if (value === '>' || value === '>-' || value === '|' || value === '|-') {
      const folded = value.startsWith('>')
      const block = []
      while (index < lines.length && (/^\s+\S/.test(lines[index]) || lines[index].trim() === '')) {
        block.push(lines[index].trim())
        index += 1
      }
      data[key] = folded ? block.join(' ').replace(/\s+/g, ' ').trim() : block.join('\n').trim()
      continue
    }

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    } else {
      const comment = value.search(/\s#/)
      if (comment >= 0) value = value.slice(0, comment).trim()
    }

    data[key] = value
  }

  return {
    data,
    body: text.slice(match[0].length).trim(),
  }
}

function readSkillFile(path) {
  const parsed = parseFrontmatter(readFileSync(path, 'utf8'))
  if (parsed === null) throw new Error(`${name}: ${path} has no YAML frontmatter`)
  const description = parsed.data.description
  if (typeof description !== 'string' || description.length === 0) {
    throw new Error(`${name}: ${path} frontmatter has no description`)
  }
  const declared = parsed.data.name
  if (typeof declared === 'string' && declared.length > 0 && declared !== skillNameOf(path)) {
    throw new Error(`${name}: ${path} declares name "${declared}" but lives in "${skillNameOf(path)}"`)
  }
  return { description, body: parsed.body }
}

function skillNameOf(path) {
  return path.split(sep).slice(-2, -1)[0]
}

/** Absolute assets directory for this package (or the configured override). */
export function assetRootOf(config = {}) {
  const root = config.assetRoot ?? fileURLToPath(new URL('../assets/', import.meta.url))
  if (!isAbsolute(root)) throw new Error(`${name}: assetRoot must be an absolute directory`)
  return root
}

/**
 * Build the provider object without touching a registry — exported so tests can
 * assert the exact candidate shape the runtime will see.
 */
export function buildProvider(config = {}) {
  const assetRoot = assetRootOf(config)

  const candidates = SKILL_NAMES.map((skillName) => {
    const directory = join(assetRoot, skillName)
    const path = join(directory, 'SKILL.md')
    const { description } = readSkillFile(path)
    return {
      name: skillName,
      description,
      invocation: { modelInvocable: true, userInvocable: true },
      provider: PROVIDER_NAME,
      source: 'plugin',
      rank: SKILL_RANK,
      resourceBase: { kind: 'directory', path: directory.split(sep).join('/') },
      locator: path,
    }
  })

  return {
    name: PROVIDER_NAME,
    list: () => Promise.resolve(candidates),
    async get(candidate, options = {}) {
      const { rank: _rank, locator, ...summary } = candidate
      const { body } = readSkillFile(locator)
      const directory = candidate.resourceBase?.path ?? ''
      const resources = directory
        ? `\n\n## Resources\n\nReference files for this skill live in:\n\n\`${directory}\`\n\nRead them when the body points at one (e.g. \`references/…\`); they are plain Markdown.`
        : ''
      return { ...summary, content: body + resources }
    },
  }
}

/**
 * Register the provider on the skill registry.
 * @param ctx - Cordis context carrying `ctx.skills`.
 * @param config - Optional `{ assetRoot }` for packaged deployments.
 */
function apply(ctx, config = {}) {
  const provider = buildProvider(config)
  ctx.skills.registerProvider(() => provider)
}

export { SKILL_NAMES, SKILL_RANK, PROVIDER_NAME, apply, inject, name }
