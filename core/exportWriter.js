import { Controller, ScenarioPreset } from '../data/schema.js';

export class ExportWriter {
  toJson(memory) {
    return JSON.stringify(memory, null, 2);
  }

  toMarkdown(memory) {
    const activeScene = memory.scenes.find((scene) => scene.id === memory.session.activeSceneId);
    const intrusionLines = memory.intrusions.map((intrusion) => {
      const end = intrusion.endedAt || intrusion.endsAt;
      return `- ${intrusion.characterName || intrusion.characterId}: ${intrusion.startedAt} -> ${end} (${intrusion.visibility}, ${intrusion.endReason || 'active'})`;
    });

    const humanMessages = memory.messages.filter((message) => message.controller === Controller.HUMAN);
    const aiReactions = memory.messages.filter((message) => message.controller === Controller.AI && message.intrusionId);
    const highTensionMessages = memory.messages.filter((message) => Number(message.tension) >= 70);
    const handoffs = memory.handoffs || [];
    const awarenessEvents = memory.disturbanceEvents.filter((event) => event.type === 'self_anomaly_awareness' || event.type === 'observer_anomaly_awareness');
    const branchPoints = memory.branchPoints || [];

    return [
      `# ${memory.session.title}`,
      '',
      '## 核心命题',
      '真人异常源混入 AI 群像后，观察并记录它如何改变戏剧张力、人物关系和世界状态。',
      '',
      '## 当前场景',
      activeScene ? `- 场景：${activeScene.name}` : '- 场景：未设置',
      activeScene ? `- 氛围：${activeScene.mood || '未设置'}` : '- 氛围：未设置',
      activeScene ? `- 张力：${activeScene.tension}` : '- 张力：未设置',
      '',
      '## 入侵时间线',
      intrusionLines.length ? intrusionLines.join('\n') : '- 暂无入侵记录',
      '',
      '## 真人异常发言',
      humanMessages.length ? humanMessages.map(formatMessage).join('\n') : '- 暂无真人接管发言',
      '',
      '## AI 反应',
      aiReactions.length ? aiReactions.map(formatMessage).join('\n') : '- 暂无绑定到入侵窗口的 AI 反应',
      '',
      '## AI 接管连续性',
      handoffs.length ? handoffs.map(formatHandoff).join('\n\n') : '- 暂无接管恢复上下文',
      '',
      '## AI 异常察觉',
      awarenessEvents.length ? awarenessEvents.map(formatAwarenessEvent).join('\n') : '- 暂无 AI 异常察觉事件',
      '',
      '## 剧情分支标记',
      branchPoints.length ? branchPoints.map(formatBranchPoint).join('\n\n') : '- 暂无剧情分支标记',
      '',
      '## 高张力对话',
      highTensionMessages.length ? highTensionMessages.map(formatMessage).join('\n') : '- 暂无高张力对话',
      '',
      '## 扰动事件',
      memory.disturbanceEvents.length
        ? memory.disturbanceEvents.map((event) => `- [${event.type}] ${event.summary} (severity: ${event.severity})`).join('\n')
        : '- 暂无扰动事件',
      '',
      '## 人物关系变化',
      memory.relationshipDeltas.length
        ? memory.relationshipDeltas.map((delta) => `- ${delta.sourceCharacterId} -> ${delta.targetCharacterId}: ${delta.dimension} ${delta.before} -> ${delta.after}. ${delta.reason}`).join('\n')
        : '- MVP 阶段暂未记录',
      '',
      '## 世界状态变化',
      memory.worldStateDeltas.length
        ? memory.worldStateDeltas.map((delta) => `- ${delta.key}: ${delta.before} -> ${delta.after}. ${delta.reason}`).join('\n')
        : '- MVP 阶段暂未记录',
      '',
    ].join('\n');
  }

