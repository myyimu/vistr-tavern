import assert from 'node:assert/strict';
import {
  NATIVE_CHAT_INPUT_SELECTOR,
  NATIVE_SEND_BUTTON_SELECTOR,
  applyTakeoverMarkerMetadata,
  getNativeTakeoverTargetFromIntrusions,
  getTakeoverRawCharactersFromContext,
  shouldRouteNativeChatInput,
} from '../index.js';

assert.equal(NATIVE_SEND_BUTTON_SELECTOR, '#send_but');
assert.match(NATIVE_CHAT_INPUT_SELECTOR, /#send_textarea/);
assert.match(NATIVE_CHAT_INPUT_SELECTOR, /textarea\[name="send_textarea"\]/);

const characters = [
  { id: 'alice', name: 'Alice', avatar: 'alice.png' },
  { id: 'bob', name: 'Bob', avatar: 'bob.png' },
  { id: 'carol', name: 'Carol', avatar: 'carol.png' },
];

assert.deepEqual(getTakeoverRawCharactersFromContext({
  characters,
  this_chid: 1,
}), [characters[1]]);

assert.deepEqual(getTakeoverRawCharactersFromContext({
  characters,
  selected_group: 'group-1',
  groups: [{ id: 'group-1', members: ['alice.png', 'carol.png'] }],
}), [characters[0], characters[2]]);

assert.deepEqual(getTakeoverRawCharactersFromContext({
  characters,
  groupId: 'group-2',
  groups: [{ id: 'group-2', members: [{ name: 'Bob' }] }],
}), [characters[1]]);

assert.equal(getNativeTakeoverTargetFromIntrusions([], characters), null);
assert.equal(getNativeTakeoverTargetFromIntrusions([
  { characterId: 'alice', characterName: 'Alice' },
  { characterId: 'bob', characterName: 'Bob' },
], characters), null);

assert.deepEqual(getNativeTakeoverTargetFromIntrusions([
  { characterId: 'alice', characterName: 'Alice' },
], characters), characters[0]);

assert.deepEqual(getNativeTakeoverTargetFromIntrusions([
  { characterId: 'unknown', characterName: 'Guest' },
], characters), { id: 'unknown', name: 'Guest' });

assert.equal(getNativeTakeoverTargetFromIntrusions([
  { characterId: 'unknown', characterName: 'Guest' },
], characters, { allowUnknown: false }), null);

assert.deepEqual(shouldRouteNativeChatInput({
  takeover: { id: 'alice', name: 'Alice' },
  content: 'Say the line.',
}), { shouldRoute: true, reason: 'takeover' });

assert.deepEqual(shouldRouteNativeChatInput({
  takeover: { id: 'alice', name: 'Alice' },
  content: '/sendas name=line',
}), { shouldRoute: false, reason: 'slash_command' });

assert.deepEqual(shouldRouteNativeChatInput({
  takeover: null,
  content: 'Say the line.',
}), { shouldRoute: false, reason: 'no_single_takeover' });

assert.deepEqual(shouldRouteNativeChatInput({
  takeover: { id: 'alice', name: 'Alice' },
  content: ' ',
}), { shouldRoute: false, reason: 'empty_input' });

assert.deepEqual(shouldRouteNativeChatInput({
  takeover: { id: 'alice', name: 'Alice' },
  content: 'Say the line.',
  nativeSendInProgress: true,
}), { shouldRoute: false, reason: 'send_in_progress' });

const hiddenMessage = {
  extra: {
    api: 'manual',
    model: 'Manual',
    vistrTavern: true,
    vistrTavernTakeover: true,
    vistrTavernController: 'human',
  },
};
applyTakeoverMarkerMetadata({}, hiddenMessage, 'hidden');
assert.deepEqual(hiddenMessage.extra, {});

const aiLikeMessage = { extra: { vistrTavernTakeover: true, vistrTavernController: 'human' } };
applyTakeoverMarkerMetadata({
  chat: [{ is_user: false, is_system: false, extra: { api: 'openai', model: 'story-model' } }],
}, aiLikeMessage, 'ai');
assert.deepEqual(aiLikeMessage.extra, { api: 'openai', model: 'story-model' });

const currentMessage = { is_user: false, is_system: false, extra: { api: 'manual', model: 'Manual' } };
applyTakeoverMarkerMetadata({
  chat: [
    { is_user: false, is_system: false, extra: { api: 'claude', model: 'previous-model' } },
    currentMessage,
  ],
}, currentMessage, 'ai');
assert.deepEqual(currentMessage.extra, { api: 'claude', model: 'previous-model' });

const vtMarkedMessage = { extra: { vistrTavernTakeover: true, vistrTavernController: 'human' } };
applyTakeoverMarkerMetadata({}, vtMarkedMessage, 'vt');
assert.deepEqual(vtMarkedMessage.extra, { api: 'manual', model: 'VistrTavern takeover' });

console.log('Native input routing checks passed.');
