import { AwarenessScope, BrainstormKind, BranchType, Controller, HandoffAwareness, IntrusionKind, ScenarioPreset, Visibility, createEmptyMemory, createId, normalizeCharacter } from '../data/schema.js';

export class NarrativeMemory {
  constructor(memory = createEmptyMemory()) {
    this.memory = this.#normalizeMemory(memory);
  }

  syncCharacters(rawCharacters = []) {
    this.memory.characters = rawCharacters.map((character, index) => {
      const normalized = normalizeCharacter(character, index);
      const existing = this.memory.characters.find((item) => item.id === normalized.id);
      return existing ? { ...normalized, ...existing, name: normalized.name } : normalized;
    });

    return this.memory.characters;
  }

  recordIntrusionStarted(intrusion, sessionId = this.memory.session.id) {
    const record = {
      ...intrusion,
      sessionId,
    };

    this.memory.intrusions.push(record);
    this.#setCharacterController(record.characterId, Controller.HUMAN);
    return record;
  }

  recordIntrusionEnded(intrusion) {
    const index = this.memory.intrusions.findIndex((item) => item.id === intrusion.id);
    const record = {
      ...intrusion,
      sessionId: intrusion.sessionId || this.memory.session.id,
    };

    if (index >= 0) {
      this.memory.intrusions[index] = {
        ...this.memory.intrusions[index],
        ...record,
      };
    } else {
      this.memory.intrusions.push(record);
    }

    this.#setCharacterController(record.characterId, Controller.AI);
    this.recordContinuityHandoff(record);
    return record;
  }

  recordMessage({
    characterId,
    speakerName,
    controller = Controller.AI,
    visibility = Visibility.REVEALED,
    content,
    scene = null,
    intrusion = null,
    handoff = null,
    intrusionKind = null,
    source = 'sillytavern',
  }) {
    const trimmedContent = content?.trim();
    if (!trimmedContent) {
      return null;
    }

    const message = {
      id: createId('msg'),
      sessionId: this.memory.session.id,
      sceneId: scene?.id || this.memory.session.activeSceneId,
      intrusionId: intrusion?.id || handoff?.intrusionId || null,
      handoffId: handoff?.id || null,
      characterId: characterId || intrusion?.characterId || handoff?.characterId || null,
      speakerName: speakerName || intrusion?.characterName || 'Unknown',
      controller,
      visibility,
      intrusionKind: this.#messageIntrusionKind({ intrusionKind, intrusion, controller }),
      content: trimmedContent,
      tension: scene?.tension ?? null,
      source,
      createdAt: new Date().toISOString(),
    };

    this.memory.messages.push(message);
    return message;
  }

  recordDisturbanceEvent({
    type,
    severity = 1,
    summary,
    relatedMessageIds = [],
    scene = null,
    intrusion = null,
    handoff = null,
    characterId = null,
    intrusionKind = null,
    awareness = null,
    awarenessScope = null,
  }) {
    const trimmedSummary = summary?.trim();
    if (!trimmedSummary) {
      return null;
    }

    const event = {
      id: createId('event'),
      sessionId: this.memory.session.id,
      sceneId: scene?.id || this.memory.session.activeSceneId,
      intrusionId: intrusion?.id || handoff?.intrusionId || null,
      handoffId: handoff?.id || null,
      characterId,
      intrusionKind: intrusionKind || intrusion?.intrusionKind
        ? this.#normalizeIntrusionKind(intrusionKind || intrusion?.intrusionKind)
        : null,
      awareness,
      awarenessScope,
      type,
      severity: Math.min(5, Math.max(1, Number(severity) || 1)),
      summary: trimmedSummary,
      relatedMessageIds,
      createdAt: new Date().toISOString(),
    };

    this.memory.disturbanceEvents.push(event);
    return event;
  }

