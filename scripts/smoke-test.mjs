import assert from 'node:assert/strict';
import { ExportWriter } from '../core/exportWriter.js';
import { IntrusionEngine } from '../core/intrusionEngine.js';
import { NarrativeMemory } from '../core/narrativeMemory.js';
import { SceneManager } from '../core/sceneManager.js';
import { AwarenessScope, BranchType, Controller, HandoffAwareness, ScenarioPreset, Visibility, createEmptyMemory } from '../data/schema.js';

let now = Date.parse('2026-05-27T12:00:00.000Z');
const engine = new IntrusionEngine({ now: () => now });
const memory = new NarrativeMemory(createEmptyMemory(new Date(now)));
const sceneManager = new SceneManager(memory.memory);
const writer = new ExportWriter();

memory.syncCharacters([{ name: 'Eileen' }, { name: 'Chancellor' }]);
const scene = sceneManager.setScene({ name: 'Royal Banquet', mood: 'oppressive', tension: 82 });

engine.addEventListener('intrusion:start', (event) => memory.recordIntrusionStarted(event.detail));
engine.addEventListener('intrusion:end', (event) => memory.recordIntrusionEnded(event.detail));

const intrusion = engine.startIntrusion({
  characterId: 'Eileen',
  characterName: 'Eileen',
  durationMs: 60_000,
  visibility: Visibility.ANONYMOUS,
});

const humanMessage = memory.recordMessage({
  characterId: 'Eileen',
  speakerName: 'Eileen',
  controller: Controller.HUMAN,
  visibility: Visibility.ANONYMOUS,
  content: 'Do you really believe the king is still alive?',
  scene,
  intrusion,
});

memory.recordMessage({
  characterId: 'Chancellor',
  speakerName: 'Chancellor',
  controller: Controller.AI,
  visibility: Visibility.REVEALED,
  content: 'That question borders on treason.',
  scene,
  intrusion,
});

assert.equal(engine.isHumanControlled('Eileen'), true);
assert.equal(memory.memory.messages.length, 2);
assert.equal(humanMessage.controller, Controller.HUMAN);

now += 61_000;
engine.tick(now);
assert.equal(engine.isHumanControlled('Eileen'), false);
assert.equal(memory.memory.handoffs.length, 1);
assert.equal(memory.memory.disturbanceEvents.filter((event) => event.type.includes('anomaly_awareness')).length, 0);
assert.match(memory.memory.handoffs[0].prompt, /These events are canonical/);
assert.match(memory.memory.handoffs[0].prompt, /Do not mention human control/);
assert.equal(memory.getPendingHandoff().id, memory.memory.handoffs[0].id);
memory.recordHandoffInjected(memory.memory.handoffs[0].id);
assert.equal(memory.getInjectedHandoff().id, memory.memory.handoffs[0].id);
memory.recordHandoffConsumed(memory.memory.handoffs[0].id, 'msg_recovery');
assert.equal(memory.getPendingHandoff(), null);

const branchPoint = memory.recordBranchPoint({
  characterId: 'Eileen',
  characterName: 'Eileen',
  title: 'Forbidden bloodline reveal',
  type: BranchType.IDENTITY,
  summary: 'Eileen may know royal secrets that should be impossible for her to know.',
  options: ['Expose the bloodline', 'Hide the memory gap', 'Let the chancellor weaponize the secret'],
  scene,
  intrusion,
});
assert.equal(memory.memory.branchPoints.length, 1);
assert.equal(branchPoint.type, BranchType.IDENTITY);
assert.equal(memory.setScenarioPreset(ScenarioPreset.MURDER_MYSTERY), ScenarioPreset.MURDER_MYSTERY);
assert.equal(memory.memory.session.scenarioPreset, ScenarioPreset.MURDER_MYSTERY);

const markdown = writer.toMarkdown(memory.memory);
assert.match(markdown, /真人异常发言/);
assert.match(markdown, /Do you really believe/);
assert.match(markdown, /AI 接管连续性/);
assert.match(markdown, /AI 异常察觉/);
assert.match(markdown, /剧情分支标记/);
assert.match(markdown, /Forbidden bloodline reveal/);
assert.match(markdown, /Status: consumed/);

const creatorPack = writer.toCreatorPack(memory.memory);
assert.match(creatorPack, /Creator Pack/);
assert.match(creatorPack, /冲突升级点/);
assert.match(creatorPack, /剧情分支/);
assert.match(creatorPack, /AI 剧本杀/);
assert.match(creatorPack, /Forbidden bloodline reveal/);