  toCreatorPack(memory) {
    const activeScene = memory.scenes.find((scene) => scene.id === memory.session.activeSceneId);
    const humanMessages = memory.messages.filter((message) => message.controller === Controller.HUMAN);
    const aiReactions = memory.messages.filter((message) => message.controller === Controller.AI && message.intrusionId);
    const handoffs = memory.handoffs || [];
    const branchPoints = memory.branchPoints || [];
    const awarenessEvents = memory.disturbanceEvents.filter((event) => event.type === 'self_anomaly_awareness' || event.type === 'observer_anomaly_awareness');
    const profile = materialProfile(memory.session.scenarioPreset);
    const conflictHooks = [
      ...memory.disturbanceEvents.filter((event) => event.severity >= 3).map((event) => event.summary),
      ...branchPoints.map((branch) => branch.summary),
    ];

    return [
      `# Creator Pack - ${memory.session.title}`,
      '',
      '## 创作摘要',
      `场景包装：${profile.zhName}。整理重点：${profile.zhFocus}。`,
      activeScene
        ? `当前素材围绕「${activeScene.name}」展开，氛围为「${activeScene.mood || '未设置'}」，张力值为 ${activeScene.tension}。`
        : '当前素材尚未绑定明确场景。',
      `本次导出包含 ${memory.intrusions.length} 次 intrusion、${humanMessages.length} 条真人异常发言、${aiReactions.length} 条 AI 反应、${handoffs.length} 个 continuity handoff 和 ${branchPoints.length} 个剧情分支。`,
      '',
      '## 真人异常素材',
      humanMessages.length ? humanMessages.map(formatMessage).join('\n') : '- 暂无真人异常发言',
      '',
      '## AI 误读 / 抵抗 / 修复',
      aiReactions.length ? aiReactions.map(formatMessage).join('\n') : '- 暂无 AI 反应',
      '',
      '## 冲突升级点',
      conflictHooks.length ? conflictHooks.map((hook) => `- ${hook}`).join('\n') : '- 暂无可整理的冲突升级点',
      '',
      '## 剧情分支',
      branchPoints.length ? branchPoints.map(formatBranchPoint).join('\n\n') : '- 暂无剧情分支',
      '',
      '## AI 异常察觉',
      awarenessEvents.length ? awarenessEvents.map(formatAwarenessEvent).join('\n') : '- 暂无 AI 异常察觉事件',
      '',
      '## 可继续写作的钩子',
      branchPoints.length
        ? branchPoints.map((branch) => `- 继续推进「${branch.title}」：${branch.options.length ? branch.options.join(' / ') : branch.summary}`).join('\n')
        : '- 从真人异常发言中挑选一条，追问它会改变谁的判断、关系或世界状态。',
      '',
      '## Continuity Handoff',
      handoffs.length ? handoffs.map(formatHandoff).join('\n\n') : '- 暂无接管恢复上下文',
      '',
    ].join('\n');
  }

  toOrganizedMaterial(memory, { language = 'zh-CN' } = {}) {
    const english = language === 'en';
    const activeScene = memory.scenes.find((scene) => scene.id === memory.session.activeSceneId);
    const humanMessages = memory.messages.filter((message) => message.controller === Controller.HUMAN);
    const aiReactions = memory.messages.filter((message) => message.controller === Controller.AI && message.intrusionId);
    const awarenessEvents = memory.disturbanceEvents.filter((event) => event.type === 'self_anomaly_awareness' || event.type === 'observer_anomaly_awareness');
    const branchPoints = memory.branchPoints || [];
    const handoffs = memory.handoffs || [];
    const profile = materialProfile(memory.session.scenarioPreset);
    const conflictHooks = uniqueItems([
      ...memory.disturbanceEvents.filter((event) => event.severity >= 3).map((event) => event.summary),
      ...branchPoints.map((branch) => branch.summary),
      ...humanMessages.map((message) => `${message.speakerName}: ${message.content}`),
    ]);
    const continuationHooks = branchPoints.length
      ? branchPoints.map((branch) => `${branch.title}: ${branch.options?.length ? branch.options.join(' / ') : branch.summary}`)
      : handoffs.map((handoff) => handoff.summary);

    if (english) {
      return [
        `# Organized Material - ${memory.session.title}`,
        '',
        '## Scenario Package',
        `- Preset: ${profile.enName}`,
        `- Focus: ${profile.enFocus}`,
        activeScene ? `- Active scene: ${activeScene.name}` : '- Active scene: not set',
        activeScene ? `- Mood / tension: ${activeScene.mood || 'not set'} / ${activeScene.tension}` : '- Mood / tension: not set',
        '',
        '## Human Anomaly Lines',
        humanMessages.length ? humanMessages.map(formatMessage).join('\n') : '- None recorded',
        '',
        '## AI Reactions',
        aiReactions.length ? aiReactions.map(formatMessage).join('\n') : '- None recorded',
        '',
        '## Conflict Hooks',
        conflictHooks.length ? conflictHooks.map((hook) => `- ${hook}`).join('\n') : '- No reusable conflict hooks yet',
        '',
        '## Character / Relationship Drift',
        summarizeCharacters(memory, english),
        '',
        '## Branch Routes',
        branchPoints.length ? branchPoints.map(formatBranchPoint).join('\n\n') : '- No branch points marked',
        '',
        '## Awareness Material',
        awarenessEvents.length ? awarenessEvents.map(formatAwarenessEvent).join('\n') : '- No anomaly awareness events',
        '',
        '## Next Writing Moves',
        continuationHooks.length
          ? continuationHooks.map((hook) => `- ${hook}`).join('\n')
          : `- Use the strongest anomaly line as a ${profile.enMove}.`,
        '',
      ].join('\n');
    }

    return [
      `# 素材整理 - ${memory.session.title}`,
      '',
      '## 场景包装',
      `- 类型：${profile.zhName}`,
      `- 整理重点：${profile.zhFocus}`,
      activeScene ? `- 当前场景：${activeScene.name}` : '- 当前场景：未设置',
      activeScene ? `- 氛围 / 张力：${activeScene.mood || '未设置'} / ${activeScene.tension}` : '- 氛围 / 张力：未设置',
      '',
      '## 真人异常发言',
      humanMessages.length ? humanMessages.map(formatMessage).join('\n') : '- 暂无真人异常发言',
      '',
      '## AI 反应',
      aiReactions.length ? aiReactions.map(formatMessage).join('\n') : '- 暂无 AI 反应',
      '',
      '## 冲突钩子',
      conflictHooks.length ? conflictHooks.map((hook) => `- ${hook}`).join('\n') : '- 暂无可复用冲突钩子',
      '',
      '## 人设 / 关系漂移',
      summarizeCharacters(memory, english),
      '',
      '## 剧情分支路线',
      branchPoints.length ? branchPoints.map(formatBranchPoint).join('\n\n') : '- 暂无剧情分支',
      '',
      '## 异常察觉素材',
      awarenessEvents.length ? awarenessEvents.map(formatAwarenessEvent).join('\n') : '- 暂无 AI 异常察觉事件',
      '',
      '## 下一步可写方向',
      continuationHooks.length
        ? continuationHooks.map((hook) => `- ${hook}`).join('\n')
        : `- 把最强的一条异常发言当作${profile.zhMove}继续推进。`,
      '',
    ].join('\n');
  }