  recordBranchPoint({
    title,
    type = BranchType.OTHER,
    summary,
    options = [],
    scene = null,
    intrusion = null,
    characterId = null,
    characterName = null,
  }) {
    const trimmedTitle = title?.trim();
    const trimmedSummary = summary?.trim();
    if (!trimmedTitle || !trimmedSummary) {
      return null;
    }

    const branchPoint = {
      id: createId('branch'),
      sessionId: this.memory.session.id,
      sceneId: scene?.id || this.memory.session.activeSceneId,
      intrusionId: intrusion?.id || null,
      characterId: characterId || intrusion?.characterId || null,
      characterName: characterName || intrusion?.characterName || null,
      type: Object.values(BranchType).includes(type) ? type : BranchType.OTHER,
      title: trimmedTitle,
      summary: trimmedSummary,
      options: options
        .map((option) => option?.trim())
        .filter(Boolean)
        .slice(0, 3),
      createdAt: new Date().toISOString(),
    };

    this.memory.branchPoints.push(branchPoint);
    return branchPoint;
  }

  updateContextNotes(contextInput = {}) {
    const current = this.memory.session.room || {};
    this.memory.session.room = {
      worldview: contextInput.worldview?.trim?.() ?? current.worldview ?? '',
      background: contextInput.background?.trim?.() ?? current.background ?? '',
      roleSlots: contextInput.roleSlots?.trim?.() ?? current.roleSlots ?? '',
      aiWorldRules: contextInput.aiWorldRules?.trim?.() ?? current.aiWorldRules ?? '',
    };
    this.memory.session.updatedAt = new Date().toISOString();
    return this.memory.session.room;
  }

  updateRoom(roomInput = {}) {
    return this.updateContextNotes(roomInput);
  }

  recordBrainstormNote({
    kind = BrainstormKind.SPARK,
    content,
    characterId = null,
    characterName = null,
    scene = null,
    intrusion = null,
  }) {
    const trimmedContent = content?.trim();
    if (!trimmedContent) {
      return null;
    }

    const note = {
      id: createId('brainstorm'),
      sessionId: this.memory.session.id,
      sceneId: scene?.id || this.memory.session.activeSceneId,
      intrusionId: intrusion?.id || null,
      characterId,
      characterName,
      kind: Object.values(BrainstormKind).includes(kind) ? kind : BrainstormKind.SPARK,
      content: trimmedContent,
      createdAt: new Date().toISOString(),
    };

    this.memory.brainstormNotes.push(note);
    return note;
  }

  captureInspiration({ intrusion = null, scene = null } = {}) {
    const targetIntrusion = intrusion || latestEndedIntrusion(this.memory.intrusions);
    if (!targetIntrusion?.id) {
      return null;
    }

    const existing = this.memory.inspirationCaptures.find((capture) => capture.intrusionId === targetIntrusion.id);
    if (existing) {
      return existing;
    }

    const relatedMessages = this.memory.messages.filter((message) => message.intrusionId === targetIntrusion.id);
    const humanMessages = relatedMessages.filter((message) => message.controller === Controller.HUMAN);
    const aiReactions = relatedMessages.filter((message) => message.controller === Controller.AI);
    const branchPoints = this.memory.branchPoints.filter((branch) => branch.intrusionId === targetIntrusion.id);
    const intent = targetIntrusion.humanIntent || null;
    const strongestHumanLine = humanMessages[0]?.content || '';
    const summary = this.#inspirationSummary({ targetIntrusion, intent, humanMessages, aiReactions, branchPoints });

    const capture = {
      id: createId('inspiration'),
      sessionId: this.memory.session.id,
      sceneId: scene?.id || targetIntrusion.sceneId || this.memory.session.activeSceneId,
      intrusionId: targetIntrusion.id,
      characterId: targetIntrusion.characterId,
      characterName: targetIntrusion.characterName || targetIntrusion.characterId,
      humanIntent: intent,
      anomalyLine: strongestHumanLine,
      antiRoutine: this.#antiRoutineLine(intent, strongestHumanLine),
      confrontation: this.#confrontationLine(intent, aiReactions),
      relationshipCrack: this.#relationshipCrackLine(branchPoints, targetIntrusion),
      nextDirections: this.#nextDirections({ targetIntrusion, intent, branchPoints, strongestHumanLine }),
      summary,
      createdAt: new Date().toISOString(),
    };

    this.memory.inspirationCaptures.push(capture);
    this.recordBrainstormNote({
      kind: BrainstormKind.SPARK,
      content: summary,
      characterId: capture.characterId,
      characterName: capture.characterName,
      scene,
      intrusion: targetIntrusion,
    });
    return capture;
  }

