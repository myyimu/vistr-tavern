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

export const IntrusionKind = Object.freeze({
  CHARACTER_TAKEOVER: 'character_takeover',
  ANOMALY_LINE: 'anomaly_line',
  MEMORY_FRACTURE: 'memory_fracture',
  EXTERNAL_WILL: 'external_will',
  PLOT_HOOK: 'plot_hook',
  RELATIONSHIP_SABOTAGE: 'relationship_sabotage',
  CLUE_CONTAMINATION: 'clue_contamination',
  WORLD_RULE_BREAK: 'world_rule_break',
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

export const ScenarioPreset = Object.freeze({
  WEB_NOVEL: 'web_novel',
  MURDER_MYSTERY: 'murder_mystery',
  VIRTUAL_THEATER: 'virtual_theater',
});

export const BrainstormKind = Object.freeze({
  SPARK: 'spark',
  CHARACTER_DRIFT: 'character_drift',
  CONFLICT: 'conflict',
  WRITABLE_SCENE: 'writable_scene',
  NEXT_CAMEO: 'next_cameo',
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
      scenarioPreset: ScenarioPreset.WEB_NOVEL,
      room: {
        worldview: '',
        background: '',
        roleSlots: '',
        aiWorldRules: '',
      },
    },
    characters: [],
    scenes: [],
    intrusions: [],
    handoffs: [],
    messages: [],
    disturbanceEvents: [],
    branchPoints: [],
    brainstormNotes: [],
    inspirationCaptures: [],
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