  toCharacterSheetPrompt(memory) {
    const humanMessages = memory.messages.filter((message) => message.controller === Controller.HUMAN);
    const aiReactions = memory.messages.filter((message) => message.controller === Controller.AI && message.intrusionId);
    const handoffs = memory.handoffs || [];
    const branchPoints = memory.branchPoints || [];
    const awarenessEvents = memory.disturbanceEvents.filter((event) => event.type === 'self_anomaly_awareness' || event.type === 'observer_anomaly_awareness');
    const characters = memory.characters || [];

    return [
      `# Character Sheet Extraction Prompt - ${memory.session.title}`,
      '',
      '你是一个角色设定整理助手。请根据下面的 VistrTavern 叙事记录，提取角色设定变化和可继续使用的人设素材。',
      '',
      '请输出以下结构：',
      '',
      '1. 角色基础印象',
      '2. 真人异常介入前的稳定人设',
      '3. 真人异常发言造成的行为偏移',
      '4. AI 恢复后对异常的世界内解释',
      '5. 新增人设标签',
      '6. 关系变化与潜在冲突',
      '7. 可继续写作的角色钩子',
      '8. 需要避免的解释方式',
      '',
      '要求：',
      '',
      '- 不要把异常解释为“用户操作”或“插件行为”。',
      '- 优先使用世界内解释，例如失言、记忆断片、隐藏身份、被误读、证词污染或现实规则松动。',
      '- 区分角色原本性格和真人介入后产生的新素材。',
      '- 输出适合写入角色卡、剧本人物小传或连载设定表的内容。',
      '',
      '## 角色列表',
      characters.length ? characters.map((character) => `- ${character.name} (${character.id})`).join('\n') : '- 未记录角色',
      '',
      '## 真人异常发言',
      humanMessages.length ? humanMessages.map(formatMessage).join('\n') : '- 暂无真人异常发言',
      '',
      '## AI 反应',
      aiReactions.length ? aiReactions.map(formatMessage).join('\n') : '- 暂无 AI 反应',
      '',
      '## AI 恢复 Handoff',
      handoffs.length ? handoffs.map((handoff) => `- ${handoff.characterName || handoff.characterId}: ${handoff.summary}`).join('\n') : '- 暂无 handoff',
      '',
      '## 异常察觉事件',
      awarenessEvents.length ? awarenessEvents.map(formatAwarenessEvent).join('\n') : '- 暂无异常察觉事件',
      '',
      '## 剧情分支',
      branchPoints.length ? branchPoints.map(formatBranchPoint).join('\n\n') : '- 暂无剧情分支',
      '',
      '## 输出格式模板',
      '',
      '```markdown',
      '# 角色设定提取',
      '',
      '## 角色：<角色名>',
      '',
      '- 基础印象：',
      '- 稳定人设：',
      '- 异常偏移：',
      '- 世界内解释：',
      '- 新增标签：',
      '- 关系变化：',
      '- 后续钩子：',
      '- 避免解释：',
      '```',
      '',
    ].join('\n');
  }
}

