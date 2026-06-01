import { ExportWriter } from './core/exportWriter.js';
import { IntrusionEngine } from './core/intrusionEngine.js';
import { NarrativeMemory } from './core/narrativeMemory.js';
import { SceneManager } from './core/sceneManager.js';
import { StorageAdapter } from './data/storageAdapter.js';
import { Controller, IntrusionKind, MODULE_NAME, ScenarioPreset, ViewMode, Visibility, normalizeCharacter } from './data/schema.js';
import { EXTENSION_VERSION } from './data/version.js';
import { UiOverlay } from './ui/uiOverlay.js';

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
  lastTakeoverSend: null,
  pendingTakeoverSend: null,
  pendingReactionAnchor: null,
  lastReactionAnchor: null,
  lastConsumedHandoffId: null,
  lastConsumedAt: null,
  lastError: null,
  compatibility: null,
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
    const result = await injectVistrTavernContext(chat);
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
  runtimeDebug.compatibility = inspectCompatibility();
  ensureDefaultScene();

  overlay = new UiOverlay({
    getCharacters,
    onStartIntrusion: startIntrusion,
    onEndIntrusion: endIntrusion,
    onSendHumanLineAsCharacter: sendHumanLineAsCharacter,
    onRecordHumanLine: recordHumanLine,
    onMarkBranchPoint: markBranchPoint,
    onSetScenarioPreset: setScenarioPreset,
    onLanguageChange: setPromptLanguage,
    onSaveRoom: saveRoom,
    onCaptureInspiration: captureInspiration,
    onSaveBrainstormNote: saveBrainstormNote,
    onSaveScene: saveScene,
    onCopyLatestHandoff: copyLatestHandoff,
    onExportMarkdown: () => exportWriter.toMarkdown(narrativeMemory.memory),
    onExportCreatorPack: () => exportWriter.toCreatorPack(narrativeMemory.memory),
    onExportOrganizedMaterial: (language) => exportWriter.toOrganizedMaterial(narrativeMemory.memory, { language }),
    onExportCharacterSheetPrompt: () => exportWriter.toCharacterSheetPrompt(narrativeMemory.memory),
    onExportJson: () => exportWriter.toJson(narrativeMemory.memory),
    getState,
    getDebugState,
  });
  setPromptLanguage(overlay.language).catch((error) => recordError('prompt_language_sync_failed', error));
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

async function sendHumanLineAsCharacter({ characterId, speakerName, content, intrusionKind = IntrusionKind.CHARACTER_TAKEOVER }) {
  const trimmed = String(content || '').trim();
  if (!trimmed) {
    return null;
  }

  runtimeDebug.pendingTakeoverSend = {
    characterId,
    speakerName,
    content: trimmed,
    intrusionKind,
    createdAt: new Date().toISOString(),
  };

  try {
    const delivery = await deliverCharacterMessage({ speakerName, content: trimmed });
    runtimeDebug.lastTakeoverSend = {
      characterId,
      speakerName,
      contentPreview: trimmed.slice(0, 120),
      intrusionKind,
      method: delivery.method,
      ok: true,
      at: new Date().toISOString(),
    };

    const message = await recordHumanLine({
      characterId,
      speakerName,
      content: trimmed,
      intrusionKind,
      source: `sillytavern-${delivery.method}`,
    });

    return { delivery, message };
  } catch (error) {
    runtimeDebug.pendingTakeoverSend = null;
    runtimeDebug.lastTakeoverSend = {
      characterId,
      speakerName,
      contentPreview: trimmed.slice(0, 120),
      intrusionKind,
      method: 'failed',
      ok: false,
      at: new Date().toISOString(),
      error: error?.message || String(error),
    };
    recordError('send_as_character_failed', error);
    throw error;
  }
}

