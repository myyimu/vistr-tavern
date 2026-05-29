export const MODULE_NAME = 'vistr_tavern';

export const Controller = Object.freeze({
  AI: 'ai',
  HUMAN: 'human',
});

export const Visibility = Object.freeze({
  ANONYMOUS: 'anonymous',
  REVEALED: 'revealed',
});

export const ControlMode = Object.freeze({
  INTRUSION: 'intrusion',
  DIRECTOR: 'director',
});

export const ViewMode = Object.freeze({
  IMMERSION: 'immersion',
  GOD: 'god',
});

export const HandoffAwareness = Object.freeze({
  NONE: 'none',
  SUBTLE: 'subtle',
  EXPLICIT: 'explicit',
});

export const AwarenessScope = Object.freeze({
  CONTROLLED: 'controlled',
  OBSERVERS: 'observers',
  BOTH: 'both',
});

export const BranchType = Object.freeze({
  RELATIONSHIP: 'relationship',
  CONSPIRACY: 'conspiracy',
  IDENTITY: 'identity',
  WORLD_FRACTURE: 'world_fracture',
  CLUE_CONTAMINATION: 'clue_contamination',
  EMOTIONAL_RUPTURE: 'emotional_rupture',
  OTHER: 'other',
});

export function createId(prefix) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function createEmptyMemory(now = new Date()) {
  const createdAt = now.toISOString();

  return {
    schemaVersion: 1,
    session: {
      id: createId('session'),
      title: 'VistrTavern Session',
      createdAt,
      updatedAt: createdAt,
      mode: ViewMode.IMMERSION,
      activeSceneId: null,
    },
    characters: [],
    scenes: [],
    intrusions: [],
    handoffs: [],
    messages: [],
    disturbanceEvents: [],
    branchPoints: [],
    relationshipDeltas: [],
    worldStateDeltas: [],
  };
}

export function normalizeCharacter(rawCharacter, index = 0) {
  const name = rawCharacter?.name || rawCharacter?.avatar || `Character ${index + 1}`;

  return {
    id: rawCharacter?.id || rawCharacter?.avatar || rawCharacter?.name || `char_${index}`,
    name,
    defaultController: Controller.AI,
    currentController: Controller.AI,
    state: {
      emotion: '',
      trust: null,
    },
  };
}

