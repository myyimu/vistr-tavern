import { Controller } from '../data/schema.js';

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

