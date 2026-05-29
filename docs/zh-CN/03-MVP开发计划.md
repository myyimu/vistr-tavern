# MVP 开发计划

## MVP 目标

构建一个 SillyTavern 插件，证明核心入侵闭环：

```text
AI 群像对话
-> 真人匿名接管一个角色
-> 该角色出现异常行为
-> AI 群像做出反应
-> 控制权回到 AI
-> 扰动过程被导出为结构化素材
```

## MVP 范围

必须包含：

- 插件可以在 SillyTavern 中加载。
- VistrTavern 控制面板。
- 选择一个角色。
- 开始临时接管。
- 手动结束或超时结束接管。
- 记录入侵生命周期。
- 记录带控制者元数据的消息。
- 设置当前场景。
- 手动设置张力值。
- 导出 Markdown。
- 导出 JSON。

如果实现成本低，可以包含：

- 沉浸模式。
- 上帝模式。
- 基础本地持久化。

必须不包含：

- 后端服务器。
- 账号系统。
- 多人系统。
- 付费系统。
- 自动小说写作。
- 完整创作者工作台。

## 开发里程碑

### Milestone 1：插件空壳

文件：

```text
manifest.json
index.js
style.css
```

任务：

- 让 SillyTavern 加载插件。
- 添加 VistrTavern 按钮。
- 打开和关闭面板。
- 显示当前插件状态。

退出标准：

- 插件能出现在 SillyTavern 中。
- 面板可以稳定打开。

当前状态：

- 已实现为浮动扩展面板。
- 核心验证可通过 `npm run verify` 完成。

### Milestone 2：Intrusion Engine

文件：

```text
core/intrusionEngine.js
data/schema.js
```

任务：

- 实现 `startIntrusion`。
- 实现 `endIntrusion`。
- 实现 `getController`。
- 实现超时恢复。
- 发出开始和结束事件。

退出标准：

- 一个选定角色可以在固定时间内被标记为真人控制。
- 超时后控制权回到 AI。

### Milestone 3：Memory Capture

文件：

```text
core/narrativeMemory.js
data/storageAdapter.js
```

任务：

- 记录入侵开始和结束。
- 记录带控制者元数据的消息。
- 记录场景和张力值。
- 本地持久化会话记忆。

退出标准：

- 消息被捕获后，会话可以重新加载或导出。

### Milestone 4：场景与张力控制

文件：

```text
core/sceneManager.js
ui/scenePanel.js
```

任务：

- 设置场景名。
- 设置氛围。
- 设置张力值。
- 将场景元数据绑定到消息记录。

退出标准：

- 每条捕获消息都能关联到场景和张力值。

### Milestone 5：Export Writer

文件：

```text
core/exportWriter.js
ui/exportPanel.js
prompts/writerAdapterPrompt.md
```

任务：

- 导出 Markdown。
- 导出 JSON。
- 包含入侵时间线。
- 包含高张力对话。
- 包含场景总结占位。

退出标准：

- 作者无需只阅读原始聊天记录，也能使用导出内容作为故事素材。

### Milestone 6：模式系统

文件：

```text
ui/uiOverlay.js
core/intrusionEngine.js
```

任务：

- 添加沉浸模式。
- 添加上帝模式。
- 根据模式隐藏或揭示控制者标签。
- 场景结束后添加延迟揭示总结。

退出标准：

- 同一场会话既可以作为沉浸式不确定体验，也可以作为显式分析材料。

## MVP 验证测试

手动运行一个场景：

1. 创建一个至少包含三个 AI 角色的场景。
2. 开始正常 AI 对话。
3. 真人接管其中一个角色 3 到 5 分钟。
4. 真人说出一句与此前场景方向相冲突的话。
5. AI 角色做出反应。
6. 控制权回到 AI。
7. 导出会话。

只有当导出内容能清楚回答以下问题时，MVP 才算成功：

- 哪个角色被入侵了？
- 入侵何时开始、何时结束？
- 出现了什么异常行为？
- AI 角色如何反应？
- 张力、关系或世界状态发生了什么变化？