const organizedMaterial = writer.toOrganizedMaterial(memory.memory);
assert.match(organizedMaterial, /素材整理/);
assert.match(organizedMaterial, /AI 剧本杀/);
assert.match(organizedMaterial, /剧情分支路线/);
assert.match(organizedMaterial, /Forbidden bloodline reveal/);

const englishOrganizedMaterial = writer.toOrganizedMaterial(memory.memory, { language: 'en' });
assert.match(englishOrganizedMaterial, /Organized Material/);
assert.match(englishOrganizedMaterial, /AI murder mystery/);

const characterPrompt = writer.toCharacterSheetPrompt(memory.memory);
assert.match(characterPrompt, /Character Sheet Extraction Prompt/);
assert.match(characterPrompt, /角色设定提取/);
assert.match(characterPrompt, /真人异常发言/);
assert.match(characterPrompt, /Forbidden bloodline reveal/);

const subtleMemory = new NarrativeMemory(createEmptyMemory(new Date(now)));
const subtleSceneManager = new SceneManager(subtleMemory.memory);
const subtleEngine = new IntrusionEngine({ now: () => now });
subtleMemory.syncCharacters([{ name: 'Eileen' }, { name: 'Chancellor' }]);
const subtleScene = subtleSceneManager.setScene({ name: 'Gallery', mood: 'uncertain', tension: 70 });
subtleEngine.addEventListener('intrusion:start', (event) => subtleMemory.recordIntrusionStarted(event.detail));
subtleEngine.addEventListener('intrusion:end', (event) => subtleMemory.recordIntrusionEnded(event.detail));
const subtleIntrusion = subtleEngine.startIntrusion({
  characterId: 'Eileen',
  characterName: 'Eileen',
  durationMs: 60_000,
  visibility: Visibility.ANONYMOUS,
  awareness: HandoffAwareness.SUBTLE,
  awarenessScope: AwarenessScope.CONTROLLED,
});
subtleMemory.recordMessage({
  characterId: 'Eileen',
  speakerName: 'Eileen',
  controller: Controller.HUMAN,
  visibility: Visibility.ANONYMOUS,
  content: 'I remember a door that was never built.',
  scene: subtleScene,
  intrusion: subtleIntrusion,
});
subtleEngine.endIntrusion('Eileen', 'manual');
assert.equal(subtleMemory.memory.disturbanceEvents.filter((event) => event.type === 'self_anomaly_awareness').length, 1);
assert.equal(subtleMemory.memory.disturbanceEvents.filter((event) => event.type === 'observer_anomaly_awareness').length, 0);
assert.match(subtleMemory.memory.handoffs[0].prompt, /Awareness Directive/);
assert.match(subtleMemory.memory.handoffs[0].prompt, /\*Why did I say that\?/);

const explicitMemory = new NarrativeMemory(createEmptyMemory(new Date(now)));
const explicitSceneManager = new SceneManager(explicitMemory.memory);
const explicitEngine = new IntrusionEngine({ now: () => now });
explicitMemory.syncCharacters([{ name: 'Eileen' }, { name: 'Chancellor' }]);
const explicitScene = explicitSceneManager.setScene({ name: 'Mirror Hall', mood: 'fracturing', tension: 90 });
explicitEngine.addEventListener('intrusion:start', (event) => explicitMemory.recordIntrusionStarted(event.detail));
explicitEngine.addEventListener('intrusion:end', (event) => explicitMemory.recordIntrusionEnded(event.detail));
const explicitIntrusion = explicitEngine.startIntrusion({
  characterId: 'Eileen',
  characterName: 'Eileen',
  durationMs: 60_000,
  visibility: Visibility.ANONYMOUS,
  awareness: HandoffAwareness.EXPLICIT,
  awarenessScope: AwarenessScope.BOTH,
});
explicitMemory.recordMessage({
  characterId: 'Eileen',
  speakerName: 'Eileen',
  controller: Controller.HUMAN,
  visibility: Visibility.ANONYMOUS,
  content: 'The script is showing through the walls.',
  scene: explicitScene,
  intrusion: explicitIntrusion,
});
explicitEngine.endIntrusion('Eileen', 'manual');
assert.equal(explicitMemory.memory.disturbanceEvents.filter((event) => event.type === 'self_anomaly_awareness').length, 1);
assert.equal(explicitMemory.memory.disturbanceEvents.filter((event) => event.type === 'observer_anomaly_awareness').length, 1);
assert.match(explicitMemory.memory.handoffs[0].prompt, /world truly stable/);
assert.match(writer.toMarkdown(explicitMemory.memory), /self_anomaly_awareness/);
assert.match(writer.toMarkdown(explicitMemory.memory), /observer_anomaly_awareness/);

console.log('VistrTavern smoke test passed.');

