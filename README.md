# dsh-gov-bp

English | [简体中文](README.zh.md)

Government-facing BP skills for [DeepSeekRuntime](https://github.com/deepseek-ai/deepseek-harness) — review, nine-chapter outline, bid-language conversion, and quoting with real person-month math. Four Markdown skills, zero dependencies, no files copied into your skills directory.

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![dsh](https://img.shields.io/badge/dsh-0.2.1--rc.2-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)
[![node](https://img.shields.io/badge/node-%3E%3D20-339933)](package.json)

## Why this exists

A 商业计划书 written for an investor and one written for a 政府部门 that approves pilots are different genres. The second one has to answer: which policy document (with its 文号) opened this window, what the market cannot do by itself, what exactly you are asking the government for, why you specifically, what you refuse to do, how the money was computed, and how the pilot stops. Getting any of those wrong is not a style problem — the reviewer simply cannot find what they need.

The four skills encode that checklist, the nine-chapter order, the language conversion, and the quoting method. They are methodology + 口径 discipline, not templates with numbers filled in.

## Skills

| Skill | What it does | Triggers |
|---|---|---|
| `gov-bp-review` | Seven-question review with 0–2 scoring per question, a "do not send" threshold and a fatal-defect list | 评审 BP、这份材料有什么问题、试点申报能不能过 |
| `gov-bp-outline` | Nine-chapter skeleton with the must-answer item per chapter, 政策依据 card format, self-limitation chapter, GB/T 9704 format layer, forbidden-word checks | 写政务 BP、九章骨架、项目建议书结构 |
| `gov-bp-pitch` | Investor-language → application-language conversion table, three narrative foundations, numeric-consistency discipline | 路演稿改申报稿、话术不对、叙事怎么定位 |
| `gov-bp-quote` | Three delivery tiers, bottom-up person-month math, CSBMK rate 口径, four questions that decide 30–50% of the price, low-price no-go zone, secrecy/copyright red lines | 报多少钱、人月单价、成本大头、报价单拆项 |

Each skill ships a `references/` file next to its `SKILL.md` (review cards, chapter checklist, rewrite samples, quoting method). The provider appends the absolute resource directory to the skill body, so the model can read them when it needs the detail.

## Install

```bash
dsh plugin --profile web add dsh-gov-bp
```

Or from GitHub:

```bash
dsh plugin --profile web add github:alitrack/dsh-gov-bp
```

Nothing is written into `~/.dsh/skills`: the package registers a **skill provider** over the existing `ctx.skills` registry (the same mechanism the bundled `skill-office` package uses). Removing the plugin removes the skills.

### Local development

```bash
git clone https://github.com/alitrack/dsh-gov-bp
cd dsh-gov-bp
node --test                      # 13 unit tests, no install needed
node tests/e2e/keyless.mjs       # provider contract + reference integrity
```

```yaml
# local-overlay.yml
- insert:
    - id: dsh-gov-bp
      name: '/absolute/path/to/dsh-gov-bp/lib/index.js'
```

```bash
npx @deepseek-ai/dsh@0.2.1-rc.2 --patch ./local-overlay.yml "帮我评审这份政务 BP"
```

Full headless e2e (real dsh + a **local** OpenAI-compatible model, no API key): `bash tests/e2e/run_e2e.sh`.

## Precedence and overrides

The provider registers at rank **650**, below every filesystem root (project `.dsh/skills` 100, project `.agents/skills` 200, custom 300, user `.dsh/skills` 400, user `.agents/skills` 500) and below the bundled packages (600). So a skill you write locally with the same name always wins — you never have to disable the plugin to override one of these.

## What this package deliberately does not do

- **No fabricated numbers.** The quoting skill tells the model to write 未核到 rather than invent a plausible figure, and carries a 期次 + 数据截止日 discipline for rate anchors. Any rate it quotes is historical and must be re-checked against the current release before a real bid.
- **No legal advice.** The secrecy (涉密) and standards-copyright sections state the boundary and tell you to stop; they do not substitute for a lawyer or a 资质 application.
- **No document rendering.** `gov-bp-outline` covers the GB/T 9704 format layer as a checklist only. If you need actual 公文 typesetting, combine it with a rendering tool rather than expecting this to print.
- **No Hermes-only instructions.** Skill bodies avoid host-specific tool names, so they read the same inside dsh, Claude Code, or a plain chat.

## License

MIT.
