import { AwarenessScope, ControlMode, Controller, HandoffAwareness, ViewMode, Visibility } from '../data/schema.js';

export class UiOverlay {
  constructor({ getCharacters, onStartIntrusion, onEndIntrusion, onRecordHumanLine, onSaveScene, onCopyLatestHandoff, onExportMarkdown, onExportJson, getState, getDebugState }) {
    this.getCharacters = getCharacters;
    this.onStartIntrusion = onStartIntrusion;
    this.onEndIntrusion = onEndIntrusion;
    this.onRecordHumanLine = onRecordHumanLine;
    this.onSaveScene = onSaveScene;
    this.onCopyLatestHandoff = onCopyLatestHandoff;
    this.onExportMarkdown = onExportMarkdown;
    this.onExportJson = onExportJson;
    this.getState = getState;
    this.getDebugState = getDebugState;
    this.root = null;
    this.panel = null;
  }

  mount() {
    if (this.root) {
      return;
    }

    this.root = document.createElement('div');
    this.root.id = 'vistr-tavern-root';
    this.root.innerHTML = this.#template();
    document.body.append(this.root);

    this.panel = this.root.querySelector('[data-vt-panel]');
    this.#bind();
    this.refresh();
  }

  refresh() {
    if (!this.root) {
      return;
    }

    const state = this.getState();
    const characterSelect = this.root.querySelector('[data-vt-character]');
    const activeList = this.root.querySelector('[data-vt-active-list]');
    const status = this.root.querySelector('[data-vt-status]');
    const debugPanel = this.root.querySelector('[data-vt-debug]');

    const selectedValue = characterSelect.value;
    characterSelect.innerHTML = '';

    for (const character of this.getCharacters()) {
      const option = document.createElement('option');
      option.value = character.id;
      option.textContent = character.name;
      characterSelect.append(option);
    }

    if ([...characterSelect.options].some((option) => option.value === selectedValue)) {
      characterSelect.value = selectedValue;
    }

    activeList.innerHTML = state.activeIntrusions.length
      ? state.activeIntrusions.map((intrusion) => `<li>${escapeHtml(intrusion.characterName || intrusion.characterId)} · ${escapeHtml(intrusion.visibility)} · until ${new Date(intrusion.endsAt).toLocaleTimeString()}</li>`).join('')
      : '<li>No active intrusion</li>';

    status.textContent = `${state.viewMode} · ${state.messageCount} messages · ${state.intrusionCount} intrusions · ${state.pendingHandoffCount || 0} pending handoffs`;

    debugPanel.innerHTML = formatDebugState(this.getDebugState?.() || state.debug || {});
  }

  #bind() {
    this.root.querySelector('[data-vt-toggle]').addEventListener('click', () => {
      this.panel.hidden = !this.panel.hidden;
      this.refresh();
    });

    this.root.querySelector('[data-vt-refresh]').addEventListener('click', () => this.refresh());

    this.root.querySelector('[data-vt-start]').addEventListener('click', async () => {
      const character = this.#selectedCharacter();
      if (!character) {
        return;
      }

      const durationMinutes = Number(this.root.querySelector('[data-vt-duration]').value) || 5;
      const visibility = this.root.querySelector('[data-vt-anonymous]').checked ? Visibility.ANONYMOUS : Visibility.REVEALED;
      const mode = this.root.querySelector('[data-vt-director]').checked ? ControlMode.DIRECTOR : ControlMode.INTRUSION;
      const awareness = this.root.querySelector('[data-vt-awareness]').value || HandoffAwareness.NONE;
      const awarenessScope = this.root.querySelector('[data-vt-awareness-scope]').value || AwarenessScope.CONTROLLED;

      await this.onStartIntrusion({
        characterId: character.id,
        characterName: character.name,
        durationMs: durationMinutes * 60 * 1000,
        visibility,
        mode,
        awareness,
        awarenessScope,
      });
      this.refresh();
    });

    this.root.querySelector('[data-vt-end]').addEventListener('click', async () => {
      const character = this.#selectedCharacter();
      if (character) {
        await this.onEndIntrusion(character.id);
      }
      this.refresh();
    });

    this.root.querySelector('[data-vt-save-scene]').addEventListener('click', async () => {
      await this.onSaveScene({
        name: this.root.querySelector('[data-vt-scene-name]').value,
        mood: this.root.querySelector('[data-vt-scene-mood]').value,
        tension: this.root.querySelector('[data-vt-tension]').value,
      });
      this.refresh();
    });

    this.root.querySelector('[data-vt-record-line]').addEventListener('click', async () => {
      const character = this.#selectedCharacter();
      const textarea = this.root.querySelector('[data-vt-human-line]');
      const content = textarea.value;
      if (!character || !content.trim()) {
        return;
      }

      await this.onRecordHumanLine({ characterId: character.id, speakerName: character.name, content });
      textarea.value = '';
      this.refresh();
    });

    this.root.querySelector('[data-vt-export-md]').addEventListener('click', () => {
      this.#download('vistr-tavern-export.md', this.onExportMarkdown(), 'text/markdown');
    });

    this.root.querySelector('[data-vt-export-json]').addEventListener('click', () => {
      this.#download('vistr-tavern-export.json', this.onExportJson(), 'application/json');
    });