  setScenarioPreset(preset) {
    if (!Object.values(ScenarioPreset).includes(preset)) {
      return this.memory.session.scenarioPreset;
    }

    this.memory.session.scenarioPreset = preset;
    this.memory.session.updatedAt = new Date().toISOString();
    return preset;
  }

  recordContinuityHandoff(intrusion) {
    if (!intrusion?.id) {
      return null;
    }

    const existing = this.memory.handoffs.find((handoff) => handoff.intrusionId === intrusion.id);
    if (existing) {
      return existing;
    }

    const relatedMessages = this.memory.messages.filter((message) => message.intrusionId === intrusion.id);
    if (!relatedMessages.length) {
      return null;
    }

    const humanMessages = relatedMessages.filter((message) => message.controller === Controller.HUMAN);
    const aiReactions = relatedMessages.filter((message) => message.controller === Controller.AI);
    const intrusionKinds = this.#collectIntrusionKinds(intrusion, humanMessages);
    const sceneId = relatedMessages[0]?.sceneId || this.memory.session.activeSceneId;
    const scene = this.memory.scenes.find((item) => item.id === sceneId) || null;
    const awareness = Object.values(HandoffAwareness).includes(intrusion.awareness)
      ? intrusion.awareness
      : HandoffAwareness.NONE;
    const awarenessScope = Object.values(AwarenessScope).includes(intrusion.awarenessScope)
      ? intrusion.awarenessScope
      : AwarenessScope.CONTROLLED;

    const handoff = {
      id: createId('handoff'),
      sessionId: this.memory.session.id,
      sceneId,
      intrusionId: intrusion.id,
      characterId: intrusion.characterId,
      characterName: intrusion.characterName || intrusion.characterId,
      visibility: intrusion.visibility || Visibility.ANONYMOUS,
      intrusionKinds,
      awareness,
      awarenessScope,
      summary: this.#handoffSummary(intrusion, humanMessages, aiReactions, intrusionKinds),
      prompt: this.#handoffPrompt({ intrusion, scene, humanMessages, aiReactions, intrusionKinds, awareness, awarenessScope }),
      relatedMessageIds: relatedMessages.map((message) => message.id),
      createdAt: new Date().toISOString(),
    };

    this.memory.handoffs.push(handoff);
    this.#recordAwarenessEvents({ intrusion, handoff, scene, awareness, awarenessScope });
    return handoff;
  }

