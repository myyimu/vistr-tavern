# Alpha 验证指南

这份文档用于仓库公开后，或发布小版本 alpha patch 前的真实环境验证。

目标不是证明 VistrTavern 已经成熟，而是证明另一个用户可以在干净的 SillyTavern 环境里复现核心 RP 闭环。

## 测试环境

每次真实手动验证后，补全这张表。

| 项目 | 值 |
| --- | --- |
| VistrTavern 版本 | `v0.6.0-alpha` |
| SillyTavern 版本 | TODO |
| 浏览器 | TODO |
| 系统 | TODO |
| 安装方式 | GitHub 链接安装 |
| 扩展目录 | `data/default-user/extensions/vistr-tavern` |

## 干净安装

1. 打开 SillyTavern 的扩展安装器。
2. 从 `https://github.com/xiaoke5211-star/vistr-tavern` 安装。
3. 重启 SillyTavern 或刷新网页界面。
4. 打开任意聊天。
5. 确认页面出现浮动 `VT` 按钮。

截图占位：

```text
docs/assets/screenshots/vt-button.png
```

## 核心闭环

验证 public alpha 的最小闭环：

1. 打开 `VT` 面板。
2. 确认角色选择器能加载角色。
3. 将 `语言` 在中文和英文之间切换一次，然后任选一种语言继续测试。
4. 在三种场景类型之间切换一次。
5. 保存创作上下文备注。
6. 填写真人意图字段。
7. Awareness mode 保持 `AI 无感`。
8. 对一个角色开始 intrusion。
9. 将 `乱入类型` 设置为 `线索污染`。
10. 输入一条接管发言，点击 `发送为角色并记录`。
11. 确认这句话在 SillyTavern 中显示为被选中的角色发言，而不是用户发言。
12. intrusion 激活期间让 AI 回复。
13. 结束 intrusion。
14. 确认 pending handoff 里包含乱入类型指令。
15. 捕获灵感。
16. 保存一条创作者脑暴笔记。
17. 确认 Debug 中出现 pending continuity handoff。
18. 触发下一次生成。
19. 确认 Debug 显示 interceptor 被调用，并且 handoff 变为 consumed。
20. 标记一个剧情分支。
21. 确认分支出现在已保存剧情分支列表。
22. 点击 `整理素材`，并导出 Markdown / JSON。

截图占位：

```text
docs/assets/screenshots/vt-panel.png
docs/assets/screenshots/debug-panel.png
docs/assets/screenshots/handoff-pending.png
docs/assets/screenshots/export-markdown.png
```

## 异常察觉模式

每个模式都做一次短测试：

| 模式 | 预期结果 |
| --- | --- |
| `AI 无感` | 不生成异常察觉事件。handoff 只保持剧情连续性，不制造元怀疑。 |
| `断片` | handoff 要求下一条相关 AI 回复包含简短斜体内心独白，表现“刚才的话不像自己”。 |
| `怀疑` | handoff 要求更强的外部意志、世界规则或现实稳定性怀疑。 |

目标对象测试：

| Target | 预期结果 |
| --- | --- |
| `Controlled character` | 只生成 `self_anomaly_awareness`。 |
| `Observers` | 只生成 `observer_anomaly_awareness`。 |
| `Both` | 同时生成 self 和 observer awareness events。 |

## Fallback 验证

如果自动注入不明显：

1. 点击 `Copy Latest Handoff`。
2. 把复制出的 handoff 手动放入 SillyTavern 上下文。
3. 生成下一条 AI 回复。
4. 确认回复遵循 handoff，且插件没有伪造单独的 AI 消息。

## 隐私检查

分享截图或导出前：

- 移除私有角色卡、私密聊天内容、API key 和个人路径。
- 不要公开包含私密 RP 内容的导出文件。
- 如果 Debug 截图包含剧情文本，先裁剪或打码。

## Alpha 反馈 issue

请测试者使用 `alpha feedback` issue 模板，并提供：

- SillyTavern 版本。
- 安装方式。
- 是否出现 `VT` 按钮。
- 自动 handoff 注入是否成功。
- `Copy Latest Handoff` 是否可用。
- 测试了哪个 awareness mode 和 target。
- 控制台错误或截图，注意先移除私密 RP 内容。