async function recordHumanLine({ characterId, speakerName, content, intrusionKind = IntrusionKind.CHARACTER_TAKEOVER, source = 'vistr-tavern-panel' }) {
  const activeScene = sceneManager.getActiveScene();
  const intrusion = intrusionEngine.getActiveIntrusion(characterId);
  const normalizedKind = Object.values(IntrusionKind).includes(intrusionKind)
    ? intrusionKind
    : IntrusionKind.CHARACTER_TAKEOVER;

  const message = narrativeMemory.recordMessage({
    characterId,
    speakerName,
    content,
    controller: Controller.HUMAN,
    visibility: intrusion?.visibility || Visibility.ANONYMOUS,
    intrusionKind: normalizedKind,
    scene: activeScene,
    intrusion,
    source,
  });

  if (message) {
    runtimeDebug.pendingReactionAnchor = createReactionAnchor({ message, intrusion, scene: activeScene });
    narrativeMemory.recordDisturbanceEvent({
      type: 'human_anomaly_line',
      severity: activeScene?.tension >= 70 ? 4 : 2,
      summary: `${speakerName} produced a human-controlled ${intrusionKindLabel(normalizedKind)}. ${intrusionKindEffect(normalizedKind)}`,
      relatedMessageIds: [message.id],
      scene: activeScene,
      intrusion,
      intrusionKind: normalizedKind,
    });
  }

  await persist();
  return message;
}

function intrusionKindLabel(kind) {
  const labels = {
    [IntrusionKind.CHARACTER_TAKEOVER]: 'character takeover line',
    [IntrusionKind.ANOMALY_LINE]: 'anomaly line',
    [IntrusionKind.MEMORY_FRACTURE]: 'memory-fracture line',
    [IntrusionKind.EXTERNAL_WILL]: 'external-will signal',
    [IntrusionKind.PLOT_HOOK]: 'plot hook',
    [IntrusionKind.RELATIONSHIP_SABOTAGE]: 'relationship sabotage',
    [IntrusionKind.CLUE_CONTAMINATION]: 'clue contamination',
    [IntrusionKind.WORLD_RULE_BREAK]: 'world-rule break',
  };

  return labels[kind] || labels[IntrusionKind.CHARACTER_TAKEOVER];
}

function intrusionKindEffect(kind) {
  const effects = {
    [IntrusionKind.CHARACTER_TAKEOVER]: 'The story should treat it as a canonical role action.',
    [IntrusionKind.ANOMALY_LINE]: 'The room may misread or resist its off-rhythm quality.',
    [IntrusionKind.MEMORY_FRACTURE]: 'The character may later feel discontinuity or a missing beat.',
    [IntrusionKind.EXTERNAL_WILL]: 'The scene may frame it as outside influence or unstable reality.',
    [IntrusionKind.PLOT_HOOK]: 'The line should open a concrete next consequence.',
    [IntrusionKind.RELATIONSHIP_SABOTAGE]: 'Track the relationship pressure or betrayal it creates.',
    [IntrusionKind.CLUE_CONTAMINATION]: 'Treat it as evidence that can bend testimony or inference chains.',
    [IntrusionKind.WORLD_RULE_BREAK]: 'Let the world treat it as a rule or boundary fracture.',
  };

  return effects[kind] || effects[IntrusionKind.CHARACTER_TAKEOVER];
}

async function deliverCharacterMessage({ speakerName, content }) {
  const context = getContext();
  if (!context) {
    throw new Error('SillyTavern context is unavailable.');
  }

  if (typeof context.executeSlashCommandsWithOptions === 'function') {
    const command = `/sendas name="${escapeSlashCommandArg(speakerName)}" ${content}`;
    const chatLengthBefore = Array.isArray(context.chat) ? context.chat.length : null;
    const result = await context.executeSlashCommandsWithOptions(command, {
      handleParserErrors: true,
      handleExecutionErrors: true,
      source: 'VistrTavern',
    });

    if (result?.isError) {
      throw new Error(result.errorMessage || 'SillyTavern /sendas failed.');
    }

    if (chatLengthBefore !== null && Array.isArray(context.chat) && context.chat.length <= chatLengthBefore) {
      throw new Error('SillyTavern /sendas did not insert a chat message.');
    }

    return { method: 'sendas', result };
  }

  return deliverCharacterMessageDirectly(context, { speakerName, content });
}