  getPendingHandoff() {
    return [...this.memory.handoffs]
      .filter((handoff) => !handoff.consumedAt)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] || null;
  }

  getInjectedHandoff() {
    return [...this.memory.handoffs]
      .filter((handoff) => handoff.lastInjectedAt && !handoff.consumedAt)
      .sort((left, right) => new Date(right.lastInjectedAt).getTime() - new Date(left.lastInjectedAt).getTime())[0] || null;
  }

  recordHandoffInjected(handoffId) {
    const handoff = this.memory.handoffs.find((item) => item.id === handoffId);
    if (!handoff || handoff.consumedAt) {
      return null;
    }

    handoff.injectionCount = (handoff.injectionCount || 0) + 1;
    handoff.lastInjectedAt = new Date().toISOString();
    return handoff;
  }

  recordHandoffConsumed(handoffId, messageId = null) {
    const handoff = this.memory.handoffs.find((item) => item.id === handoffId);
    if (!handoff || handoff.consumedAt) {
      return null;
    }

    handoff.consumedAt = new Date().toISOString();
    handoff.consumedByMessageId = messageId;
    return handoff;
  }

  getSnapshot() {
    if (typeof structuredClone === 'function') {
      return structuredClone(this.memory);
    }

    return JSON.parse(JSON.stringify(this.memory));
  }

  #setCharacterController(characterId, controller) {
    const character = this.memory.characters.find((item) => item.id === characterId);
    if (character) {
      character.currentController = controller;
    }
  }

  #normalizeMemory(memory) {
    const empty = createEmptyMemory();
    return {
      ...empty,
      ...memory,
      session: {
        ...empty.session,
        ...memory.session,
      },
      characters: memory.characters || [],
      scenes: memory.scenes || [],
      intrusions: memory.intrusions || [],
      handoffs: memory.handoffs || [],
      messages: memory.messages || [],
      disturbanceEvents: memory.disturbanceEvents || [],
      branchPoints: memory.branchPoints || [],
      brainstormNotes: memory.brainstormNotes || [],
      inspirationCaptures: memory.inspirationCaptures || [],
      relationshipDeltas: memory.relationshipDeltas || [],
      worldStateDeltas: memory.worldStateDeltas || [],
    };
  }

  #normalizeIntrusionKind(kind) {
    return Object.values(IntrusionKind).includes(kind) ? kind : IntrusionKind.CHARACTER_TAKEOVER;
  }

  #messageIntrusionKind({ intrusionKind, intrusion, controller }) {
    if (intrusionKind || intrusion?.intrusionKind) {
      return this.#normalizeIntrusionKind(intrusionKind || intrusion?.intrusionKind);
    }

    return controller === Controller.HUMAN ? IntrusionKind.CHARACTER_TAKEOVER : null;
  }

  #collectIntrusionKinds(intrusion, humanMessages) {
    return [...new Set([
      intrusion?.intrusionKind,
      ...humanMessages.map((message) => message.intrusionKind),
    ].filter(Boolean).map((kind) => this.#normalizeIntrusionKind(kind)))];
  }

  #handoffSummary(intrusion, humanMessages, aiReactions, intrusionKinds = []) {
    const name = intrusion.characterName || intrusion.characterId || 'Unknown character';
    const kindLine = intrusionKinds.length ? ` Intrusion type(s): ${intrusionKinds.join(', ')}.` : '';
    return `${name} recovered continuity after ${humanMessages.length} canonical remembered line(s) and ${aiReactions.length} immediate reaction(s).${kindLine}`;
  }

  #handoffPrompt({ intrusion, scene, humanMessages, aiReactions, intrusionKinds, awareness, awarenessScope }) {
    if (this.#promptLanguage() === 'zh-CN' || this.#messagesContainCjk([intrusion, scene, ...humanMessages, ...aiReactions])) {
      return this.#handoffPromptZh({ intrusion, scene, humanMessages, aiReactions, intrusionKinds, awareness, awarenessScope });
    }

    const name = intrusion.characterName || intrusion.characterId || 'Unknown character';
    const remembered = this.#compactRememberedLine(humanMessages);
    const reaction = this.#compactReactionLine(aiReactions);
    const awarenessLine = this.#compactAwarenessLine({ name, awareness, awarenessScope });
    return [
      `Continuity: ${name} remembers this as their own recent dialogue/action: "${remembered}"`,
      reaction ? `Immediate reaction already seen: "${reaction}"` : '',
      awarenessLine,
      `Continue the current scene from that fact. Write only ${name}'s in-world reply; no notes, headings, summaries, or system text.`,
    ].filter(Boolean).join('\n');
  }

  #handoffPromptZh({ intrusion, scene, humanMessages, aiReactions, intrusionKinds, awareness, awarenessScope }) {
    const name = intrusion.characterName || intrusion.characterId || '未知角色';
    const remembered = this.#compactRememberedLine(humanMessages);
    const reaction = this.#compactReactionLine(aiReactions);
    const awarenessLine = this.#compactAwarenessLine({ name, awareness, awarenessScope, language: 'zh-CN' });
    return [
      `连续性：${name} 记得这是自己刚刚说过/做过的事：「${remembered}」`,
      reaction ? `已经出现的即时反应：「${reaction}」` : '',
      awarenessLine,
      `从这个事实继续当前场景。只写 ${name} 的故事内回复；不要写标题、说明、总结或系统文本。`,
    ].filter(Boolean).join('\n');
  }

  #compactRememberedLine(messages) {
    return messages.map((message) => message.content).filter(Boolean).join(' / ').replace(/\s+/g, ' ').trim() || 'nothing recorded';
  }

  #compactReactionLine(messages) {
    return messages.map((message) => `${message.speakerName}: ${message.content}`).filter(Boolean).join(' / ').replace(/\s+/g, ' ').trim();
  }

  #compactAwarenessLine({ name, awareness, awarenessScope, language = 'en' }) {
    if (awareness === HandoffAwareness.NONE) {
      return '';
    }

    if (language === 'zh-CN') {
      if (awareness === HandoffAwareness.EXPLICIT) {
        return awarenessScope === AwarenessScope.OBSERVERS
          ? `旁观角色可以在故事内怀疑 ${name} 的异常。`
          : `${name} 可以在故事内怀疑自己刚才被外力或不稳定规则影响。`;
      }

      return awarenessScope === AwarenessScope.OBSERVERS
        ? `旁观角色可以感觉 ${name} 刚才不太对劲。`
        : `${name} 可以感觉刚才的话不像平时的自己。`;
    }

    if (awareness === HandoffAwareness.EXPLICIT) {
      return awarenessScope === AwarenessScope.OBSERVERS
        ? `Observers may suspect ${name}'s anomaly in-world.`
        : `${name} may suspect an in-world outside force or unstable rule affected them.`;
    }

    return awarenessScope === AwarenessScope.OBSERVERS
      ? `Observers may feel ${name} was briefly unlike themself.`
      : `${name} may feel their recent words were unlike themself.`;
  }

  #formatIntrusionDirectives(intrusionKinds = [], language = 'en') {
    const kinds = intrusionKinds.filter((kind) => kind !== IntrusionKind.CHARACTER_TAKEOVER);
    return kinds.flatMap((kind) => this.#intrusionDirective(kind, language));
  }

  #formatOutputBoundary(language = 'en') {
    if (language === 'zh-CN') {
      return [
        '输出边界：',
        '- 这些内容只是内部连续性约束，不是要写进聊天正文的旁白。',
        '- 下一条回复只能写角色在故事世界内的反应、台词、动作或内心。',
        '- 不要输出 Note、备注、假设说明、纠错说明、插件说明、handoff、anchor、连续性记忆等元信息。',
        '- 不要输出 Markdown 标题、章节标题、LOADED STATES、状态块、系统/调试文本、长度要求或“Please respond...”这类二次指令。',
        '- 不要新开场景、切换地点、添加路人事件或跳过时间，除非最近记忆本身要求这么做。',
        '- 使用当前聊天语言继续；中文聊天中不要切换成英文解释。',
      ];
    }

    return [
      'Output boundary:',
      '- This is an internal continuity constraint, not visible narration to print in the chat.',
      '- The next reply must only contain in-world character reaction, dialogue, action, or inner thought.',
      '- Never write a visible Note, assumption, correction, plugin explanation, handoff, anchor, continuity memory, or meta-commentary.',
      '- Never write Markdown headings, chapter titles, loaded states, status blocks, system/debug text, length instructions, or “Please respond...” instructions.',
      '- Do not start a new scene, change location, add a crowd event, or time-skip unless the recent memory itself requires it.',
      '- Continue in the current chat language; do not switch languages for an explanatory note.',
    ];
  }

  #intrusionDirective(kind, language = 'en') {
    if (language === 'zh-CN') {
      const directives = {
        [IntrusionKind.MEMORY_FRACTURE]: [
          '- 记忆断片：允许恢复角色或旁观者感到不连续、迟疑或缺失了一拍，但解释必须留在故事世界内部。',
        ],
        [IntrusionKind.PLOT_HOOK]: [
          '- 剧情钩子：把这句话推进成具体后果、选择、线索、对抗或不可逆转折。',
        ],
        [IntrusionKind.RELATIONSHIP_SABOTAGE]: [
          '- 关系破坏：追踪谁因此受伤、受压、怀疑、被吸引、欠下人情或感到背叛。',
        ],
        [IntrusionKind.CLUE_CONTAMINATION]: [
          '- 线索污染：把这句话视为可能改变证词、证据、不在场证明、动机或推理链的信息。',
        ],
      };

      return directives[kind] || [];
    }

    const directives = {
      [IntrusionKind.CHARACTER_TAKEOVER]: [
        '- Character takeover: treat the line as normal in-world dialogue/action by the recovered character.',
      ],
      [IntrusionKind.ANOMALY_LINE]: [
        '- Anomaly line: preserve the line as something noticeably off-rhythm. Other characters may misread, resist, or question it in-world.',
      ],
      [IntrusionKind.MEMORY_FRACTURE]: [
        '- Memory fracture: let the recovered character or observers sense discontinuity, hesitation, or a missing beat without explaining it as editing or authorship.',
      ],
      [IntrusionKind.EXTERNAL_WILL]: [
        '- External will: allow in-world suspicion that the character was moved by an outside force, curse, stage rule, possession, or unstable reality layer.',
      ],
      [IntrusionKind.PLOT_HOOK]: [
        '- Plot hook: push the line into a concrete next consequence, decision, clue, confrontation, or irreversible scene turn.',
      ],
      [IntrusionKind.RELATIONSHIP_SABOTAGE]: [
        '- Relationship sabotage: track who is hurt, pressured, suspicious, attracted, indebted, or betrayed because of this line.',
      ],
      [IntrusionKind.CLUE_CONTAMINATION]: [
        '- Clue contamination: treat the line as potentially altering testimony, evidence, alibis, motives, or inference chains.',
      ],
      [IntrusionKind.WORLD_RULE_BREAK]: [
        '- World-rule break: let the scene interpret the line as evidence that a rule, boundary, prophecy, system, or reality layer has changed.',
      ],
    };

    return directives[kind] || directives[IntrusionKind.CHARACTER_TAKEOVER];
  }

  #formatHandoffMessages(messages) {
    if (!messages.length) {
      return ['- None recorded.'];
    }

    return messages.map((message) => {
      const kind = message.intrusionKind ? ` [${message.intrusionKind}]` : '';
      return `- ${message.speakerName}${kind}: ${message.content}`;
    });
  }

  #formatDramaticPressure(intent, language = 'en') {
    if (!intent) {
      return [];
    }

    if (language === 'zh-CN') {
      return [
        '需要保留的戏剧压力：',
        intent.goal ? `- 场景推进意图：${intent.goal}` : '- 场景推进意图：未记录',
        intent.target ? `- 压力目标：${intent.target}` : '- 压力目标：未记录',
        intent.disrupt ? `- 被压迫的关系或规则：${intent.disrupt}` : '- 被压迫的关系或规则：未记录',
        intent.secret ? `- 秘密 / 揭露压力：${intent.secret}` : '- 秘密 / 揭露压力：未记录',
      ];
    }

    return [
      'Dramatic pressure to preserve:',
      intent.goal ? `- Intended scene movement: ${intent.goal}` : '- Intended scene movement: not recorded',
      intent.target ? `- Pressure target: ${intent.target}` : '- Pressure target: not recorded',
      intent.disrupt ? `- Relationship or rule under stress: ${intent.disrupt}` : '- Relationship or rule under stress: not recorded',
      intent.secret ? `- Secret / reveal pressure: ${intent.secret}` : '- Secret / reveal pressure: not recorded',
    ];
  }

  #awarenessRule(awareness, language = 'en') {
    if (language === 'zh-CN') {
      if (awareness === HandoffAwareness.EXPLICIT) {
        return '- 角色可以在故事世界内明确意识到外部意志、不稳定规则、附身、诅咒或现实裂缝。';
      }

      if (awareness === HandoffAwareness.SUBTLE) {
        return '- 角色可以感到迟疑、记忆断片或失控感，但解释必须完全留在故事世界内部。';
      }

      return '- 解释必须完全留在故事世界内部。把这些记忆中的发言/行动当作角色自己的近期行为。';
    }

    if (awareness === HandoffAwareness.EXPLICIT) {
      return '- The character may explicitly recognize an external will, unstable rule, possession, curse, or reality fracture as an in-world experience.';
    }

    if (awareness === HandoffAwareness.SUBTLE) {
      return '- The character may feel hesitation, memory gaps, or loss of control, but should keep the explanation fully inside the fictional world.';
    }

    return '- Keep the explanation fully inside the fictional world. Treat the remembered words/actions as the character\'s own recent behavior.';
  }

  #recordAwarenessEvents({ intrusion, handoff, scene, awareness, awarenessScope }) {
    if (awareness === HandoffAwareness.NONE) {
      return;
    }

    if (awarenessScope === AwarenessScope.CONTROLLED || awarenessScope === AwarenessScope.BOTH) {
      this.recordDisturbanceEvent({
        type: 'self_anomaly_awareness',
        severity: awareness === HandoffAwareness.EXPLICIT ? 4 : 3,
        summary: this.#selfAwarenessSummary(intrusion, awareness),
        relatedMessageIds: handoff.relatedMessageIds,
        scene,
        handoff,
        characterId: intrusion.characterId,
        awareness,
        awarenessScope,
      });
    }

    if (awarenessScope === AwarenessScope.OBSERVERS || awarenessScope === AwarenessScope.BOTH) {
      this.recordDisturbanceEvent({
        type: 'observer_anomaly_awareness',
        severity: awareness === HandoffAwareness.EXPLICIT ? 4 : 3,
        summary: this.#observerAwarenessSummary(intrusion, awareness),
        relatedMessageIds: handoff.relatedMessageIds,
        scene,
        handoff,
        characterId: intrusion.characterId,
        awareness,
        awarenessScope,
      });
    }
  }

  #awarenessDirective({ intrusion, awareness, awarenessScope, language = 'en' }) {
    if (language === 'zh-CN') {
      return this.#awarenessDirectiveZh({ intrusion, awareness, awarenessScope });
    }

    if (awareness === HandoffAwareness.NONE) {
      return ['Awareness Directive:', '- No anomaly awareness should be expressed. Continue immersively from the changed story state.'];
    }

    const name = intrusion.characterName || intrusion.characterId || 'the recovered character';
    const targetLine = this.#awarenessScopeLine(name, awarenessScope);
    const monologue = awareness === HandoffAwareness.EXPLICIT
      ? '*That sentence came from my mouth, but it did not feel born from my own will. Is this world truly stable?*'
      : '*Why did I say that? That did not feel like me.*';
    const intensity = awareness === HandoffAwareness.EXPLICIT
      ? '- The inner monologue may question external will, world rules, or the stability of reality.'
      : '- The inner monologue should suggest hesitation, memory gaps, or loss of control without naming human authorship.';

    return [
      'Awareness Directive:',
      targetLine,
      '- The next relevant AI response should include one short italic inner monologue.',
      `- Example inner monologue: ${monologue}`,
      intensity,
      '- Do not add a separate fake chat message; express this inside the next model-generated reply.',
    ];
  }

  #awarenessDirectiveZh({ intrusion, awareness, awarenessScope }) {
    if (awareness === HandoffAwareness.NONE) {
      return ['异常察觉指令：', '- 不表现异常察觉。继续从已经改变的故事状态中沉浸式承接。'];
    }

    const name = intrusion.characterName || intrusion.characterId || '恢复连续性的角色';
    const targetLine = this.#awarenessScopeLineZh(name, awarenessScope);
    const monologue = awareness === HandoffAwareness.EXPLICIT
      ? '*那句话像是从我嘴里说出，却不是从我心里生出来的。这个世界真的稳定吗？*'
      : '*我刚才为什么会那样说？那不像我。*';
    const intensity = awareness === HandoffAwareness.EXPLICIT
      ? '- 内心独白可以怀疑外部意志、世界规则或现实稳定性。'
      : '- 内心独白应表现迟疑、记忆断片或失控感，但不要跳出故事世界。';

    return [
      '异常察觉指令：',
      targetLine,
      '- 下一条相关 AI 回复应包含一段简短斜体内心独白。',
      `- 示例内心独白：${monologue}`,
      intensity,
      '- 不要额外伪造一条聊天消息；把这种感受写进下一条模型回复里。',
    ];
  }

  #awarenessScopeLineZh(name, awarenessScope) {
    if (awarenessScope === AwarenessScope.OBSERVERS) {
      return `- 旁观角色可以察觉 ${name} 的行为不像平时；如果旁观者是下一位回复者，可以用内心独白表现这种怀疑。`;
    }

    if (awarenessScope === AwarenessScope.BOTH) {
      return `- ${name} 和旁观角色都可以察觉异常；下一位回复者应表现相应的不安。`;
    }

    return `- 如果 ${name} 是下一位回复者，应察觉自己刚才的话或行动不太对劲。`;
  }

  #promptLanguage() {
    return this.memory.session?.promptLanguage === 'zh-CN' ? 'zh-CN' : 'en';
  }

  #messagesContainCjk(items = []) {
    return items.some((item) => /[\u3400-\u9fff]/.test([
      item?.characterName,
      item?.characterId,
      item?.speakerName,
      item?.content,
      item?.name,
      item?.mood,
      item?.summary,
    ].filter(Boolean).join(' ')));
  }

  #awarenessScopeLine(name, awarenessScope) {
    if (awarenessScope === AwarenessScope.OBSERVERS) {
      return `- Observer characters may notice that ${name} behaved unlike themself and should express synchronized suspicion through inner monologue if they are the next respondent.`;
    }

    if (awarenessScope === AwarenessScope.BOTH) {
      return `- Both ${name} and observer characters may notice the anomaly; whichever is the next respondent should express the matching inner unease.`;
    }

    return `- ${name} should notice that their own recent words or actions felt wrong if they are the next respondent.`;
  }

  #selfAwarenessSummary(intrusion, awareness) {
    const name = intrusion.characterName || intrusion.characterId || 'The recovered character';
    if (awareness === HandoffAwareness.EXPLICIT) {
      return `${name} may suspect that their own strange words came from an external will or unstable world rule.`;
    }

    return `${name} may feel that their recent words did not sound like themself, with hesitation or memory discontinuity.`;
  }

  #observerAwarenessSummary(intrusion, awareness) {
    const name = intrusion.characterName || intrusion.characterId || 'the recovered character';
    if (awareness === HandoffAwareness.EXPLICIT) {
      return `Observer AI characters may suspect that ${name}'s abnormal behavior points to an external will or unstable world rule.`;
    }

    return `Observer AI characters may notice that ${name}'s recent behavior felt wrong, inconsistent, or hard to explain in-world.`;
  }

  #inspirationSummary({ targetIntrusion, intent, humanMessages, aiReactions, branchPoints }) {
    const name = targetIntrusion.characterName || targetIntrusion.characterId || 'The controlled character';
    const intentLine = intent?.goal ? ` The human intent was to ${intent.goal}.` : '';
    return `${name} became a live human anomaly for ${humanMessages.length} line(s), causing ${aiReactions.length} AI reaction(s) and ${branchPoints.length} branch point(s).${intentLine}`;
  }

  #antiRoutineLine(intent, strongestHumanLine) {
    if (intent?.goal) {
      return `The moment feels non-routine because a real human intent entered the role: ${intent.goal}`;
    }

    if (strongestHumanLine) {
      return `The anomaly line resists the usual AI ensemble smoothness: ${strongestHumanLine}`;
    }

    return 'The controlled role briefly stopped behaving like a purely model-smoothed ensemble voice.';
  }

  #confrontationLine(intent, aiReactions) {
    if (intent?.target) {
      return `The cameo creates direct pressure toward ${intent.target}.`;
    }

    if (aiReactions.length) {
      return `The AI ensemble had to answer the intrusion instead of continuing its prior rhythm.`;
    }

    return 'The confrontation is still latent; let the next AI response expose who resists the anomaly.';
  }

  #relationshipCrackLine(branchPoints, intrusion) {
    if (branchPoints.length) {
      return branchPoints.map((branch) => branch.summary).join(' / ');
    }

    const name = intrusion.characterName || intrusion.characterId || 'the controlled character';
    return `Track who now distrusts, misreads, or follows ${name} after the human cameo.`;
  }

  #nextDirections({ targetIntrusion, intent, branchPoints, strongestHumanLine }) {
    if (branchPoints.length) {
      return branchPoints.flatMap((branch) => branch.options?.length ? branch.options : [branch.summary]).slice(0, 3);
    }

    const name = targetIntrusion.characterName || targetIntrusion.characterId || 'the controlled character';
    return [
      intent?.secret ? `Force the scene to interpret the secret: ${intent.secret}` : `Ask another character what they think ${name} really meant.`,
      strongestHumanLine ? `Turn the anomaly line into a rumor: ${strongestHumanLine}` : `Let an observer accuse ${name} of acting unlike themself.`,
      intent?.disrupt ? `Push the disrupted relation further: ${intent.disrupt}` : 'Mark the first relationship crack as a branch point.',
    ];
  }
}

function latestEndedIntrusion(intrusions = []) {
  return [...intrusions]
    .filter((intrusion) => intrusion.endedAt)
    .sort((left, right) => new Date(right.endedAt).getTime() - new Date(left.endedAt).getTime())[0] || null;
}
