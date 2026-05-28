import { ExportWriter } from './core/exportWriter.js';
import { IntrusionEngine } from './core/intrusionEngine.js';
import { NarrativeMemory } from './core/narrativeMemory.js';
import { SceneManager } from './core/sceneManager.js';
import { StorageAdapter } from './data/storageAdapter.js';
import { Controller, MODULE_NAME, ViewMode, Visibility, normalizeCharacter } from './data/schema.js';
import { UiOverlay } from './ui/uiOverlay.js';

const EXTENSION_VERSION = '0.1.0-alpha';

let storage;
let narrativeMemory;
let sceneManager;
let intrusionEngine;
let exportWriter;
let overlay;
let tickTimer = null;
const runtimeDebug = {
  lastInterceptorCallAt: null,
  lastInjectionResult: 'not-called',
  lastInjectionHandoffId: null,
  lastInjectionError: null,
  lastCapturedAiMessage: null,
  lastConsumedHandoffId: null,
  lastConsumedAt: null,
  lastError: null,
};

function getContext() {
  return globalThis.SillyTavern?.getContext?.() || null;
}

function exposeGlobal(name, value) {
  globalThis[name] = value;
  if (typeof window !== 'undefined') {
    window[name] = value;
  }
  if (typeof document !== 'undefined' && document.defaultView) {
    document.defaultView[name] = value;
  }
}

exposeGlobal('VistrTavernPromptInterceptor', async function VistrTavernPromptInterceptor(chat) {
  runtimeDebug.lastInterceptorCallAt = new Date().toISOString();

  try {
    const result = await injectContinuityHandoff(chat);
    runtimeDebug.lastInjectionResult = result.status;
    runtimeDebug.lastInjectionHandoffId = result.handoffId || null;
    runtimeDebug.lastInjectionError = null;
  } catch (error) {
    recordError('prompt_interceptor_failed', error);
    runtimeDebug.lastInjectionResult = 'error';
    runtimeDebug.lastInjectionHandoffId = null;
    runtimeDebug.lastInjectionError = error?.message || String(error);
  }
});

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
    onCopyLatestHandoff: copyLatestHandoff,
    onExportMarkdown: () => exportWriter.toMarkdown(narrativeMemory.memory),
    onExportJson: () => exportWriter.toJson(narrativeMemory.memory),
    getState,
    getDebugState,
  });
  overlay.mount();
  publishDebugState();

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
    runtimeDebug.lastConsumedHandoffId = injectedHandoff.id;
    runtimeDebug.lastConsumedAt = new Date().toISOString();
  }

  if (message) {
    runtimeDebug.lastCapturedAiMessage = {
      id: message.id,
      speakerName: message.speakerName,
      intrusionId: message.intrusionId,
      handoffId: message.handoffId,
      createdAt: message.createdAt,
    };
  }

  await persist();
  overlay?.refresh();
}

async function injectContinuityHandoff(chat) {
  if (!Array.isArray(chat) || !narrativeMemory || !storage) {
    return { status: 'skipped:not-ready' };
  }

  const handoff = narrativeMemory.getPendingHandoff();
  if (!handoff || chat.some((message) => message?.extra?.vistrTavernHandoffId === handoff.id)) {
    return {
      status: handoff ? 'skipped:duplicate' : 'skipped:no-pending-handoff',
      handoffId: handoff?.id || null,
    };
  }

  const insertionIndex = chat.length > 0 ? Math.max(0, chat.length - 1) : 0;
  chat.splice(insertionIndex, 0, createHandoffChatMessage(handoff));

  narrativeMemory.recordHandoffInjected(handoff.id);
  await persist();

  return { status: 'injected', handoffId: handoff.id };
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

function copyLatestHandoff() {
  const handoff = latestHandoff();
  if (!handoff) {
    return '';
  }

  return handoff.prompt;
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
    awarenessEventCount: awarenessEvents().length,
    debug: getDebugState(),
  };
}

function getDebugState() {
  const handoffs = narrativeMemory?.memory?.handoffs || [];

  return {
    version: EXTENSION_VERSION,
    storageMode: storage?.getStorageMode?.() || 'unknown',
    activeIntrusions: intrusionEngine?.getActiveIntrusions?.() || [],
    pendingHandoff: summarizeHandoff(narrativeMemory?.getPendingHandoff?.() || null),
    lastInjectedHandoff: summarizeHandoff(latestBy(handoffs, 'lastInjectedAt')),
    lastConsumedHandoff: summarizeHandoff(latestBy(handoffs, 'consumedAt')),
    awarenessEventCount: awarenessEvents().length,
    lastCapturedAiMessage: runtimeDebug.lastCapturedAiMessage,
    lastInterceptorCallAt: runtimeDebug.lastInterceptorCallAt,
    lastInjectionResult: runtimeDebug.lastInjectionResult,
    lastInjectionHandoffId: runtimeDebug.lastInjectionHandoffId,
    lastInjectionError: runtimeDebug.lastInjectionError,
    lastConsumedHandoffId: runtimeDebug.lastConsumedHandoffId,
    lastConsumedAt: runtimeDebug.lastConsumedAt,
    lastError: runtimeDebug.lastError,
  };
}

function publishDebugState() {
  const root = document.getElementById('vistr-tavern-root');
  if (!root) {
    return;
  }

  root.dataset.vtDebugState = JSON.stringify(getDebugState());
}

function summarizeHandoff(handoff) {
  if (!handoff) {
    return null;
  }

  return {
    id: handoff.id,
    characterName: handoff.characterName,
    awareness: handoff.awareness,
    awarenessScope: handoff.awarenessScope || 'controlled',
    createdAt: handoff.createdAt,
    lastInjectedAt: handoff.lastInjectedAt || null,
    consumedAt: handoff.consumedAt || null,
    injectionCount: handoff.injectionCount || 0,
    summary: handoff.summary,
  };
}

function awarenessEvents() {
  return (narrativeMemory?.memory?.disturbanceEvents || [])
    .filter((event) => event.type === 'self_anomaly_awareness' || event.type === 'observer_anomaly_awareness');
}

function latestHandoff() {
  return latestBy(narrativeMemory?.memory?.handoffs || [], 'createdAt');
}

function latestBy(items, field) {
  return [...items]
    .filter((item) => item?.[field])
    .sort((left, right) => new Date(right[field]).getTime() - new Date(left[field]).getTime())[0] || null;
}

function recordError(type, error) {
  runtimeDebug.lastError = {
    type,
    message: error?.message || String(error),
    at: new Date().toISOString(),
  };
  console.warn(`[VistrTavern] ${type}`, error);
}

async function persist() {
  try {
    narrativeMemory.memory = await storage.save(narrativeMemory.memory);
    sceneManager.memory = narrativeMemory.memory;
    publishDebugState();
  } catch (error) {
    recordError('persist_failed', error);
    throw error;
  }
}

exposeGlobal('VistrTavern', {
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
  getDebugState,
  dispose() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    document.getElementById('vistr-tavern-root')?.remove();
    overlay = null;
    console.info(`[${MODULE_NAME}] disposed`);
  },
});
