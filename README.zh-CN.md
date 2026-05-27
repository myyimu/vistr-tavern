# VistrTavern

[English](README.md) | 中文

> Experimental MVP / work in progress.
>
> VistrTavern 是一个早期 SillyTavern 扩展原型，用来验证真人入侵、AI 恢复、结构化叙事记忆和导出工作流。它还不是稳定的终端用户插件。

## 核心问题

**真人作为异常源混入 AI 群像后，会不会产生传统 AI 生成不了的戏剧张力。**

VistrTavern 不是通用 AI 写作工具，也不是完整聊天平台。它关注的是：当一个真实的人短暂接管 AI 群像中的某个角色时，这种异常行为会如何改变其他角色的判断、关系、冲突和世界状态。

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

## 核心原则

如果一个功能不能增强“真人异常源混入 AI 群像后产生的戏剧张力”，它就不是第一优先级。

VistrTavern 重点记录：

1. 真人异常源何时进入、接管了谁。
2. 真人输入如何改变角色行为。
3. AI 群像如何误读、抵抗、放大或适应这个异常。
4. 这次扰动造成了哪些张力、关系和世界状态变化。

## 当前已实现

- SillyTavern 扩展 manifest。
- 浮动 VistrTavern 控制面板。
- 角色选择。
- 临时真人接管状态。
- 基于倒计时的 AI 自动恢复。
- 场景和张力字段。
- 真人异常发言记录。
- 入侵窗口内的 AI 反应捕获。
- AI 接管连续性 handoff，用于保存“剧情已经被真人改变”的上下文。
- Markdown 和 JSON 导出。
- 核心模块 smoke test。

## 当前限制

- Continuity handoff 目前会生成、保存和导出，但还没有自动注入 SillyTavern prompt。
- AI 反应捕获依赖 SillyTavern runtime events，需要更多真实环境测试。
- UI 还是实验控制面板，不是最终用户工作流。
- 测试覆盖目前只有 smoke test。
- SillyTavern 扩展 API 变化可能影响安装和更新行为。

## 本地测试

运行 smoke test：

```bash
npm run smoke
```

## 安装形态

这个仓库本身就是扩展目录。测试时可以把它放到 SillyTavern 的扩展目录下，目录名建议为 `vistr-tavern`。

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

英文文档：

- [Product Positioning](docs/00-product-positioning.md)
- [Technical Architecture](docs/01-technical-architecture.md)
- [Roadmap](docs/02-roadmap.md)
- [MVP Development Plan](docs/03-mvp-development-plan.md)
- [Data Model](docs/04-data-model.md)

## License

MIT
