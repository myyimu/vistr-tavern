import { ControlMode, Controller, HandoffAwareness, Visibility, createId } from '../data/schema.js';

export class IntrusionEngine extends EventTarget {
  constructor({ now = () => Date.now() } = {}) {
    super();
    this.now = now;
    this.activeIntrusions = new Map();
  }

  startIntrusion({
    characterId,
    characterName = '',
    durationMs = 5 * 60 * 1000,
    visibility = Visibility.ANONYMOUS,
    mode = ControlMode.INTRUSION,
    awareness = HandoffAwareness.NONE,
  }) {
    if (!characterId) {
      throw new Error('characterId is required to start an intrusion.');
    }

    const startedAtMs = this.now();
    const intrusion = {
      id: createId('intrusion'),
      characterId,
      characterName,
      mode,
      visibility,
      controller: Controller.HUMAN,
      awareness,
      startedAt: new Date(startedAtMs).toISOString(),
      endsAt: new Date(startedAtMs + durationMs).toISOString(),
      endedAt: null,
      endReason: null,
    };

    const existing = this.activeIntrusions.get(characterId);
    if (existing) {
      this.endIntrusion(characterId, 'replaced');
    }

    this.activeIntrusions.set(characterId, intrusion);
    this.#emit('intrusion:start', intrusion);
    return intrusion;
  }

  endIntrusion(characterId, reason = 'manual') {
    const intrusion = this.activeIntrusions.get(characterId);
    if (!intrusion) {
      return null;
    }

    const ended = {
      ...intrusion,
      endedAt: new Date(this.now()).toISOString(),
      endReason: reason,
    };

    this.activeIntrusions.delete(characterId);
    this.#emit('intrusion:end', ended);
    return ended;
  }

  tick(now = this.now()) {
    const ended = [];

    for (const intrusion of this.activeIntrusions.values()) {
      if (new Date(intrusion.endsAt).getTime() <= now) {
        ended.push(this.endIntrusion(intrusion.characterId, 'timeout'));
      }
    }

    return ended.filter(Boolean);
  }

  getController(characterId) {
    return this.activeIntrusions.has(characterId) ? Controller.HUMAN : Controller.AI;
  }

  isHumanControlled(characterId) {
    return this.getController(characterId) === Controller.HUMAN;
  }

  getActiveIntrusion(characterId) {
    return this.activeIntrusions.get(characterId) || null;
  }

  getActiveIntrusions() {
    return [...this.activeIntrusions.values()];
  }

  getRemainingMs(characterId, now = this.now()) {
    const intrusion = this.activeIntrusions.get(characterId);
    if (!intrusion) {
      return 0;
    }

    return Math.max(0, new Date(intrusion.endsAt).getTime() - now);
  }

  #emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

