import { AwarenessScope, Controller, HandoffAwareness, Visibility, createEmptyMemory, createId, normalizeCharacter } from '../data/schema.js';

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
}