async function deliverCharacterMessageDirectly(context, { speakerName, content }) {
  if (!Array.isArray(context.chat) || typeof context.addOneMessage !== 'function') {
    throw new Error('SillyTavern chat insertion APIs are unavailable.');
  }

  const character = findRawCharacterByName(speakerName);
  const message = createCharacterChatMessage(context, character, { speakerName, content });
  const eventTypes = context.eventTypes || context.event_types || {};
  const messageIndex = context.chat.push(message) - 1;

  if (eventTypes.MESSAGE_RECEIVED) {
    await context.eventSource?.emit?.(eventTypes.MESSAGE_RECEIVED, messageIndex, 'vistr-tavern');
  }

  context.addOneMessage(message);

  if (eventTypes.CHARACTER_MESSAGE_RENDERED) {
    await context.eventSource?.emit?.(eventTypes.CHARACTER_MESSAGE_RENDERED, messageIndex, 'vistr-tavern');
  }

  await context.saveChat?.();

  return { method: 'direct-chat-insert', messageIndex };
}

function createCharacterChatMessage(context, character, { speakerName, content }) {
  const now = Date.now();
  const originalAvatar = character?.avatar || null;
  const forceAvatar = originalAvatar && typeof context.getThumbnailUrl === 'function'
    ? context.getThumbnailUrl('avatar', originalAvatar)
    : undefined;
  const mes = typeof context.substituteParams === 'function'
    ? context.substituteParams(content)
    : content;
  const extra = {
    gen_id: now,
    api: 'manual',
    model: 'vistr-tavern takeover',
    vistrTavern: true,
    vistrTavernTakeover: true,
    vistrTavernController: 'human',
  };

  return {
    name: character?.name || speakerName,
    is_user: false,
    is_system: false,
    send_date: now,
    mes,
    force_avatar: forceAvatar,
    original_avatar: originalAvatar,
    extra,
    swipe_id: 0,
    swipes: [mes],
    swipe_info: [{
      send_date: now,
      gen_started: null,
      gen_finished: null,
      extra,
    }],
  };
}

