import test from 'node:test'
import assert from 'node:assert/strict'
import { parseFrontmatter } from '../lib/index.js'

test('plain scalars are parsed', () => {
  const parsed = parseFrontmatter('---\nname: gov-bp-review\ndescription: 一句话\n---\n\n# 标题\n正文\n')
  assert.equal(parsed.data.name, 'gov-bp-review')
  assert.equal(parsed.data.description, '一句话')
  assert.equal(parsed.body, '# 标题\n正文')
})

test('quoted scalars lose their quotes', () => {
  const parsed = parseFrontmatter('---\nname: "x-y"\ndescription: \'带: 冒号\'\n---\nbody')
  assert.equal(parsed.data.name, 'x-y')
  assert.equal(parsed.data.description, '带: 冒号')
})

test('folded and literal blocks are joined correctly', () => {
  const folded = parseFrontmatter('---\ndescription: >-\n  第一行\n  第二行\n---\nbody')
  assert.equal(folded.data.description, '第一行 第二行')
  const literal = parseFrontmatter('---\ndescription: |\n  第一行\n  第二行\n---\nbody')
  assert.equal(literal.data.description, '第一行\n第二行')
})

test('comments and blank lines are ignored', () => {
  const parsed = parseFrontmatter('---\n# a comment\nname: n\n\ndescription: d\n---\nbody')
  assert.deepEqual(parsed.data, { name: 'n', description: 'd' })
})

test('missing or malformed frontmatter returns null', () => {
  assert.equal(parseFrontmatter('# no frontmatter\n'), null)
  assert.equal(parseFrontmatter('---\nname: x\n'), null, 'unterminated frontmatter must not parse')
  assert.equal(parseFrontmatter(''), null)
})

test('a trailing comment on a value is stripped', () => {
  const parsed = parseFrontmatter('---\nname: x # 说明\ndescription: d\n---\nbody')
  assert.equal(parsed.data.name, 'x')
})
