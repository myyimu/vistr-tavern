import { AwarenessScope, BrainstormKind, BranchType, Controller, HandoffAwareness, ScenarioPreset, Visibility, createEmptyMemory, createId, normalizeCharacter } from '../data/schema.js';

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

  updateRoom(roomInput = {}) {
    const current = this.memory.session.room || {};
    this.memory.session.room = {
      worldview: roomInput.worldview?.trim?.() ?? current.worldview ?? '',
      background: roomInput.background?.trim?.() ?? current.background ?? '',
      roleSlots: roomInput.roleSlots?.trim?.() ?? current.roleSlots ?? '',
      aiWorldRules: roomInput.aiWorldRules?.trim?.() ?? current.aiWorldRules ?? '',
    };
    this.memory.session.updatedAt = new Date().toISOString();
    return this.memory.session.room;
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
      awareness,
      awarenessScope,
      summary: this.#handoffSummary(intrusion, humanMessages, aiReactions),
      prompt: this.#handoffPrompt({ intrusion, scene, humanMessages, aiReactions, awareness, awarenessScope }),
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

  #handoffSummary(intrusion, humanMessages, aiReactions) {
    const name = intrusion.characterName || intrusion.characterId || 'Unknown character';
    return `${name} returned to AI control after ${humanMessages.length} canonical human-controlled line(s) and ${aiReactions.length} AI reaction(s).`;
  }

  #handoffPrompt({ intrusion, scene, humanMessages, aiReactions, awareness, awarenessScope }) {
    const name = intrusion.characterName || intrusion.characterId || 'Unknown character';
    const sceneLine = scene
      ? `Scene: ${scene.name}${scene.mood ? `, mood: ${scene.mood}` : ''}, tension: ${scene.tension}.`
      : 'Scene: current active scene.';

    const lines = [
      '[VistrTavern Continuity Handoff]',
      `Character returning to AI control: ${name}.`,
      sceneLine,
      '',
      'These events are canonical. Continue from them instead of ignoring, soft-resetting, or rewriting them.',
      '',
      'Human-controlled character actions:',
      ...this.#formatHandoffMessages(humanMessages),
      '',
      ...this.#formatHumanIntent(intrusion.humanIntent),
      '',
      'AI reactions during the intrusion:',
      ...this.#formatHandoffMessages(aiReactions),
      '',
      'Continuity rules:',
      '- Treat the human-controlled lines as actions and dialogue that really happened in the story.',
      '- Preserve emotional, relationship, and world-state consequences created by the intrusion.',
      this.#awarenessRule(awareness),
      '',
      ...this.#awarenessDirective({ intrusion, awareness, awarenessScope }),
    ];

    return lines.join('\n');
  }

  #formatHandoffMessages(messages) {
    if (!messages.length) {
      return ['- None recorded.'];
    }

    return messages.map((message) => `- ${message.speakerName}: ${message.content}`);
  }

  #formatHumanIntent(intent) {
    if (!intent) {
      return ['Human creative intent: not recorded.'];
    }

    return [
      'Human creative intent:',
      intent.goal ? `- Goal: ${intent.goal}` : '- Goal: not recorded',
      intent.target ? `- Target: ${intent.target}` : '- Target: not recorded',
      intent.disrupt ? `- Intended disruption: ${intent.disrupt}` : '- Intended disruption: not recorded',
      intent.secret ? `- Secret / reveal: ${intent.secret}` : '- Secret / reveal: not recorded',
    ];
  }

  #awarenessRule(awareness) {
    if (awareness === HandoffAwareness.EXPLICIT) {
      return '- The character may explicitly recognize an external will or takeover as an in-world experience.';
    }

    if (awareness === HandoffAwareness.SUBTLE) {
      return '- The character may feel hesitation, memory gaps, or loss of control, but should not explain it as human authorship.';
    }

    return '- Do not mention human control, takeover, or external authorship in-world. Treat the lines as the character\'s own actions.';
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

  #awarenessDirective({ intrusion, awareness, awarenessScope }) {
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
      intent?.secret ? `Force the room to interpret the secret: ${intent.secret}` : `Ask another character what they think ${name} really meant.`,
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
