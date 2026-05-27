import { ExportWriter } from './core/exportWriter.js';
import { IntrusionEngine } from './core/intrusionEngine.js';
import { NarrativeMemory } from './core/narrativeMemory.js';
import { SceneManager } from './core/sceneManager.js';
import { StorageAdapter } from './data/storageAdapter.js';
import { Controller, MODULE_NAME, ViewMode, Visibility, normalizeCharacter } from './data/schema.js';
import { UiOverlay } from './ui/uiOverlay.js';

let storage;
let narrativeMemory;
let sceneManager;
let intrusionEngine;
let exportWriter;
let overlay;
let tickTimer = null;

function getContext() {
  return globalThis.SillyTavern?.getContext?.() || null;
}

globalThis.VistrTavernPromptInterceptor = async function VistrTavernPromptInterceptor(chat) {
  await injectContinuityHandoff(chat);
};

export function onActivate() {
  initialize();
}

initializeWhenReady();

function initializeWhenReady() {
  const context = getContext();
  if (context?.eventSource && context?.event_types?.APP_READY) {
    context.eventSource.on(context.event_types.APP_READY, initialize);
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
}

function initialize() {
  if (overlay) {
    return;
  }

  storage = new StorageAdapter({ getContext });
  narrativeMemory = new NarrativeMemory(storage.load());
  sceneManager = new SceneManager(narrativeMemory.memory);
  intrusionEngine = new IntrusionEngine();
  exportWriter = new ExportWriter();

  syncCharacters();
  bindIntrusionEvents();
  bindSillyTavernEvents();
  ensureDefaultScene();

  overlay = new UiOverlay({
    getCharacters,
    onStartIntrusion: startIntrusion,
    onEndIntrusion: endIntrusion,
    onRecordHumanLine: recordHumanLine,
    onSaveScene: saveScene,
    onExportMarkdown: () => exportWriter.toMarkdown(narrativeMemory.memory),
    onExportJson: () => exportWriter.toJson(narrativeMemory.memory),
    getState,
  });
  overlay.mount();

  tickTimer = globalThis.setInterval(async () => {
    const ended = intrusionEngine.tick();
    if (ended.length) {
      await persist();
      overlay.refresh();
    }
  }, 1000);

  console.info('[VistrTavern] Extension initialized.');
}

function bindIntrusionEvents() {
  intrusionEngine.addEventListener('intrusion:start', async (event) => {
    narrativeMemory.recordIntrusionStarted(event.detail);
    await persist();
  });

  intrusionEngine.addEventListener('intrusion:end', async (event) => {
    narrativeMemory.recordIntrusionEnded(event.detail);
    await persist();
  });
}

function bindSillyTavernEvents() {
  const context = getContext();
  if (!context?.eventSource || !context?.event_types) {
    return;
  }

  const { eventSource, event_types } = context;

  bindEvent(eventSource, event_types.MESSAGE_RECEIVED, async (data) => {
    await captureAiMessage(data);
  });

  bindEvent(eventSource, event_types.CHAT_CHANGED, async () => {
    storage = new StorageAdapter({ getContext });
    narrativeMemory = new NarrativeMemory(storage.load());
    sceneManager = new SceneManager(narrativeMemory.memory);
    syncCharacters();
    ensureDefaultScene();
    overlay?.refresh();
  });

  bindEvent(eventSource, event_types.CHARACTER_EDITED, async () => {
    syncCharacters();
    await persist();
    overlay?.refresh();
  });
}

async function startIntrusion(options) {
  intrusionEngine.startIntrusion(options);
  await persist();
}

async function endIntrusion(characterId) {
  intrusionEngine.endIntrusion(characterId, 'manual');
  await persist();
}

async function saveScene(sceneInput) {
  sceneManager.updateActiveScene(sceneInput);
  await persist();
}

async function recordHumanLine({ characterId, speakerName, content }) {
  const activeScene = sceneManager.getActiveScene();
  const intrusion = intrusionEngine.getActiveIntrusion(characterId);

  const message = narrativeMemory.recordMessage({
    characterId,
    speakerName,
    content,
    controller: Controller.HUMAN,
    visibility: intrusion?.visibility || Visibility.ANONYMOUS,
    scene: activeScene,
    intrusion,
    source: 'vistr-tavern-panel',
  });

  if (message) {
    narrativeMemory.recordDisturbanceEvent({
      type: 'human_anomaly_line',
      severity: activeScene?.tension >= 70 ? 4 : 2,
      summary: `${speakerName} produced a human-controlled anomaly line.`,
      relatedMessageIds: [message.id],
      scene: activeScene,
      intrusion,
    });
  }

  await persist();
}

async function captureAiMessage(eventData) {
  const activeIntrusions = intrusionEngine.getActiveIntrusions();
  const injectedHandoff = narrativeMemory.getInjectedHandoff();
  if (!activeIntrusions.length && !injectedHandoff) {
    return;
  }

  const chatMessage = latestChatMessage();
  const content = eventData?.message || chatMessage?.mes || chatMessage?.message || '';
  const speakerName = eventData?.name || chatMessage?.name || 'AI';
  const character = findCharacterByName(speakerName);
  const activeScene = sceneManager.getActiveScene();

  const message = narrativeMemory.recordMessage({
    characterId: character?.id || speakerName,
    speakerName,
    content,
    controller: Controller.AI,
    visibility: Visibility.REVEALED,
    scene: activeScene,
    intrusion: activeIntrusions[0] || null,
    handoff: activeIntrusions.length ? null : injectedHandoff,
    source: 'sillytavern-message-received',
  });

  if (injectedHandoff && message) {
    narrativeMemory.recordHandoffConsumed(injectedHandoff.id, message.id);
  }

  await persist();
  overlay?.refresh();
}

async function injectContinuityHandoff(chat) {
  if (!Array.isArray(chat) || !narrativeMemory || !storage) {
    return;
  }

  const handoff = narrativeMemory.getPendingHandoff();
  if (!handoff || chat.some((message) => message?.extra?.vistrTavernHandoffId === handoff.id)) {
    return;
  }

  const insertionIndex = chat.length > 0 ? Math.max(0, chat.length - 1) : 0;
  chat.splice(insertionIndex, 0, createHandoffChatMessage(handoff));

  narrativeMemory.recordHandoffInjected(handoff.id);
  await persist();
}

function createHandoffChatMessage(handoff) {
  return {
    name: 'VistrTavern',
    is_user: false,
    is_system: true,
    send_date: Date.now(),
    mes: handoff.prompt,
    extra: {
      type: 'system',
      vistrTavern: true,
      vistrTavernHandoffId: handoff.id,
    },
  };
}

function syncCharacters() {
  narrativeMemory.syncCharacters(getRawCharacters());
}

function bindEvent(eventSource, eventType, handler) {
  if (!eventType || typeof eventSource?.on !== 'function') {
    return;
  }

  eventSource.on(eventType, handler);
}

function getRawCharacters() {
  const context = getContext();
  if (Array.isArray(context?.characters)) {
    return context.characters;
  }

  return [];
}

function getCharacters() {
  const rawCharacters = getRawCharacters();
  if (rawCharacters.length) {
    return rawCharacters.map((character, index) => normalizeCharacter(character, index));
  }

  return narrativeMemory.memory.characters;
}

function findCharacterByName(name) {
  return getCharacters().find((character) => character.name === name) || null;
}

function latestChatMessage() {
  const context = getContext();
  if (!Array.isArray(context?.chat) || !context.chat.length) {
    return null;
  }

  return context.chat[context.chat.length - 1];
}

function ensureDefaultScene() {
  if (!sceneManager.getActiveScene()) {
    sceneManager.setScene({
      name: 'Untitled Disturbance Scene',
      mood: '',
      tension: 50,
      participants: getCharacters().map((character) => character.id),
    });
  }
}

function getState() {
  return {
    viewMode: narrativeMemory.memory.session.mode || ViewMode.IMMERSION,
    activeIntrusions: intrusionEngine.getActiveIntrusions(),
    messageCount: narrativeMemory.memory.messages.length,
    intrusionCount: narrativeMemory.memory.intrusions.length,
    pendingHandoffCount: narrativeMemory.memory.handoffs.filter((handoff) => !handoff.consumedAt).length,
  };
}

async function persist() {
  narrativeMemory.memory = await storage.save(narrativeMemory.memory);
  sceneManager.memory = narrativeMemory.memory;
}

globalThis.VistrTavern = {
  get memory() {
    return narrativeMemory?.memory || null;
  },
  get activeIntrusions() {
    return intrusionEngine?.getActiveIntrusions() || [];
  },
  exportMarkdown() {
    return exportWriter?.toMarkdown(narrativeMemory.memory) || '';
  },
  exportJson() {
    return exportWriter?.toJson(narrativeMemory.memory) || '{}';
  },
  dispose() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    document.getElementById('vistr-tavern-root')?.remove();
    overlay = null;
    console.info(`[${MODULE_NAME}] disposed`);
  },
};