    this.root.querySelector('[data-vt-copy-handoff]').addEventListener('click', async () => {
      const status = this.root.querySelector('[data-vt-copy-status]');
      const content = this.onCopyLatestHandoff?.() || '';
      if (!content) {
        status.textContent = 'No handoff available';
        return;
      }

      try {
        await copyText(content);
        status.textContent = 'Latest handoff copied';
      } catch (error) {
        status.textContent = 'Copy failed';
        console.warn('[VistrTavern] Failed to copy handoff.', error);
      }
    });
  }

  #selectedCharacter() {
    const selectedId = this.root.querySelector('[data-vt-character]').value;
    return this.getCharacters().find((character) => character.id === selectedId) || null;
  }

  #download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  #template() {
    return `
      <button class="vt-floating-button" type="button" data-vt-toggle title="VistrTavern">VT</button>
      <section class="vt-panel" data-vt-panel hidden>
        <header class="vt-panel__header">
          <div>
            <strong>VistrTavern</strong>
            <span data-vt-status>loading</span>
          </div>
          <button type="button" data-vt-refresh>Refresh</button>
        </header>

        <div class="vt-field">
          <label>Character</label>
          <select data-vt-character></select>
        </div>

        <div class="vt-grid">
          <label>
            Duration min
            <input type="number" min="1" max="120" value="5" data-vt-duration>
          </label>
          <label>
            Tension
            <input type="number" min="0" max="100" value="50" data-vt-tension>
          </label>
        </div>

        <div class="vt-toggles">
          <label><input type="checkbox" data-vt-anonymous checked> Anonymous</label>
          <label><input type="checkbox" data-vt-director> Director</label>
        </div>

        <label class="vt-field">
          Awareness after recovery
          <select data-vt-awareness>
            <option value="${HandoffAwareness.NONE}">AI 无感</option>
            <option value="${HandoffAwareness.SUBTLE}">断片</option>
            <option value="${HandoffAwareness.EXPLICIT}">怀疑</option>
          </select>
        </label>

        <label class="vt-field">
          Awareness target
          <select data-vt-awareness-scope>
            <option value="${AwarenessScope.CONTROLLED}">Controlled character</option>
            <option value="${AwarenessScope.OBSERVERS}">Observers</option>
            <option value="${AwarenessScope.BOTH}">Both</option>
          </select>
        </label>

        <div class="vt-actions">
          <button type="button" data-vt-start>Start Intrusion</button>
          <button type="button" data-vt-end>End</button>
        </div>

        <hr>

        <div class="vt-grid">
          <label>
            Scene
            <input type="text" placeholder="Royal Banquet" data-vt-scene-name>
          </label>
          <label>
            Mood
            <input type="text" placeholder="oppressive" data-vt-scene-mood>
          </label>
        </div>
        <button type="button" data-vt-save-scene>Save Scene</button>

        <hr>

        <label class="vt-field">
          Human anomaly line
          <textarea rows="4" data-vt-human-line placeholder="Record the human-controlled character line here."></textarea>
        </label>
        <button type="button" data-vt-record-line>Record Human Line</button>

        <hr>

        <strong>Active Intrusions</strong>
        <ul class="vt-active-list" data-vt-active-list></ul>

        <hr>

        <details class="vt-debug" open>
          <summary>Debug</summary>
          <dl data-vt-debug></dl>
          <button type="button" data-vt-copy-handoff>Copy Latest Handoff</button>
          <span class="vt-copy-status" data-vt-copy-status></span>
        </details>

        <div class="vt-actions">
          <button type="button" data-vt-export-md>Export Markdown</button>
          <button type="button" data-vt-export-json>Export JSON</button>
        </div>
      </section>
    `;
  }
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function formatDebugState(debug) {
  const rows = [
    ['Version', debug.version || 'unknown'],
    ['Storage', debug.storageMode || 'unknown'],
    ['Active intrusion', debug.activeIntrusions?.length ? debug.activeIntrusions.map((item) => item.characterName || item.characterId).join(', ') : 'none'],
    ['Pending handoff', formatHandoffSummary(debug.pendingHandoff)],
    ['Last injected', formatHandoffSummary(debug.lastInjectedHandoff)],
    ['Last consumed', formatHandoffSummary(debug.lastConsumedHandoff)],
    ['Awareness events', debug.awarenessEventCount ?? 0],
    ['Last AI message', debug.lastCapturedAiMessage ? `${debug.lastCapturedAiMessage.speakerName} · ${debug.lastCapturedAiMessage.createdAt}` : 'none'],
    ['Interceptor', debug.lastInterceptorCallAt ? `${debug.lastInjectionResult} · ${debug.lastInterceptorCallAt}` : debug.lastInjectionResult || 'not-called'],
    ['Last error', debug.lastError ? `${debug.lastError.type}: ${debug.lastError.message}` : debug.lastInjectionError || 'none'],
  ];

  return rows
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join('');
}

function formatHandoffSummary(handoff) {
  if (!handoff) {
    return 'none';
  }

  const status = handoff.consumedAt ? 'consumed' : handoff.lastInjectedAt ? 'injected' : 'pending';
  return `${handoff.characterName || handoff.id} · ${status} · ${handoff.awareness}/${handoff.awarenessScope || 'controlled'}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

