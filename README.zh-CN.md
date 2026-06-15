# VistrTavern

[English](README.md) | 中文

镜像：[GitHub](https://github.com/xiaoke5211-star/vistr-tavern) | [Gitee](https://gitee.com/zyimu/vistr-tavern)

> Experimental MVP / work in progress.
>
> VistrTavern 是一个早期 SillyTavern 扩展原型。它让你临时接管一个 AI 角色，然后直接在 SillyTavern 原聊天框输入，让这句话显示成该 AI 角色说的。它还不是稳定的终端用户插件。

最短流程：

1. 打开 `VT`，选择要接管的角色。
2. 点击 `开始接管`。
3. 回到 SillyTavern 原聊天框输入并发送。
4. 这条消息会作为被接管角色的发言插入聊天，并被 VT 记录。
5. 点击 `结束`，再让 AI 继续回复。

## 核心问题

**如果真人能临时替某个 AI 角色说一句话，AI 群像会不会产生更有用的戏剧变化。**

VistrTavern 不是通用 AI 写作工具，也不是完整聊天平台。它关注的是：当一个真实的人短暂接管 AI 群像中的某个角色时，这种异常行为会如何改变其他角色的判断、关系、冲突和世界状态。

## 主要使用场景

VistrTavern 面向的是“可控地制造剧情裂缝”的创作工作流：

- **网文剧本**：把真人篡改角色发言变成冲突素材、反转点、关系裂痕和后续剧情钩子。
- **AI 剧本杀**：让玩家短暂接管某个角色，污染线索、制造证词矛盾或身份错位，再让 AI 群像在世界内解释这些异常。
- **虚拟剧场**：把真人当成外来导演，打断 AI 群像的正常表演，再观察角色如何修复连续性、误读异常，甚至怀疑现实。

简单说，它不是让 AI 自己写得更好，而是给创作者一个制造“可用戏剧事故”的工具。

## 项目定位

VistrTavern 是一个 AI 群像叙事扰动系统。

它试图验证一个完整闭环：

```text
AI 群像正常运行
-> 真人匿名接管其中一个角色
-> AI 角色对异常行为作出反应
-> 控制权在限时后回到 AI
-> 系统记录扰动如何改变剧情
-> 导出为结构化创作素材
```

项目的第一目标是 SillyTavern 扩展，而不是独立 Web App。

## 发布目标

`v0.6.0-alpha` 表示这个扩展可以通过 SillyTavern 的 GitHub 扩展安装、手动文件夹或 release zip 本地安装测试。它还不适合大规模终端用户支持。

## 已测试环境

公开兼容性还在收集中。如果你测试了 VistrTavern，请在 [alpha feedback thread](https://github.com/xiaoke5211-star/vistr-tavern/issues/1) 反馈结果。

| VistrTavern | SillyTavern | 系统 | 浏览器 | 状态 |
| --- | --- | --- | --- | --- |
| `v0.6.0-alpha` | 等待公开验证 | TODO | TODO | TODO |

## 产出示例

理解 VistrTavern 最直接的方式是看它能整理出什么样的创作素材：

- [网文剧情种子](examples/zh-CN/web-novel-scene.md)
- [AI 剧本杀线索污染](examples/zh-CN/ai-murder-mystery.md)
- [虚拟剧场现实怀疑](examples/zh-CN/virtual-theater.md)

## 核心原则

如果一个功能不能增强“真人异常源混入 AI 群像后产生的戏剧张力”，它就不是第一优先级。

多角色互动是 AI 很强、但也最容易显假的地方：它能模拟多人，但所有角色背后仍然容易滑向同一个模型节奏。VistrTavern 把真人客串视为打破这种同质化的裂缝。AI 负责维持世界，人类负责带来真正不可预测的意图、对抗和戏剧性。

长期方向更接近“角色对戏空间”，而不是泛泛的 AI 酒馆：一个场景里有角色和戏剧压力；真人可以短暂客串一个角色；AI 群像维持连续性；最后聊天记录直接转化成剧本素材、小说片段、人设成长记录和即时共创日志。

VistrTavern 重点记录：

1. 真人异常源何时进入、接管了谁。
2. 真人输入如何改变角色行为。
3. AI 群像如何误读、抵抗、放大或适应这个异常。
4. 这次扰动造成了哪些张力、关系和世界状态变化。

## 当前已实现

- SillyTavern 扩展 manifest。
- 浮动 VistrTavern 控制面板。
- 低门槛主流程：选择角色、开始接管、直接在 SillyTavern 原聊天框发送角色接管发言。
- 中英文 UI 语言切换。
- 角色选择。
- 临时真人接管状态。
- 基于倒计时的 AI 自动恢复。
- 场景和张力字段。
- 网文剧本、AI 剧本杀、虚拟剧场三种场景类型。
- 创作上下文备注：故事前提、当前局面、可客串角色和 AI 连续性备注。
- 真人意图字段：想制造什么、针对谁、破坏什么关系或规则、泄露什么秘密。
- 接管期间拦截 SillyTavern 原聊天框发送动作，通过 `/sendas` 把普通输入显示为被接管角色的话；同时保留面板发送和直接插入聊天 fallback。
- 真人异常发言记录。
- 乱入类型标记：角色接管、记忆断片、剧情钩子、关系破坏和线索污染。
- 入侵窗口内的 AI 反应捕获。
- AI 接管连续性 handoff，用于保存“剧情已经被真人改变”的上下文。
- AI 异常察觉模式：AI 无感、断片、怀疑。
- 通过 SillyTavern `generate_interceptor` 注入待处理的 continuity handoff。
- Alpha Debug 面板，显示存储、handoff、interceptor、AI 捕获和错误状态。
- 手动 `Copy Latest Handoff` fallback。
- Markdown 和 JSON 导出。
- Creator Pack 导出，用于整理可复用写作素材、冲突钩子、分支路线和 handoff 上下文。
- 素材工作台，一键整理创作者可用素材。
- 互动灵感捕获，把一次真人客串整理成后续创作方向。
- 创作者脑暴空间，保存不会进入聊天的私有创作笔记。
- Character Sheet Prompt 导出，用于把记录交给外部模型整理人设。
- 剧情分支标记，支持关系线、阴谋线、身份揭露、世界观裂缝、线索污染和情绪破裂等路线。
- VT 面板内可回看已保存剧情分支。
- VT 面板内置首次使用引导。
- Debug 中显示兼容性快照。
- 通过 `npm run package:zip` 生成 release zip 安装包。
- 核心模块 smoke test。

## 当前限制

- Continuity handoff prompt 注入已通过 SillyTavern `generate_interceptor` 实现，但仍需要更多真实环境测试。
- AI 反应捕获依赖 SillyTavern runtime events，不同版本之间可能需要兼容性修正。
- UI 仍然是实验形态，但默认流程已经把高级字段收起，只保留主路径。
- 测试覆盖目前只有 smoke test。
- SillyTavern 扩展 API 变化可能影响安装和更新行为。

## 本地测试

运行 smoke test：

```bash
npm run verify
```

## 安装形态

这个仓库本身就是扩展目录。

推荐 GitHub 安装：

1. 打开 SillyTavern 的扩展面板。
2. 使用 GitHub 扩展安装功能。
3. 粘贴 `https://github.com/xiaoke5211-star/vistr-tavern`。
4. 安装后重启 SillyTavern 或刷新网页界面。
5. 打开一个聊天，确认页面上出现浮动的 `VT` 按钮。

手动文件夹安装：

1. 克隆或下载这个仓库。
2. 如果需要，把目录名改成 `vistr-tavern`。
3. 把目录放到 SillyTavern 的用户扩展目录下。
4. 重启 SillyTavern 或刷新网页界面。
5. 打开一个聊天，确认页面上出现浮动的 `VT` 按钮。

Release zip 安装：

1. 从 GitHub Release 下载 `vistr-tavern-<version>.zip`。
2. 解压到 SillyTavern 用户扩展目录。
3. 确认解压后的目录名是 `vistr-tavern`。
4. 重启 SillyTavern 或刷新网页界面。

本地生成 zip 包：

```bash
npm run package:zip
```

预期结构：

```text
SillyTavern/
  data/
    default-user/
      extensions/
        vistr-tavern/
          manifest.json
          index.js
          style.css
          core/
          data/
          ui/
```

## 文档

- [产品定位](docs/zh-CN/00-产品定位.md)
- [技术架构](docs/zh-CN/01-技术架构.md)
- [路线图](docs/zh-CN/02-路线图.md)
- [MVP 开发计划](docs/zh-CN/03-MVP开发计划.md)
- [数据模型](docs/zh-CN/04-数据模型.md)
- [技术与原理](docs/zh-CN/05-技术与原理.md)
- [AI 视角叙事样例](docs/zh-CN/06-AI视角叙事样例.md)
- [使用手册](docs/zh-CN/07-使用手册.md)
- [发布检查清单](docs/zh-CN/08-发布检查清单.md)
- [Alpha 验证指南](docs/zh-CN/09-alpha验证指南.md)
- [工程化说明](docs/zh-CN/10-工程化.md)
- [案例示例](examples/README.md)

英文文档：

- [Product Positioning](docs/00-product-positioning.md)
- [Technical Architecture](docs/01-technical-architecture.md)
- [Roadmap](docs/02-roadmap.md)
- [MVP Development Plan](docs/03-mvp-development-plan.md)
- [Data Model](docs/04-data-model.md)
- [Technical Concepts and Narrative Principles](docs/05-concepts.md)
- [User Guide](docs/06-user-guide.md)
- [Alpha Validation Guide](docs/07-alpha-validation.md)
- [Engineering Notes](docs/08-engineering.md)
- [Release Checklist](docs/release-checklist.md)
- [Examples](examples/README.md)

## 更新日志

- [CHANGELOG.md](CHANGELOG.md)

## PS

忽然发现这个插件很适合在虚构 RP 里“嫁祸 AI”：真人篡改了 AI 角色的话，再让角色自己承担后果。没想到更好玩的是，除了改 AI 说过什么，还可以给 AI 造谣，推演“它刚才为什么会那样说”，哈哈哈。

## License

MIT
