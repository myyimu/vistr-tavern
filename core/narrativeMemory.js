import { Controller, Visibility, createEmptyMemory, createId, normalizeCharacter } from '../data/schema.js';

export class NarrativeMemory {
  constructor(memory = createEmptyMemory()) {
    this.memory = memory;
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
      intrusionId: intrusion?.id || null,
      characterId: characterId || intrusion?.characterId || null,
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

  recordDisturbanceEvent({ type, severity = 1, summary, relatedMessageIds = [], scene = null, intrusion = null }) {
    const trimmedSummary = summary?.trim();
    if (!trimmedSummary) {
      return null;
    }

    const event = {
      id: createId('event'),
      sessionId: this.memory.session.id,
      sceneId: scene?.id || this.memory.session.activeSceneId,
      intrusionId: intrusion?.id || null,
      type,
      severity: Math.min(5, Math.max(1, Number(severity) || 1)),
      summary: trimmedSummary,
      relatedMessageIds,
      createdAt: new Date().toISOString(),
    };

    this.memory.disturbanceEvents.push(event);
    return event;
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
}