function formatMessage(message) {
  const label = message.visibility === 'anonymous' ? 'Unknown Source' : message.controller;
  const tension = message.tension === null || message.tension === undefined ? '' : ` tension=${message.tension}`;
  return `- ${message.speakerName} [${label}${tension}]: ${message.content}`;
}

function formatHandoff(handoff) {
  return [
    `### ${handoff.characterName || handoff.characterId}`,
    `- Awareness: ${handoff.awareness}`,
    `- Awareness scope: ${handoff.awarenessScope || 'controlled'}`,
    `- Status: ${handoff.consumedAt ? 'consumed' : 'pending'}`,
    `- Injection: ${handoff.lastInjectedAt ? `injected ${handoff.injectionCount || 1} time(s)` : 'not injected'}`,
    `- Summary: ${handoff.summary}`,
    '',
    '```text',
    handoff.prompt,
    '```',
  ].join('\n');
}

function formatAwarenessEvent(event) {
  const scope = event.awarenessScope ? ` scope=${event.awarenessScope}` : '';
  const awareness = event.awareness ? ` awareness=${event.awareness}` : '';
  return `- [${event.type}${awareness}${scope}] ${event.summary} (severity: ${event.severity})`;
}

function formatBranchPoint(branch) {
  const lines = [
    `### ${branch.title}`,
    `- Type: ${branch.type}`,
    `- Character: ${branch.characterName || branch.characterId || 'not specified'}`,
    `- Summary: ${branch.summary}`,
  ];

  if (branch.options?.length) {
    lines.push('- Options:');
    lines.push(...branch.options.map((option, index) => `  ${index + 1}. ${option}`));
  }

  return lines.join('\n');
}

function materialProfile(preset) {
  const profiles = {
    [ScenarioPreset.MURDER_MYSTERY]: {
      zhName: 'AI 剧本杀',
      enName: 'AI murder mystery',
      zhFocus: '线索污染、证词矛盾、身份误导和可疑动机',
      enFocus: 'clue contamination, testimony conflict, identity misdirection, and suspicious motives',
      zhMove: '被污染线索',
      enMove: 'contaminated clue',
    },
    [ScenarioPreset.VIRTUAL_THEATER]: {
      zhName: '虚拟剧场',
      enName: 'virtual theater',
      zhFocus: '表演失控、角色自我察觉、世界真实性和舞台规则裂缝',
      enFocus: 'performance failure, character self-awareness, reality doubt, and stage-rule fractures',
      zhMove: '舞台失控瞬间',
      enMove: 'stage failure beat',
    },
    [ScenarioPreset.WEB_NOVEL]: {
      zhName: '网文剧本',
      enName: 'web novel / script drafting',
      zhFocus: '冲突升级、反转点、人物关系裂痕和后续章节钩子',
      enFocus: 'conflict escalation, reversals, relationship cracks, and next-chapter hooks',
      zhMove: '章节反转点',
      enMove: 'chapter reversal',
    },
  };

  return profiles[preset] || profiles[ScenarioPreset.WEB_NOVEL];
}

function uniqueItems(items) {
  return [...new Set(items.map((item) => item?.trim()).filter(Boolean))];
}

function summarizeCharacters(memory, english) {
  const relatedCharacterIds = new Set([
    ...memory.messages.map((message) => message.characterId).filter(Boolean),
    ...(memory.branchPoints || []).map((branch) => branch.characterId).filter(Boolean),
  ]);
  const characters = (memory.characters || []).filter((character) => relatedCharacterIds.has(character.id));

  if (!characters.length) {
    return english ? '- No character drift has been collected yet' : '- 暂无可整理的人设漂移';
  }

  return characters.map((character) => {
    const messageCount = memory.messages.filter((message) => message.characterId === character.id).length;
    const branchCount = (memory.branchPoints || []).filter((branch) => branch.characterId === character.id).length;
    return english
      ? `- ${character.name}: ${messageCount} recorded line(s), ${branchCount} branch point(s).`
      : `- ${character.name}：${messageCount} 条记录，${branchCount} 个剧情分支。`;
  }).join('\n');
}

