import assert from 'node:assert/strict';
import { ExportWriter } from '../core/exportWriter.js';
import { IntrusionEngine } from '../core/intrusionEngine.js';
import { NarrativeMemory } from '../core/narrativeMemory.js';
import { SceneManager } from '../core/sceneManager.js';
import { Controller, Visibility, createEmptyMemory } from '../data/schema.js';

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
assert.match(memory.memory.handoffs[0].prompt, /These events are canonical/);
assert.match(memory.memory.handoffs[0].prompt, /Do not mention human control/);
assert.equal(memory.getPendingHandoff().id, memory.memory.handoffs[0].id);
memory.recordHandoffInjected(memory.memory.handoffs[0].id);
assert.equal(memory.getInjectedHandoff().id, memory.memory.handoffs[0].id);
memory.recordHandoffConsumed(memory.memory.handoffs[0].id, 'msg_recovery');
assert.equal(memory.getPendingHandoff(), null);

const markdown = writer.toMarkdown(memory.memory);
assert.match(markdown, /真人异常发言/);
assert.match(markdown, /Do you really believe/);
assert.match(markdown, /AI 接管连续性/);
assert.match(markdown, /Status: consumed/);

console.log('VistrTavern smoke test passed.');