function escapeSlashCommandArg(value) {
  return String(value ?? '').replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

async function markBranchPoint({ characterId, characterName, title, type, summary, options }) {
  const activeScene = sceneManager.getActiveScene();
  const intrusion = latestIntrusionForCharacter(characterId);
  const branchPoint = narrativeMemory.recordBranchPoint({
    characterId,
    characterName,
    title,
    type,
    summary,
    options,
    scene: activeScene,
    intrusion,
  });

  if (!branchPoint) {
    return null;
  }

  narrativeMemory.recordDisturbanceEvent({
    type: 'branch_point_marked',
    severity: activeScene?.tension >= 70 ? 4 : 2,
    summary: `Branch point marked: ${branchPoint.title}. ${branchPoint.summary}`,
    scene: activeScene,
    intrusion,
    characterId,
  });

  await persist();
  return branchPoint;
}

async function setScenarioPreset(preset) {
  narrativeMemory.setScenarioPreset(preset);
  await persist();
}

async function setPromptLanguage(language, { persistChange = true } = {}) {
  if (!narrativeMemory?.memory?.session) {
    return;
  }

  narrativeMemory.memory.session.promptLanguage = normalizePromptLanguage(language);
  narrativeMemory.memory.session.updatedAt = new Date().toISOString();
  if (persistChange) {
    await persist();
  }
}

async function saveRoom(roomInput) {
  narrativeMemory.updateRoom(roomInput);
  await persist();
}

async function captureInspiration(characterId = null) {
  const activeScene = sceneManager.getActiveScene();
  const intrusion = latestIntrusionForCharacter(characterId);
  const capture = narrativeMemory.captureInspiration({ intrusion, scene: activeScene });
  if (!capture) {
    return null;
  }

  narrativeMemory.recordDisturbanceEvent({
    type: 'inspiration_captured',
    severity: 2,
    summary: `Creator captured interaction inspiration from ${capture.characterName || capture.characterId}.`,
    scene: activeScene,
    intrusion,
    characterId: capture.characterId,
  });

  await persist();
  return capture;
}

async function saveBrainstormNote({ kind, content, characterId, characterName }) {
  const activeScene = sceneManager.getActiveScene();
  const intrusion = latestIntrusionForCharacter(characterId);
  const note = narrativeMemory.recordBrainstormNote({
    kind,
    content,
    characterId,
    characterName,
    scene: activeScene,
    intrusion,
  });

  if (!note) {
    return null;
  }

  await persist();
  return note;
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
  if (shouldIgnoreTakeoverSend({ speakerName, content, chatMessage })) {
    return;
  }

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
    consumeReactionAnchor(message);
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

function createReactionAnchor({ message, intrusion, scene }) {
  if (!message?.id || !intrusion?.id) {
    return null;
  }

  return {
    id: `reaction_${message.id}`,
    messageId: message.id,
    intrusionId: intrusion.id,
    characterId: message.characterId,
    characterName: message.speakerName,
    content: message.content,
    intrusionKind: message.intrusionKind || IntrusionKind.CHARACTER_TAKEOVER,
    sceneName: scene?.name || null,
    createdAt: new Date().toISOString(),
    injectedAt: null,
  };
}

function consumeReactionAnchor(message) {
  const anchor = runtimeDebug.pendingReactionAnchor;
  if (!anchor) {
    return;
  }

  runtimeDebug.lastReactionAnchor = {
    ...anchor,
    consumedAt: new Date().toISOString(),
    consumedByMessageId: message.id,
    consumedBySpeakerName: message.speakerName,
  };
  runtimeDebug.pendingReactionAnchor = null;
}

function shouldIgnoreTakeoverSend({ speakerName, content, chatMessage }) {
  const pending = runtimeDebug.pendingTakeoverSend;
  if (!pending) {
    return false;
  }

  const createdAt = new Date(pending.createdAt).getTime();
  const isFresh = Number.isFinite(createdAt) && Date.now() - createdAt < 15_000;
  const namesMatch = normalizeComparableText(speakerName) === normalizeComparableText(pending.speakerName);
  const contentMatches = normalizeComparableText(content || chatMessage?.mes || '') === normalizeComparableText(pending.content);

  if (isFresh && namesMatch && contentMatches) {
    runtimeDebug.pendingTakeoverSend = null;
    return true;
  }

  if (!isFresh) {
    runtimeDebug.pendingTakeoverSend = null;
  }

  return false;
}

async function injectVistrTavernContext(chat) {
  if (!Array.isArray(chat) || !narrativeMemory || !storage) {
    return { status: 'skipped:not-ready' };
  }

  const anchorResult = injectReactionAnchor(chat);
  const handoffResult = await injectContinuityHandoff(chat);

  if (anchorResult.status === 'injected' && handoffResult.status === 'injected') {
    return {
      status: 'injected:reaction-anchor+handoff',
      handoffId: handoffResult.handoffId,
      reactionAnchorId: anchorResult.reactionAnchorId,
    };
  }

  if (anchorResult.status === 'injected') {
    return anchorResult;
  }

  if (anchorResult.status === 'skipped:duplicate-reaction-anchor') {
    return anchorResult;
  }

  return handoffResult;
}

function injectReactionAnchor(chat) {
  const anchor = runtimeDebug.pendingReactionAnchor;
  if (!anchor) {
    return { status: 'skipped:no-reaction-anchor' };
  }

  if (chat.some((message) => message?.extra?.vistrTavernReactionAnchorId === anchor.id)) {
    return { status: 'skipped:duplicate-reaction-anchor', reactionAnchorId: anchor.id };
  }

  const insertionIndex = chat.length;
  chat.splice(insertionIndex, 0, createReactionAnchorChatMessage(anchor));
  runtimeDebug.pendingReactionAnchor = {
    ...anchor,
    injectedAt: new Date().toISOString(),
  };

  return { status: 'injected:reaction-anchor', reactionAnchorId: anchor.id };
}

async function injectContinuityHandoff(chat) {
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

function createReactionAnchorChatMessage(anchor) {
  return {
    name: 'VistrTavern',
    is_user: false,
    is_system: true,
    send_date: Date.now(),
    mes: createReactionAnchorPrompt(anchor),
    extra: {
      type: 'system',
      vistrTavern: true,
      vistrTavernReactionAnchorId: anchor.id,
    },
  };
}

function createReactionAnchorPrompt(anchor) {
  if (currentPromptLanguage() === 'zh-CN') {
    return createReactionAnchorPromptZh(anchor);
  }

  const name = anchor.characterName || 'the recovered character';
  const sceneLine = anchor.sceneName ? `Scene: ${anchor.sceneName}.` : 'Scene: current chat.';
  return [
    '[Immediate Continuity Anchor]',
    sceneLine,
    `${name} just said or did the following, and this is now the current topic:`,
    `"${anchor.content}"`,
    '',
    'For the next response:',
    `- React directly to ${name}'s latest words/actions before continuing any previous topic.`,
    `- Treat those words/actions as ${name}'s own recent behavior in the fictional world.`,
    '- Preserve the immediate emotional, relationship, clue, or plot consequence.',
    '- Do not skip past this moment or resume the previous topic unchanged.',
  ].join('\n');
}

function createReactionAnchorPromptZh(anchor) {
  const name = anchor.characterName || '恢复连续性的角色';
  const sceneLine = anchor.sceneName ? `场景：${anchor.sceneName}。` : '场景：当前聊天。';
  return [
    '[即时连续性锚点]',
    sceneLine,
    `${name} 刚刚说出或做出了以下内容，这已经是当前话题：`,
    `「${anchor.content}」`,
    '',
    '下一条回复必须：',
    `- 先直接回应 ${name} 刚才的话或行动，再继续任何旧话题。`,
    `- 把这些话或行动当成 ${name} 在故事世界里的近期真实行为。`,
    '- 承接它造成的即时情绪、关系、线索或剧情后果。',
    '- 不要跳过这个瞬间，也不要原样回到之前的话题。',
  ].join('\n');
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

function findRawCharacterByName(name) {
  return getRawCharacters().find((character) => character?.name === name || character?.avatar === name) || null;
}

function latestChatMessage() {
  const context = getContext();
  if (!Array.isArray(context?.chat) || !context.chat.length) {
    return null;
  }

  return context.chat[context.chat.length - 1];
}

function latestIntrusionForCharacter(characterId) {
  return [...(narrativeMemory?.memory?.intrusions || [])]
    .filter((intrusion) => !characterId || intrusion.characterId === characterId)
    .sort((left, right) => {
      const leftTime = left.endedAt || left.startedAt || left.createdAt || '';
      const rightTime = right.endedAt || right.startedAt || right.createdAt || '';
      return new Date(rightTime).getTime() - new Date(leftTime).getTime();
    })[0] || null;
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
    branchPointCount: narrativeMemory.memory.branchPoints?.length || 0,
    branchPoints: narrativeMemory.memory.branchPoints || [],
    scenarioPreset: Object.values(ScenarioPreset).includes(narrativeMemory.memory.session.scenarioPreset)
      ? narrativeMemory.memory.session.scenarioPreset
      : ScenarioPreset.WEB_NOVEL,
    room: narrativeMemory.memory.session.room || {},
    brainstormNotes: narrativeMemory.memory.brainstormNotes || [],
    inspirationCaptures: narrativeMemory.memory.inspirationCaptures || [],
    awarenessEventCount: awarenessEvents().length,
    debug: getDebugState(),
  };
}

function getDebugState() {
  const handoffs = narrativeMemory?.memory?.handoffs || [];

  return {
    version: EXTENSION_VERSION,
    compatibility: runtimeDebug.compatibility,
    storageMode: storage?.getStorageMode?.() || 'unknown',
    activeIntrusions: intrusionEngine?.getActiveIntrusions?.() || [],
    pendingHandoff: summarizeHandoff(narrativeMemory?.getPendingHandoff?.() || null),
    lastInjectedHandoff: summarizeHandoff(latestBy(handoffs, 'lastInjectedAt')),
    lastConsumedHandoff: summarizeHandoff(latestBy(handoffs, 'consumedAt')),
    awarenessEventCount: awarenessEvents().length,
    brainstormNoteCount: narrativeMemory?.memory?.brainstormNotes?.length || 0,
    inspirationCaptureCount: narrativeMemory?.memory?.inspirationCaptures?.length || 0,
    lastCapturedAiMessage: runtimeDebug.lastCapturedAiMessage,
    lastTakeoverSend: runtimeDebug.lastTakeoverSend,
    pendingReactionAnchor: runtimeDebug.pendingReactionAnchor ? summarizeReactionAnchor(runtimeDebug.pendingReactionAnchor) : null,
    lastReactionAnchor: runtimeDebug.lastReactionAnchor ? summarizeReactionAnchor(runtimeDebug.lastReactionAnchor) : null,
    lastInterceptorCallAt: runtimeDebug.lastInterceptorCallAt,
    lastInjectionResult: runtimeDebug.lastInjectionResult,
    lastInjectionHandoffId: runtimeDebug.lastInjectionHandoffId,
    lastInjectionError: runtimeDebug.lastInjectionError,
    lastConsumedHandoffId: runtimeDebug.lastConsumedHandoffId,
    lastConsumedAt: runtimeDebug.lastConsumedAt,
    lastError: runtimeDebug.lastError,
  };
}

function summarizeReactionAnchor(anchor) {
  return {
    id: anchor.id,
    characterName: anchor.characterName,
    intrusionKind: anchor.intrusionKind,
    createdAt: anchor.createdAt,
    injectedAt: anchor.injectedAt || null,
    consumedAt: anchor.consumedAt || null,
    consumedBySpeakerName: anchor.consumedBySpeakerName || null,
    contentPreview: anchor.content?.slice?.(0, 120) || '',
  };
}

function inspectCompatibility() {
  const context = getContext();
  const eventTypes = context?.eventTypes || context?.event_types || {};

  return {
    hasSillyTavernContext: Boolean(context),
    hasCharactersArray: Array.isArray(context?.characters),
    hasChatArray: Array.isArray(context?.chat),
    hasEventSource: Boolean(context?.eventSource),
    hasMessageReceivedEvent: Boolean(eventTypes.MESSAGE_RECEIVED),
    hasChatChangedEvent: Boolean(eventTypes.CHAT_CHANGED),
    hasCharacterEditedEvent: Boolean(eventTypes.CHARACTER_EDITED),
    hasSlashCommandExecution: typeof context?.executeSlashCommandsWithOptions === 'function',
    hasAddOneMessage: typeof context?.addOneMessage === 'function',
    hasPromptInterceptor: typeof globalThis.VistrTavernPromptInterceptor === 'function',
    checkedAt: new Date().toISOString(),
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

function normalizeComparableText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizePromptLanguage(language) {
  return language === 'zh-CN' ? 'zh-CN' : 'en';
}

function currentPromptLanguage() {
  return normalizePromptLanguage(narrativeMemory?.memory?.session?.promptLanguage || 'en');
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
