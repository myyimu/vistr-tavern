import { ControlMode, Controller, ViewMode, Visibility } from '../data/schema.js';

export class UiOverlay {
  constructor({ getCharacters, onStartIntrusion, onEndIntrusion, onRecordHumanLine, onSaveScene, onExportMarkdown, onExportJson, getState }) {
    this.getCharacters = getCharacters;
    this.onStartIntrusion = onStartIntrusion;
    this.onEndIntrusion = onEndIntrusion;
    this.onRecordHumanLine = onRecordHumanLine;
    this.onSaveScene = onSaveScene;
    this.onExportMarkdown = onExportMarkdown;
    this.onExportJson = onExportJson;
    this.getState = getState;
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

    status.textContent = `${state.viewMode} · ${state.messageCount} messages · ${state.intrusionCount} intrusions`;
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

      await this.onStartIntrusion({
        characterId: character.id,
        characterName: character.name,
        durationMs: durationMinutes * 60 * 1000,
        visibility,
        mode,
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

        <div class="vt-actions">
          <button type="button" data-vt-export-md>Export Markdown</button>
          <button type="button" data-vt-export-json>Export JSON</button>
        </div>
      </section>
    `;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

