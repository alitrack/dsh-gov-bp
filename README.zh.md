# dsh-gov-bp

[English](README.md) | 简体中文

给政府部门看的 BP 技能包，装在 [DeepSeekRuntime](https://github.com/deepseek-ai/deepseek-harness) 里：评审七问、九章骨架、申报话语转换、带真实人月验算的报价方法。四个 Markdown skill，零依赖，不往你的 skills 目录里拷任何文件。

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![dsh](https://img.shields.io/badge/dsh-0.2.1--rc.2-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)

## 为什么有这个

给投资人看的 BP 和给**审批试点的政府部门**看的材料是两套文体。后者必须回答：哪份文件（带文号）开了这个口子、哪一步市场自己做不到、你到底要政府给什么、为什么是你、你明确不做什么、钱怎么算出来的、试点怎么收口。任何一条答不上，评审不是觉得你写得不好，而是**找不到他要的东西**。

四个 skill 把这张清单、九章顺序、话语转换和报价方法固定下来。它们是方法与口径纪律，不是填好数字的模板。

## 四个 skill

| Skill | 干什么 | 触发语 |
|---|---|---|
| `gov-bp-review` | 评审七问，逐条 0–2 分打分、不发阈值、致命伤清单 | 评审 BP、这份材料有什么问题、试点申报能不能过 |
| `gov-bp-outline` | 九章骨架 + 每章必答 + 政策依据卡格式 + 自我设限章 + GB/T 9704 格式层 + 禁词检查 | 写政务 BP、九章骨架、项目建议书结构 |
| `gov-bp-pitch` | 路演语言 → 申报语言对照表、三种叙事地基、数字口径纪律 | 路演稿改申报稿、话术不对、叙事怎么定位 |
| `gov-bp-quote` | 三层交付形态、自下而上人月验算、CSBMK 费率口径、决定 30–50% 价差的四问、低价禁区、涉密/版权红线 | 报多少钱、人月单价、成本大头、报价单拆项 |

每个 skill 旁边带一个 `references/` 文件（判据卡 / 逐章清单 / 改写样例 / 报价细则）。provider 会把该 skill 的**绝对资源目录**附在正文后面，模型需要细节时直接读。

## 安装

```bash
dsh plugin --profile web add dsh-gov-bp
# 或
dsh plugin --profile web add github:alitrack/dsh-gov-bp
```

**不会往 `~/.dsh/skills` 写任何东西**：这个包在 `ctx.skills` 注册表上注册一个 **skill provider**（与官方 `skill-office` 同一机制）。卸插件即卸 skill。

### 本地开发

```bash
git clone https://github.com/alitrack/dsh-gov-bp
cd dsh-gov-bp
node --test                      # 13 个单测，不需要装任何依赖
node tests/e2e/keyless.mjs       # provider 契约 + 引用文件完整性
bash tests/e2e/run_e2e.sh        # 完整 headless e2e（本地 OpenAI 兼容端点，免 key）
```

## 优先级与覆盖

provider 注册在 rank **650**：低于所有文件系统根（项目 `.dsh/skills` 100、项目 `.agents/skills` 200、custom 300、用户 `.dsh/skills` 400、用户 `.agents/skills` 500），也低于官方内置包（600）。**你在本地写同名 skill 永远覆盖它**——想改一条判据不必停用插件。

## 这个包明确不做什么

- **不编数字**。报价 skill 要求模型写「未核到」而不是编一个像真的数，费率锚点必须带**期次 + 数据截止日**；任何历史费率在真投标前都要用当期数据重核。
- **不是法律意见**。涉密与标准版权两节给的是边界与「到此为止」，不替代律师，也不替代资质申请。
- **不做文档渲染**。`gov-bp-outline` 只把 GB/T 9704 格式层写成检查表；要真正排版公文，请与排版工具组合使用。
- **不写宿主专用指令**。skill 正文不含任何宿主专用工具名，在 dsh、Claude Code 或纯聊天里读起来一致。

## 许可

MIT。
