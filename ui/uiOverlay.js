import { AwarenessScope, BrainstormKind, BranchType, ControlMode, HandoffAwareness, IntrusionKind, ScenarioPreset, Visibility } from '../data/schema.js';

const LANGUAGE_STORAGE_KEY = 'vistr-tavern:language';
const FIRST_RUN_STORAGE_KEY = 'vistr-tavern:first-run-dismissed';
const TAKEOVER_MARKER_STORAGE_KEY = 'vistr-tavern:takeover-marker-style';
const DEFAULT_LANGUAGE = 'zh-CN';

export class UiOverlay {
  constructor({ getCharacters, onStartIntrusion, onEndIntrusion, onSendHumanLineAsCharacter, onRecordHumanLine, onMarkBranchPoint, onSetScenarioPreset, onLanguageChange, onSaveContextNotes, onCaptureInspiration, onSaveBrainstormNote, onSaveScene, onCopyLatestHandoff, onExportMarkdown, onExportCreatorPack, onExportOrganizedMaterial, onExportCharacterSheetPrompt, onExportJson, getState, getDebugState }) {
    this.getCharacters = getCharacters;
    this.onStartIntrusion = onStartIntrusion;
    this.onEndIntrusion = onEndIntrusion;
    this.onSendHumanLineAsCharacter = onSendHumanLineAsCharacter;
    this.onRecordHumanLine = onRecordHumanLine;
    this.onMarkBranchPoint = onMarkBranchPoint;
    this.onSetScenarioPreset = onSetScenarioPreset;
    this.onLanguageChange = onLanguageChange;
    this.onSaveContextNotes = onSaveContextNotes;
    this.onCaptureInspiration = onCaptureInspiration;
    this.onSaveBrainstormNote = onSaveBrainstormNote;
    this.onSaveScene = onSaveScene;
    this.onCopyLatestHandoff = onCopyLatestHandoff;
    this.onExportMarkdown = onExportMarkdown;
    this.onExportCreatorPack = onExportCreatorPack;
    this.onExportOrganizedMaterial = onExportOrganizedMaterial;
    this.onExportCharacterSheetPrompt = onExportCharacterSheetPrompt;
    this.onExportJson = onExportJson;
    this.getState = getState;
    this.getDebugState = getDebugState;
    this.language = getStoredLanguage();
    this.takeoverMarkerStyle = getStoredTakeoverMarkerStyle();
    this.firstRunDismissed = Boolean(readLocalStorage(FIRST_RUN_STORAGE_KEY));
    this.lastManualRefreshAt = null;
    this.isCollapsed = false;
    this.root = null;
    this.panel = null;
  }

  mount() {
    if (this.root) {
      return;
    }

    this.root = document.createElement('div');
    this.root.id = 'vistr-tavern-root';
    document.body.append(this.root);

    this.#render(true);
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
    const guide = this.root.querySelector('[data-vt-first-run]');
    const refreshStatus = this.root.querySelector('[data-vt-refresh-status]');
    const selectedCharacterPreview = this.root.querySelector('[data-vt-selected-character]');
    const takeoverGuide = this.root.querySelector('[data-vt-takeover-guide]');
    const startButton = this.root.querySelector('[data-vt-start]');
    const endButton = this.root.querySelector('[data-vt-end]');
    const sendAsButton = this.root.querySelector('[data-vt-send-as-character]');
    const scenarioSelect = this.root.querySelector('[data-vt-scenario]');
    const branchList = this.root.querySelector('[data-vt-branch-list]');
    const inspirationList = this.root.querySelector('[data-vt-inspiration-list]');
    const brainstormList = this.root.querySelector('[data-vt-brainstorm-list]');

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

    const selectedCharacter = this.#selectedCharacter();
    const selectedIntrusion = selectedCharacter
      ? state.activeIntrusions.find((intrusion) => intrusion.characterId === selectedCharacter.id)
      : null;
    selectedCharacterPreview.innerHTML = formatSelectedCharacter(selectedCharacter, selectedIntrusion, this.language);
    takeoverGuide.innerHTML = formatTakeoverGuide({ selectedCharacter, selectedIntrusion, pendingHandoffCount: state.pendingHandoffCount || 0 }, this.language);
    startButton.disabled = !selectedCharacter;
    endButton.disabled = !selectedIntrusion;
    sendAsButton.disabled = !selectedCharacter || !selectedIntrusion;
    startButton.textContent = selectedIntrusion ? this.#t('restartIntrusion') : this.#t('startIntrusion');
    endButton.textContent = selectedCharacter ? this.#t('endIntrusionFor', { character: selectedCharacter.name }) : this.#t('end');
    sendAsButton.textContent = selectedCharacter
      ? this.#t('sendAsCharacterAndRecord', { character: selectedCharacter.name })
      : this.#t('sendAsCharacterAndRecordGeneric');

    activeList.innerHTML = state.activeIntrusions.length
      ? state.activeIntrusions.map((intrusion) => `<li>${escapeHtml(intrusion.characterName || intrusion.characterId)} · ${escapeHtml(intrusion.visibility)} · ${this.#t('until')} ${new Date(intrusion.endsAt).toLocaleTimeString()}</li>`).join('')
      : `<li>${escapeHtml(this.#t('noActiveIntrusion'))}</li>`;

    status.textContent = formatPanelStatus({
      selectedCharacter,
      selectedIntrusion,
      pendingHandoffCount: state.pendingHandoffCount || 0,
      messageCount: state.messageCount,
    }, this.language);
    guide.hidden = this.firstRunDismissed || Boolean(readLocalStorage(FIRST_RUN_STORAGE_KEY));
    if (refreshStatus) {
      refreshStatus.textContent = this.lastManualRefreshAt
        ? this.#t('refreshStatus', {
          time: new Date(this.lastManualRefreshAt).toLocaleTimeString(),
          count: this.getCharacters().length,
        })
        : '';
    }
    scenarioSelect.value = state.scenarioPreset || ScenarioPreset.WEB_NOVEL;
    branchList.innerHTML = formatBranchList(state.branchPoints || [], this.language);
    inspirationList.innerHTML = formatInspirationList(state.inspirationCaptures || [], this.language);
    brainstormList.innerHTML = formatBrainstormList(state.brainstormNotes || [], this.language);
    setInputValue(this.root, '[data-vt-context-worldview]', state.contextNotes?.worldview);
    setInputValue(this.root, '[data-vt-context-background]', state.contextNotes?.background);
    setInputValue(this.root, '[data-vt-context-role-slots]', state.contextNotes?.roleSlots);
    setInputValue(this.root, '[data-vt-context-ai-rules]', state.contextNotes?.aiWorldRules);
    debugPanel.innerHTML = formatDebugState(this.getDebugState?.() || state.debug || {}, this.language);
    this.#syncShellState();
  }

  #render(panelHidden = this.panel?.hidden ?? true) {
    this.root.innerHTML = this.#template();
    this.panel = this.root.querySelector('[data-vt-panel]');
    this.panel.hidden = panelHidden;
    this.#bind();
    this.refresh();
  }

  #bind() {
    this.root.querySelector('[data-vt-toggle]').addEventListener('click', () => {
      this.panel.hidden = !this.panel.hidden;
      if (!this.panel.hidden) {
        this.isCollapsed = false;
      }
      this.refresh();
    });

    this.root.querySelector('[data-vt-refresh]').addEventListener('click', () => {
      this.lastManualRefreshAt = Date.now();
      this.refresh();
    });

    this.root.querySelector('[data-vt-collapse]').addEventListener('click', () => {
      this.panel.hidden = true;
      this.isCollapsed = true;
      this.refresh();
    });

    this.panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.panel.hidden = true;
        this.isCollapsed = true;
        this.refresh();
        this.root.querySelector('[data-vt-toggle]')?.focus();
      }
    });

    this.root.querySelector('[data-vt-character]').addEventListener('change', () => this.refresh());

    this.root.querySelector('[data-vt-language]').addEventListener('change', async (event) => {
      this.language = normalizeLanguage(event.target.value);
      writeLocalStorage(LANGUAGE_STORAGE_KEY, this.language);
      await this.onLanguageChange?.(this.language);
      this.#render(false);
    });

    this.root.querySelector('[data-vt-scenario]').addEventListener('change', async (event) => {
      await this.onSetScenarioPreset?.(event.target.value);
      this.#render(false);
    });

    this.root.querySelector('[data-vt-takeover-marker]').addEventListener('change', (event) => {
      this.takeoverMarkerStyle = normalizeTakeoverMarkerStyle(event.target.value);
      writeLocalStorage(TAKEOVER_MARKER_STORAGE_KEY, this.takeoverMarkerStyle);
    });

    this.root.querySelectorAll('[data-vt-intent-preset]').forEach((button) => {
      button.addEventListener('click', () => {
        const preset = button.dataset.vtIntentPreset;
        this.root.querySelector('[data-vt-intent-goal]').value = this.#t(`intentPreset_${preset}_goal`);
        this.root.querySelector('[data-vt-intent-target]').value = this.#t(`intentPreset_${preset}_target`);
        this.root.querySelector('[data-vt-intent-disrupt]').value = this.#t(`intentPreset_${preset}_disrupt`);
        this.root.querySelector('[data-vt-intent-secret]').value = this.#t(`intentPreset_${preset}_secret`);
      });
    });

    this.root.querySelector('[data-vt-dismiss-guide]').addEventListener('click', () => {
      this.firstRunDismissed = true;
      writeLocalStorage(FIRST_RUN_STORAGE_KEY, 'true');
      this.refresh();
    });

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
        humanIntent: {
          goal: this.root.querySelector('[data-vt-intent-goal]').value,
          target: this.root.querySelector('[data-vt-intent-target]').value,
          disrupt: this.root.querySelector('[data-vt-intent-disrupt]').value,
          secret: this.root.querySelector('[data-vt-intent-secret]').value,
        },
      });
      this.root.querySelector('[data-vt-intrusion-status]').textContent = this.#t('intrusionStartedFor', { character: character.name });
      this.refresh();
    });

    this.root.querySelector('[data-vt-end]').addEventListener('click', async () => {
      const character = this.#selectedCharacter();
      if (character) {
        await this.onEndIntrusion(character.id);
        this.root.querySelector('[data-vt-intrusion-status]').textContent = this.#t('intrusionEndedFor', { character: character.name });
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

    this.root.querySelector('[data-vt-save-context]').addEventListener('click', async () => {
      await this.onSaveContextNotes?.({
        worldview: this.root.querySelector('[data-vt-context-worldview]').value,
        background: this.root.querySelector('[data-vt-context-background]').value,
        roleSlots: this.root.querySelector('[data-vt-context-role-slots]').value,
        aiWorldRules: this.root.querySelector('[data-vt-context-ai-rules]').value,
      });
      this.root.querySelector('[data-vt-context-status]').textContent = this.#t('contextSaved');
      this.refresh();
    });

    this.root.querySelector('[data-vt-record-line]').addEventListener('click', async () => {
      const character = this.#selectedCharacter();
      const textarea = this.root.querySelector('[data-vt-human-line]');
      const content = textarea.value;
      if (!character || !content.trim()) {
        return;
      }

      await this.onRecordHumanLine({
        characterId: character.id,
        speakerName: character.name,
        content,
        intrusionKind: this.root.querySelector('[data-vt-intrusion-kind]').value,
      });
      textarea.value = '';
      this.refresh();
    });

    this.root.querySelector('[data-vt-send-as-character]').addEventListener('click', async () => {
      const character = this.#selectedCharacter();
      const textarea = this.root.querySelector('[data-vt-human-line]');
      const content = textarea.value;
      const status = this.root.querySelector('[data-vt-intrusion-status]');
      if (!character || !content.trim()) {
        return;
      }

      try {
        await this.onSendHumanLineAsCharacter?.({
          characterId: character.id,
          speakerName: character.name,
          content,
          intrusionKind: this.root.querySelector('[data-vt-intrusion-kind]').value,
          takeoverMarkerStyle: this.takeoverMarkerStyle,
        });
        textarea.value = '';
        status.textContent = this.#t('sentAsCharacter', { character: character.name });
        this.refresh();
      } catch (error) {
        status.textContent = this.#t('sendAsCharacterFailed', { message: error?.message || String(error) });
        console.warn('[VistrTavern] Failed to send takeover line as character.', error);
      }
    });

    this.root.querySelector('[data-vt-export-md]').addEventListener('click', () => {
      this.#download('vistr-tavern-export.md', this.onExportMarkdown(), 'text/markdown');
    });

    this.root.querySelector('[data-vt-export-creator-pack]').addEventListener('click', () => {
      this.#download('vistr-tavern-creator-pack.md', this.onExportCreatorPack(), 'text/markdown');
    });

    this.root.querySelector('[data-vt-organize-material]').addEventListener('click', () => {
      const output = this.root.querySelector('[data-vt-material-output]');
      output.value = this.onExportOrganizedMaterial?.(this.language) || '';
      this.root.querySelector('[data-vt-material-status]').textContent = this.#t('materialOrganized');
    });

    this.root.querySelector('[data-vt-copy-material]').addEventListener('click', async () => {
      const status = this.root.querySelector('[data-vt-material-status]');
      const output = this.root.querySelector('[data-vt-material-output]');
      const content = output.value || this.onExportOrganizedMaterial?.(this.language) || '';
      if (!content) {
        status.textContent = this.#t('noMaterialAvailable');
        return;
      }

      try {
        await copyText(content);
        status.textContent = this.#t('materialCopied');
      } catch (error) {
        status.textContent = this.#t('copyFailed');
        console.warn('[VistrTavern] Failed to copy organized material.', error);
      }
    });

    this.root.querySelector('[data-vt-export-material]').addEventListener('click', () => {
      this.#download('vistr-tavern-organized-material.md', this.onExportOrganizedMaterial?.(this.language) || '', 'text/markdown');
    });

    this.root.querySelector('[data-vt-export-character-prompt]').addEventListener('click', () => {
      this.#download('vistr-tavern-character-sheet-prompt.md', this.onExportCharacterSheetPrompt(), 'text/markdown');
    });

    this.root.querySelector('[data-vt-export-json]').addEventListener('click', () => {
      this.#download('vistr-tavern-export.json', this.onExportJson(), 'application/json');
    });

    this.root.querySelector('[data-vt-copy-handoff]').addEventListener('click', async () => {
      const status = this.root.querySelector('[data-vt-copy-status]');
      const content = this.onCopyLatestHandoff?.() || '';
      if (!content) {
        status.textContent = this.#t('noHandoffAvailable');
        return;
      }

      try {
        await copyText(content);
        status.textContent = this.#t('latestHandoffCopied');
      } catch (error) {
        status.textContent = this.#t('copyFailed');
        console.warn('[VistrTavern] Failed to copy handoff.', error);
      }
    });

    this.root.querySelector('[data-vt-copy-debug]').addEventListener('click', async () => {
      const status = this.root.querySelector('[data-vt-copy-status]');
      const snapshot = this.getDebugState?.() || this.getState().debug || {};
      const content = JSON.stringify(snapshot, null, 2);

      try {
        await copyText(content);
        status.textContent = this.#t('debugSnapshotCopied');
      } catch (error) {
        status.textContent = this.#t('copyFailed');
        console.warn('[VistrTavern] Failed to copy debug snapshot.', error);
      }
    });

    this.root.querySelector('[data-vt-mark-branch]').addEventListener('click', async () => {
      const character = this.#selectedCharacter();
      const status = this.root.querySelector('[data-vt-branch-status]');
      const titleInput = this.root.querySelector('[data-vt-branch-title]');
      const summaryInput = this.root.querySelector('[data-vt-branch-summary]');
      const optionInputs = Array.from(this.root.querySelectorAll('[data-vt-branch-option]'));
      const branchPoint = await this.onMarkBranchPoint?.({
        characterId: character?.id || null,
        characterName: character?.name || null,
        title: titleInput.value,
        type: this.root.querySelector('[data-vt-branch-type]').value,
        summary: summaryInput.value,
        options: optionInputs.map((input) => input.value),
      });

      if (!branchPoint) {
        status.textContent = this.#t('branchRequired');
        return;
      }

      titleInput.value = '';
      summaryInput.value = '';
      for (const input of optionInputs) {
        input.value = '';
      }
      status.textContent = this.#t('branchMarked');
      this.refresh();
    });

    this.root.querySelector('[data-vt-capture-inspiration]').addEventListener('click', async () => {
      const character = this.#selectedCharacter();
      const status = this.root.querySelector('[data-vt-inspiration-status]');
      const capture = await this.onCaptureInspiration?.(character?.id || null);
      status.textContent = capture ? this.#t('inspirationCaptured') : this.#t('noInspirationAvailable');
      this.refresh();
    });

    this.root.querySelector('[data-vt-save-brainstorm]').addEventListener('click', async () => {
      const character = this.#selectedCharacter();
      const textarea = this.root.querySelector('[data-vt-brainstorm-content]');
      const status = this.root.querySelector('[data-vt-brainstorm-status]');
      const note = await this.onSaveBrainstormNote?.({
        kind: this.root.querySelector('[data-vt-brainstorm-kind]').value,
        content: textarea.value,
        characterId: character?.id || null,
        characterName: character?.name || null,
      });

      if (!note) {
        status.textContent = this.#t('brainstormRequired');
        return;
      }

      textarea.value = '';
      status.textContent = this.#t('brainstormSaved');
      this.refresh();
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

  #syncShellState() {
    const toggle = this.root?.querySelector('[data-vt-toggle]');
    if (!this.root || !this.panel || !toggle) {
      return;
    }

    const isClosed = this.panel.hidden;
    this.root.classList.toggle('vt-shell-closed', isClosed);
    this.root.classList.toggle('vt-shell-open', !isClosed);
    this.root.classList.toggle('vt-shell-collapsed', isClosed && this.isCollapsed);
    toggle.textContent = isClosed ? (this.isCollapsed ? '<' : 'VT') : '';
    toggle.title = isClosed ? this.#t('openPanel') : this.#t('panelOpen');
    toggle.setAttribute('aria-label', toggle.title);
  }

  #template() {
    return `
      <button class="vt-floating-button" type="button" data-vt-toggle title="${this.#t('openPanel')}" aria-label="${this.#t('openPanel')}">VT</button>
      <section class="vt-panel" data-vt-panel hidden>
        <header class="vt-panel__header">
          <div>
            <strong>VistrTavern</strong>
            <span data-vt-status>${this.#t('loading')}</span>
          </div>
          <div class="vt-header-controls">
            <div class="vt-header-buttons">
              <button type="button" data-vt-refresh title="${this.#t('refresh')}" aria-label="${this.#t('refresh')}">${this.#t('refreshShort')}</button>
              <button type="button" data-vt-collapse title="${this.#t('collapsePanel')}" aria-label="${this.#t('collapsePanel')}">×</button>
            </div>
            <details class="vt-header-settings">
              <summary>${this.#t('panelSettings')}</summary>
              <label>
                ${this.#t('language')}
                <select data-vt-language>
                  <option value="zh-CN" ${this.language === 'zh-CN' ? 'selected' : ''}>中文</option>
                  <option value="en" ${this.language === 'en' ? 'selected' : ''}>English</option>
                </select>
              </label>
              <span class="vt-refresh-status" data-vt-refresh-status></span>
            </details>
          </div>
        </header>

        <section class="vt-first-run" data-vt-first-run>
          <strong>${this.#t('firstRunTitle')}</strong>
          <ol>
            <li>${this.#t('firstRunStart')}</li>
            <li>${this.#t('firstRunRecord')}</li>
            <li>${this.#t('firstRunRecover')}</li>
          </ol>
          <button type="button" data-vt-dismiss-guide>${this.#t('dismissGuide')}</button>
        </section>

        <div class="vt-field">
          <label>${this.#t('character')}</label>
          <select data-vt-character></select>
          <p class="vt-selected-character" data-vt-selected-character></p>
        </div>

        <section class="vt-takeover-guide" data-vt-takeover-guide></section>

        <div class="vt-actions">
          <button type="button" data-vt-start>${this.#t('startIntrusion')}</button>
          <button type="button" data-vt-end>${this.#t('end')}</button>
        </div>
        <span class="vt-copy-status" data-vt-intrusion-status></span>

        <details class="vt-inline-options vt-panel-send-fallback">
          <summary>${this.#t('panelFallbackSend')}</summary>
          <p class="vt-help">${this.#t('panelFallbackSendHelp')}</p>
          <label class="vt-field">
            ${this.#t('humanAnomalyLine')}
            <textarea rows="4" data-vt-human-line placeholder="${this.#t('humanLinePlaceholder')}"></textarea>
          </label>
          <details class="vt-inline-options vt-intrusion-kind-options">
            <summary>${this.#t('optionalIntrusionKind')}</summary>
            <label class="vt-field vt-compact-field">
              ${this.#t('intrusionKind')}
              <select data-vt-intrusion-kind>
                <option value="${IntrusionKind.CHARACTER_TAKEOVER}">${this.#t('intrusionKindCharacterTakeover')}</option>
                <option value="${IntrusionKind.MEMORY_FRACTURE}">${this.#t('intrusionKindMemoryFracture')}</option>
                <option value="${IntrusionKind.PLOT_HOOK}">${this.#t('intrusionKindPlotHook')}</option>
                <option value="${IntrusionKind.RELATIONSHIP_SABOTAGE}">${this.#t('intrusionKindRelationshipSabotage')}</option>
                <option value="${IntrusionKind.CLUE_CONTAMINATION}">${this.#t('intrusionKindClueContamination')}</option>
              </select>
            </label>
            <p class="vt-help">${this.#t('intrusionKindHelp')}</p>
          </details>
          <button class="vt-main-action" type="button" data-vt-send-as-character>${this.#t('sendAsCharacterAndRecordGeneric')}</button>
          <p class="vt-help">${this.#t('recordFallbackHelp')}</p>
          <button type="button" data-vt-record-line>${this.#t('recordHumanLine')}</button>
        </details>

        <details class="vt-room">
          <summary>${summaryTitle(this.#t('optionalSetup'), this.#t('tipOptionalSetup'))}</summary>
          <p class="vt-help">${this.#t('optionalSetupHelp')}</p>
          <label class="vt-field">
            ${this.#t('scenarioPreset')}
            <select data-vt-scenario>
              <option value="${ScenarioPreset.WEB_NOVEL}">${this.#t('scenarioWebNovel')}</option>
              <option value="${ScenarioPreset.MURDER_MYSTERY}">${this.#t('scenarioMurderMystery')}</option>
              <option value="${ScenarioPreset.VIRTUAL_THEATER}">${this.#t('scenarioVirtualTheater')}</option>
            </select>
          </label>

          <div class="vt-grid">
            <label>
              ${this.#t('durationMin')}
              <input type="number" min="1" max="120" value="5" data-vt-duration>
            </label>
            <label>
              ${this.#t('tension')}
              <input type="number" min="0" max="100" value="50" data-vt-tension>
            </label>
          </div>

          <div class="vt-toggles">
            <label><input type="checkbox" data-vt-anonymous checked> ${this.#t('anonymous')}</label>
            <label><input type="checkbox" data-vt-director> ${this.#t('director')}</label>
          </div>

          <label class="vt-field">
            ${this.#t('takeoverMarker')}
            <select data-vt-takeover-marker>
              <option value="hidden" ${this.takeoverMarkerStyle === 'hidden' ? 'selected' : ''}>${this.#t('takeoverMarkerHidden')}</option>
              <option value="ai" ${this.takeoverMarkerStyle === 'ai' ? 'selected' : ''}>${this.#t('takeoverMarkerAi')}</option>
              <option value="vt" ${this.takeoverMarkerStyle === 'vt' ? 'selected' : ''}>${this.#t('takeoverMarkerVt')}</option>
            </select>
          </label>

          <label class="vt-field">
            ${this.#t('awarenessAfterRecovery')}
            <select data-vt-awareness>
              <option value="${HandoffAwareness.NONE}">${this.#t('awarenessNone')}</option>
              <option value="${HandoffAwareness.SUBTLE}">${this.#t('awarenessSubtle')}</option>
              <option value="${HandoffAwareness.EXPLICIT}">${this.#t('awarenessExplicit')}</option>
            </select>
          </label>

          <label class="vt-field">
            ${this.#t('awarenessTarget')}
            <select data-vt-awareness-scope>
              <option value="${AwarenessScope.CONTROLLED}">${this.#t('targetControlled')}</option>
              <option value="${AwarenessScope.OBSERVERS}">${this.#t('targetObservers')}</option>
              <option value="${AwarenessScope.BOTH}">${this.#t('targetBoth')}</option>
            </select>
          </label>

          <details class="vt-inline-options">
            <summary>${summaryTitle(this.#t('humanIntent'), this.#t('tipHumanIntent'))}</summary>
            <p class="vt-help">${this.#t('humanIntentHelp')}</p>
            <div class="vt-chip-grid">
              <button type="button" data-vt-intent-preset="conflict">${this.#t('intentPresetConflict')}</button>
              <button type="button" data-vt-intent-preset="routine">${this.#t('intentPresetRoutine')}</button>
              <button type="button" data-vt-intent-preset="relationship">${this.#t('intentPresetRelationship')}</button>
              <button type="button" data-vt-intent-preset="plot">${this.#t('intentPresetPlot')}</button>
              <button type="button" data-vt-intent-preset="secret">${this.#t('intentPresetSecret')}</button>
            </div>
            <label class="vt-field">
              ${this.#t('intentGoal')}
              <textarea rows="2" data-vt-intent-goal placeholder="${this.#t('intentGoalPlaceholder')}"></textarea>
            </label>
            <label class="vt-field">
              ${this.#t('intentTarget')}
              <input type="text" data-vt-intent-target placeholder="${this.#t('intentTargetPlaceholder')}">
            </label>
            <label class="vt-field">
              ${this.#t('intentDisrupt')}
              <textarea rows="2" data-vt-intent-disrupt placeholder="${this.#t('intentDisruptPlaceholder')}"></textarea>
            </label>
            <label class="vt-field">
              ${this.#t('intentSecret')}
              <textarea rows="2" data-vt-intent-secret placeholder="${this.#t('intentSecretPlaceholder')}"></textarea>
            </label>
          </details>

          <details class="vt-inline-options">
            <summary>${summaryTitle(this.#t('creativeContext'), this.#t('tipCreativeContext'))}</summary>
            <p class="vt-help">${this.#t('creativeContextHelp')}</p>
            <label class="vt-field">
              ${this.#t('contextWorldview')}
              <textarea rows="2" data-vt-context-worldview placeholder="${this.#t('contextWorldviewPlaceholder')}"></textarea>
            </label>
            <label class="vt-field">
              ${this.#t('contextBackground')}
              <textarea rows="2" data-vt-context-background placeholder="${this.#t('contextBackgroundPlaceholder')}"></textarea>
            </label>
            <label class="vt-field">
              ${this.#t('contextRoleSlots')}
              <textarea rows="2" data-vt-context-role-slots placeholder="${this.#t('contextRoleSlotsPlaceholder')}"></textarea>
            </label>
            <label class="vt-field">
              ${this.#t('contextAiRules')}
              <textarea rows="2" data-vt-context-ai-rules placeholder="${this.#t('contextAiRulesPlaceholder')}"></textarea>
            </label>
            <button type="button" data-vt-save-context>${this.#t('saveContext')}</button>
            <span class="vt-copy-status" data-vt-context-status></span>
          </details>

          <details class="vt-inline-options">
            <summary>${summaryTitle(this.#t('sceneSetup'), this.#t('tipSceneSetup'))}</summary>
            <p class="vt-help">${this.#t('sceneSetupHelp')}</p>
            <div class="vt-grid">
              <label>
                ${this.#t('scene')}
                <input type="text" placeholder="${this.#t('scenePlaceholder')}" data-vt-scene-name>
              </label>
              <label>
                ${this.#t('mood')}
                <input type="text" placeholder="${this.#t('moodPlaceholder')}" data-vt-scene-mood>
              </label>
            </div>
            <button type="button" data-vt-save-scene>${this.#t('saveScene')}</button>
          </details>
        </details>

        <details class="vt-room">
          <summary>${summaryTitle(this.#t('creatorTools'), this.#t('tipCreatorTools'))}</summary>
          <p class="vt-help">${this.#t('creatorToolsHelp')}</p>

          <details class="vt-inline-options">
            <summary>${summaryTitle(this.#t('inspirationCapture'), this.#t('tipInspirationCapture'))}</summary>
            <p class="vt-help">${this.#t('inspirationHelp')}</p>
            <button type="button" data-vt-capture-inspiration>${this.#t('captureInspiration')}</button>
            <span class="vt-copy-status" data-vt-inspiration-status></span>
            <div data-vt-inspiration-list></div>
          </details>

          <details class="vt-inline-options">
            <summary>${summaryTitle(this.#t('brainstormSpace'), this.#t('tipBrainstormSpace'))}</summary>
            <textarea rows="3" data-vt-brainstorm-content placeholder="${this.#t('brainstormPlaceholder')}"></textarea>
            <details class="vt-inline-options">
              <summary>${this.#t('brainstormAdvanced')}</summary>
              <label class="vt-field">
                ${this.#t('brainstormKind')}
                <select data-vt-brainstorm-kind>
                  <option value="${BrainstormKind.SPARK}">${this.#t('brainstormSpark')}</option>
                  <option value="${BrainstormKind.CHARACTER_DRIFT}">${this.#t('brainstormCharacterDrift')}</option>
                  <option value="${BrainstormKind.CONFLICT}">${this.#t('brainstormConflict')}</option>
                  <option value="${BrainstormKind.WRITABLE_SCENE}">${this.#t('brainstormWritableScene')}</option>
                  <option value="${BrainstormKind.NEXT_CAMEO}">${this.#t('brainstormNextCameo')}</option>
                </select>
              </label>
            </details>
            <button type="button" data-vt-save-brainstorm>${this.#t('saveBrainstorm')}</button>
            <span class="vt-copy-status" data-vt-brainstorm-status></span>
            <div data-vt-brainstorm-list></div>
          </details>

          <details class="vt-inline-options">
            <summary>${summaryTitle(this.#t('branchPoint'), this.#t('tipBranchPoint'))}</summary>
            <p class="vt-help">${this.#t('branchPointHelp')}</p>
            <div class="vt-grid">
              <label>
                ${this.#t('title')}
                <input type="text" placeholder="${this.#t('titlePlaceholder')}" data-vt-branch-title>
              </label>
              <label>
                ${this.#t('type')}
                <select data-vt-branch-type>
                  <option value="${BranchType.RELATIONSHIP}">${this.#t('branchRelationship')}</option>
                  <option value="${BranchType.CONSPIRACY}">${this.#t('branchConspiracy')}</option>
                  <option value="${BranchType.IDENTITY}">${this.#t('branchIdentity')}</option>
                  <option value="${BranchType.WORLD_FRACTURE}">${this.#t('branchWorldFracture')}</option>
                  <option value="${BranchType.CLUE_CONTAMINATION}">${this.#t('branchClueContamination')}</option>
                  <option value="${BranchType.EMOTIONAL_RUPTURE}">${this.#t('branchEmotionalRupture')}</option>
                  <option value="${BranchType.OTHER}">${this.#t('branchOther')}</option>
                </select>
              </label>
            </div>
            <label class="vt-field">
              ${this.#t('branchSummary')}
              <textarea rows="3" data-vt-branch-summary placeholder="${this.#t('branchSummaryPlaceholder')}"></textarea>
            </label>
            <div class="vt-grid">
              <input type="text" placeholder="${this.#t('optionA')}" data-vt-branch-option>
              <input type="text" placeholder="${this.#t('optionB')}" data-vt-branch-option>
            </div>
            <input type="text" placeholder="${this.#t('optionC')}" data-vt-branch-option>
            <button type="button" data-vt-mark-branch>${this.#t('markBranchPoint')}</button>
            <span class="vt-copy-status" data-vt-branch-status></span>
          </details>

          <details class="vt-branch-list">
            <summary>${this.#t('savedBranchPoints')}</summary>
            <div data-vt-branch-list></div>
          </details>

          ${sectionTitle(this.#t('materialWorkbench'), this.#t('tipMaterialWorkbench'))}
          <p class="vt-help">${this.#t('materialWorkbenchHelp')}</p>
          <textarea rows="8" readonly data-vt-material-output placeholder="${this.#t('materialPlaceholder')}"></textarea>
          <div class="vt-actions">
            <button type="button" data-vt-organize-material>${this.#t('organizeMaterial')}</button>
            <button type="button" data-vt-copy-material>${this.#t('copyMaterial')}</button>
          </div>
          <button type="button" data-vt-export-material>${this.#t('exportOrganizedMaterial')}</button>
          <span class="vt-copy-status" data-vt-material-status></span>

          <div class="vt-actions">
            <button type="button" data-vt-export-md>${this.#t('exportMarkdown')}</button>
            <button type="button" data-vt-export-creator-pack>${this.#t('exportCreatorPack')}</button>
            <button type="button" data-vt-export-character-prompt>${this.#t('exportCharacterPrompt')}</button>
            <button type="button" data-vt-export-json>${this.#t('exportJson')}</button>
          </div>
        </details>

        <details class="vt-debug">
          <summary>${summaryTitle(this.#t('debug'), this.#t('tipDebug'))}</summary>
          <p class="vt-help">${this.#t('debugHelp')}</p>
          <strong>${this.#t('activeIntrusions')}</strong>
          <ul class="vt-active-list" data-vt-active-list></ul>
          <p class="vt-debug-warning" data-vt-debug-warning></p>
          <dl data-vt-debug></dl>
          <div class="vt-actions">
            <button type="button" data-vt-copy-handoff>${this.#t('copyLatestHandoff')}</button>
            <button type="button" data-vt-copy-debug>${this.#t('copyDebugSnapshot')}</button>
          </div>
          <span class="vt-copy-status" data-vt-copy-status></span>
        </details>
      </section>
    `;
  }

  #t(key, values = {}) {
    return translate(this.language, key, values);
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

function formatDebugState(debug, language) {
  const warning = document.querySelector('#vistr-tavern-root [data-vt-debug-warning]');
  if (warning) {
    warning.textContent = debugWarning(debug, language);
    warning.hidden = !warning.textContent;
  }

  const rows = [
    [translate(language, 'debugVersion'), debug.version || translate(language, 'unknown')],
    [translate(language, 'debugCompatibility'), formatCompatibility(debug.compatibility, language)],
    [translate(language, 'debugStorage'), debug.storageMode || translate(language, 'unknown')],
    [translate(language, 'debugActiveIntrusion'), debug.activeIntrusions?.length ? debug.activeIntrusions.map((item) => item.characterName || item.characterId).join(', ') : translate(language, 'none')],
    [translate(language, 'debugPendingHandoff'), formatHandoffSummary(debug.pendingHandoff, language)],
    [translate(language, 'debugLastInjected'), formatHandoffSummary(debug.lastInjectedHandoff, language)],
    [translate(language, 'debugLastConsumed'), formatHandoffSummary(debug.lastConsumedHandoff, language)],
    [translate(language, 'debugAwarenessEvents'), debug.awarenessEventCount ?? 0],
    [translate(language, 'debugInspirationCaptures'), debug.inspirationCaptureCount ?? 0],
    [translate(language, 'debugBrainstormNotes'), debug.brainstormNoteCount ?? 0],
    [translate(language, 'debugLastNativeInputSend'), formatNativeInputSend(debug.lastNativeInputSend, language)],
    [translate(language, 'debugLastTakeoverSend'), formatTakeoverSend(debug.lastTakeoverSend, language)],
    [translate(language, 'debugPendingReactionAnchor'), formatReactionAnchor(debug.pendingReactionAnchor, language)],
    [translate(language, 'debugLastReactionAnchor'), formatReactionAnchor(debug.lastReactionAnchor, language)],
    [translate(language, 'debugLastAiMessage'), debug.lastCapturedAiMessage ? `${debug.lastCapturedAiMessage.speakerName} · ${debug.lastCapturedAiMessage.createdAt}` : translate(language, 'none')],
    [translate(language, 'debugInterceptor'), debug.lastInterceptorCallAt ? `${debug.lastInjectionResult} · ${debug.lastInterceptorCallAt}` : debug.lastInjectionResult || translate(language, 'notCalled')],
    [translate(language, 'debugLastError'), debug.lastError ? `${debug.lastError.type}: ${debug.lastError.message}` : debug.lastInjectionError || translate(language, 'none')],
  ];

  return rows
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join('');
}

function formatReactionAnchor(anchor, language) {
  if (!anchor) {
    return translate(language, 'none');
  }

  const status = anchor.consumedAt
    ? translate(language, 'anchorConsumed')
    : anchor.injectedAt
      ? translate(language, 'anchorInjected')
      : translate(language, 'anchorPending');
  return `${anchor.characterName || translate(language, 'unknown')} · ${status} · ${anchor.contentPreview || ''}`;
}

function formatTakeoverSend(send, language) {
  if (!send) {
    return translate(language, 'none');
  }

  const status = send.ok ? translate(language, 'ok') : translate(language, 'failed');
  return `${send.speakerName || translate(language, 'unknown')} · ${status} · ${send.method || translate(language, 'unknown')}`;
}

function formatNativeInputSend(send, language) {
  if (!send) {
    return translate(language, 'none');
  }

  return `${send.speakerName || translate(language, 'unknown')} · ${send.status || translate(language, 'unknown')}`;
}

function formatBranchList(branchPoints, language) {
  if (!branchPoints.length) {
    return `<p class="vt-help">${escapeHtml(translate(language, 'noSavedBranchPoints'))}</p>`;
  }

  return branchPoints.map((branch) => {
    const options = branch.options?.length
      ? `<ul>${branch.options.map((option) => `<li>${escapeHtml(option)}</li>`).join('')}</ul>`
      : '';
    return [
      '<article class="vt-branch-card">',
      `<strong>${escapeHtml(branch.title)}</strong>`,
      `<span>${escapeHtml(translate(language, 'branchListMeta', {
        type: branch.type,
        character: branch.characterName || branch.characterId || translate(language, 'unknown'),
      }))}</span>`,
      `<p>${escapeHtml(branch.summary)}</p>`,
      options,
      '</article>',
    ].join('');
  }).join('');
}

function formatInspirationList(captures, language) {
  if (!captures.length) {
    return `<p class="vt-help">${escapeHtml(translate(language, 'noInspirationCaptures'))}</p>`;
  }

  return captures.map((capture) => [
    '<article class="vt-branch-card">',
    `<strong>${escapeHtml(capture.characterName || capture.characterId || translate(language, 'unknown'))}</strong>`,
    `<p>${escapeHtml(capture.summary || '')}</p>`,
    `<p>${escapeHtml(capture.antiRoutine || '')}</p>`,
    capture.nextDirections?.length
      ? `<ul>${capture.nextDirections.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : '',
    '</article>',
  ].join('')).join('');
}

function formatBrainstormList(notes, language) {
  if (!notes.length) {
    return `<p class="vt-help">${escapeHtml(translate(language, 'noBrainstormNotes'))}</p>`;
  }

  return notes.map((note) => [
    '<article class="vt-branch-card">',
    `<strong>${escapeHtml(translate(language, `brainstormKind_${note.kind}`) || note.kind)}</strong>`,
    `<span>${escapeHtml(note.characterName || note.characterId || translate(language, 'general'))}</span>`,
    `<p>${escapeHtml(note.content)}</p>`,
    '</article>',
  ].join('')).join('');
}

function sectionTitle(label, tip) {
  return `<div class="vt-section-title"><strong>${escapeHtml(label)}</strong>${helpTip(tip)}</div>`;
}

function summaryTitle(label, tip) {
  return `<span>${escapeHtml(label)}</span>${helpTip(tip)}`;
}

function helpTip(text) {
  return [
    '<span class="vt-help-tip" tabindex="0">',
    '?',
    `<span class="vt-help-tip__bubble">${escapeHtml(text)}</span>`,
    '</span>',
  ].join('');
}

function formatSelectedCharacter(character, intrusion, language) {
  if (!character) {
    return escapeHtml(translate(language, 'selectedCharacterMissing'));
  }

  const key = intrusion ? 'selectedCharacterActive' : 'selectedCharacterReady';
  return escapeHtml(translate(language, key, { character: character.name }));
}

function formatPanelStatus({ selectedCharacter, selectedIntrusion, pendingHandoffCount, messageCount }, language) {
  if (selectedIntrusion) {
    return translate(language, 'panelStatusActive', { character: selectedIntrusion.characterName || selectedCharacter?.name || selectedIntrusion.characterId });
  }

  if (pendingHandoffCount) {
    return translate(language, 'panelStatusHandoff');
  }

  if (selectedCharacter) {
    return translate(language, 'panelStatusReady', { character: selectedCharacter.name });
  }

  return translate(language, 'panelStatusEmpty', { messages: messageCount || 0 });
}

function formatTakeoverGuide({ selectedCharacter, selectedIntrusion, pendingHandoffCount }, language) {
  if (!selectedCharacter) {
    return [
      `<strong>${escapeHtml(translate(language, 'takeoverNoCharacterTitle'))}</strong>`,
      `<p>${escapeHtml(translate(language, 'takeoverNoCharacterBody'))}</p>`,
    ].join('');
  }

  if (selectedIntrusion) {
    return [
      `<strong>${escapeHtml(translate(language, 'takeoverActiveTitle', { character: selectedCharacter.name }))}</strong>`,
      `<p>${escapeHtml(translate(language, 'takeoverActiveBody', {
        character: selectedCharacter.name,
        until: new Date(selectedIntrusion.endsAt).toLocaleTimeString(),
      }))}</p>`,
      `<p>${escapeHtml(translate(language, 'takeoverActiveHint', { character: selectedCharacter.name }))}</p>`,
    ].join('');
  }

  if (pendingHandoffCount) {
    return [
      `<strong>${escapeHtml(translate(language, 'takeoverHandoffTitle'))}</strong>`,
      `<p>${escapeHtml(translate(language, 'takeoverHandoffBody'))}</p>`,
    ].join('');
  }

  return [
    `<strong>${escapeHtml(translate(language, 'takeoverReadyTitle', { character: selectedCharacter.name }))}</strong>`,
    `<p>${escapeHtml(translate(language, 'takeoverReadyBody', { character: selectedCharacter.name }))}</p>`,
  ].join('');
}

function setInputValue(root, selector, value = '') {
  const input = root.querySelector(selector);
  if (input && document.activeElement !== input) {
    input.value = value || '';
  }
}

function formatCompatibility(compatibility, language) {
  if (!compatibility) {
    return translate(language, 'unknown');
  }

  const missing = [
    [translate(language, 'compatContext'), compatibility.hasSillyTavernContext],
    [translate(language, 'compatCharacters'), compatibility.hasCharactersArray],
    [translate(language, 'compatChat'), compatibility.hasChatArray],
    [translate(language, 'compatEvents'), compatibility.hasEventSource],
    [translate(language, 'compatMessageEvent'), compatibility.hasMessageReceivedEvent],
    [translate(language, 'compatSlashCommands'), compatibility.hasSlashCommandExecution],
    [translate(language, 'compatChatInsert'), compatibility.hasAddOneMessage],
    [translate(language, 'compatNativeInput'), compatibility.hasNativeChatInput],
    [translate(language, 'compatNativeSend'), compatibility.hasNativeSendButton],
    [translate(language, 'compatPromptInterceptor'), compatibility.hasPromptInterceptor],
  ].filter(([, ok]) => !ok).map(([label]) => label);

  return missing.length
    ? translate(language, 'compatCheck', { items: missing.join(', ') })
    : translate(language, 'ok');
}

function debugWarning(debug, language) {
  if (debug.pendingHandoff && !debug.lastInterceptorCallAt) {
    return translate(language, 'warningInterceptorNotCalled');
  }

  if (debug.pendingHandoff && debug.lastInjectionResult?.startsWith('skipped')) {
    return translate(language, 'warningInjectionSkipped', { result: debug.lastInjectionResult });
  }

  if (debug.lastInjectionResult === 'error') {
    return translate(language, 'warningInjectionError');
  }

  return '';
}

function formatHandoffSummary(handoff, language) {
  if (!handoff) {
    return translate(language, 'none');
  }

  const status = handoff.consumedAt
    ? translate(language, 'handoffConsumed')
    : handoff.lastInjectedAt
      ? translate(language, 'handoffInjected')
      : translate(language, 'handoffPending');
  return `${handoff.characterName || handoff.id} · ${status} · ${handoff.awareness}/${handoff.awarenessScope || 'controlled'}`;
}

function getStoredLanguage() {
  return normalizeLanguage(readLocalStorage(LANGUAGE_STORAGE_KEY) || DEFAULT_LANGUAGE);
}

function normalizeLanguage(value) {
  return value === 'en' ? 'en' : 'zh-CN';
}

function getStoredTakeoverMarkerStyle() {
  return normalizeTakeoverMarkerStyle(readLocalStorage(TAKEOVER_MARKER_STORAGE_KEY) || 'hidden');
}

function normalizeTakeoverMarkerStyle(value) {
  return ['hidden', 'ai', 'vt'].includes(value) ? value : 'hidden';
}

function readLocalStorage(key) {
  try {
    return globalThis.localStorage?.getItem(key) || '';
  } catch {
    return '';
  }
}

function writeLocalStorage(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Ignore storage failures. Language switching remains usable for the current render.
  }
}

function translate(language, key, values = {}) {
  const dictionary = I18N[language] || I18N[DEFAULT_LANGUAGE];
  const template = Object.hasOwn(dictionary, key)
    ? dictionary[key]
    : Object.hasOwn(I18N.en, key)
      ? I18N.en[key]
      : key;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

const I18N = {
  en: {
    activeIntrusions: 'Active Intrusions',
    anonymous: 'Anonymous',
    anchorConsumed: 'consumed',
    anchorInjected: 'injected',
    anchorPending: 'pending',
    awarenessAfterRecovery: 'Awareness after recovery',
    awarenessExplicit: 'Reality doubt',
    awarenessNone: 'AI no awareness',
    awarenessSubtle: 'Memory fracture',
    awarenessTarget: 'Awareness target',
    branchClueContamination: 'Clue contamination',
    branchConspiracy: 'Conspiracy',
    brainstormCharacterDrift: 'Character drift',
    brainstormConflict: 'Conflict escalation',
    brainstormKind: 'Note type',
    brainstormKind_character_drift: 'Character drift',
    brainstormKind_conflict: 'Conflict escalation',
    brainstormKind_next_cameo: 'Next cameo',
    brainstormKind_spark: 'Spark',
    brainstormKind_writable_scene: 'Writable scene',
    brainstormNextCameo: 'Next cameo',
    brainstormAdvanced: 'Note type',
    brainstormPlaceholder: 'Jot down a spark after the cameo. This stays creator-only.',
    brainstormRequired: 'Brainstorm content is required',
    brainstormSaved: 'Brainstorm note saved',
    brainstormSpace: 'Creator Brainstorm Space',
    brainstormSpark: 'Spark',
    brainstormWritableScene: 'Writable scene',
    branchEmotionalRupture: 'Emotional rupture',
    branchIdentity: 'Identity reveal',
    branchMarked: 'Branch point marked',
    branchOther: 'Other',
    branchPoint: 'Branch Point',
    branchRelationship: 'Relationship',
    branchRequired: 'Branch title and summary are required',
    branchListMeta: '{type} · {character}',
    branchSummary: 'Branch summary',
    branchSummaryPlaceholder: 'What new route did this intrusion open?',
    branchWorldFracture: 'World fracture',
    character: 'Character',
    compatCharacters: 'characters',
    compatChat: 'chat',
    compatCheck: 'check: {items}',
    compatContext: 'context',
    compatEvents: 'events',
    compatChatInsert: 'chat insert',
    compatMessageEvent: 'message event',
    compatNativeInput: 'native input',
    compatNativeSend: 'native send button',
    compatPromptInterceptor: 'prompt interceptor',
    compatSlashCommands: 'slash commands',
    collapsePanel: 'Collapse',
    copyDebugSnapshot: 'Copy Debug Snapshot',
    copyFailed: 'Copy failed',
    copyLatestHandoff: 'Copy Latest Handoff',
    captureInspiration: 'Capture Inspiration',
    contextAiRules: 'AI continuity notes',
    contextAiRulesPlaceholder: 'Continuity to preserve, NPC reaction style, world consequences...',
    contextBackground: 'Current situation',
    contextBackgroundPlaceholder: 'What pressure or unresolved conflict exists before the cameo?',
    contextRoleSlots: 'Cameo roles',
    contextRoleSlotsPlaceholder: 'Which characters or role types can be briefly played?',
    contextSaved: 'Creative context saved',
    contextWorldview: 'Story premise',
    contextWorldviewPlaceholder: 'Court intrigue, haunted city, closed manor, virtual stage...',
    creativeContext: 'Creative Context',
    creativeContextHelp: 'Optional notes for exports and material organization. This is local creator context, not a shared multiplayer feature.',
    creatorTools: 'Organize & Export',
    creatorToolsHelp: 'Secondary tools for marking branches, organizing material, and exporting files after a useful scene exists.',
    debug: 'Debug',
    debugHelp: 'Troubleshooting data for prompt injection, pending handoffs, captured AI messages, and storage state.',
    debugActiveIntrusion: 'Active intrusion',
    debugAwarenessEvents: 'Awareness events',
    debugBrainstormNotes: 'Brainstorm notes',
    debugCompatibility: 'Compatibility',
    debugInspirationCaptures: 'Inspiration captures',
    debugInterceptor: 'Interceptor',
    debugLastAiMessage: 'Last AI message',
    debugLastConsumed: 'Last consumed',
    debugLastError: 'Last error',
    debugLastInjected: 'Last injected',
    debugLastNativeInputSend: 'Last native input send',
    debugLastReactionAnchor: 'Last reaction anchor',
    debugLastTakeoverSend: 'Last takeover send',
    debugPendingReactionAnchor: 'Pending reaction anchor',
    debugPendingHandoff: 'Pending handoff',
    debugSnapshotCopied: 'Debug snapshot copied',
    debugStorage: 'Storage',
    debugVersion: 'Version',
    director: 'Director',
    dismissGuide: 'Got it',
    durationMin: 'Duration min',
    end: 'End',
    endIntrusionFor: 'End takeover',
    exportCharacterPrompt: 'Export Character Prompt',
    exportCreatorPack: 'Export Creator Pack',
    exportJson: 'Export JSON',
    exportMarkdown: 'Export Markdown',
    exportOrganizedMaterial: 'Export Organized Material',
    firstRunRecord: 'Type in the normal SillyTavern chat box. During takeover, VT sends it as that character.',
    firstRunRecover: 'End takeover when finished, then let the AI continue.',
    firstRunStart: 'Choose a character and start takeover.',
    firstRunTitle: 'Quick Start',
    failed: 'failed',
    general: 'general',
    handoffConsumed: 'consumed',
    handoffInjected: 'injected',
    handoffPending: 'pending',
    humanAnomalyLine: 'Takeover line',
    humanIntent: 'Human Intent',
    humanIntentHelp: 'Optional creator note for why this human cameo exists. Presets are enough for most runs.',
    humanLinePlaceholder: 'Fallback only: type the line to send as the selected character.',
    intrusionEndedFor: 'Ended takeover for {character}. Generate the next AI reply when you want AI control back.',
    intrusionStartedFor: 'Now taking over {character}. Type in the normal SillyTavern chat box; VT will send it as this character.',
    inspirationCapture: 'Inspiration Capture',
    inspirationCaptured: 'Inspiration captured',
    inspirationHelp: 'After an intrusion ends, capture why the real human cameo felt different from normal AI ensemble output.',
    intentDisrupt: 'Relationship or rule to disrupt',
    intentDisruptPlaceholder: 'Break trust, contaminate testimony, expose a contradiction...',
    intentGoal: 'What does the human want to create?',
    intentGoalPlaceholder: 'A confrontation, rumor, reversal, secret, betrayal...',
    intentPresetConflict: 'Create conflict',
    intentPresetPlot: 'Push plot',
    intentPresetRelationship: 'Test relationship',
    intentPresetRoutine: 'Break routine',
    intentPresetSecret: 'Hide motive',
    intentPreset_conflict_disrupt: 'Break the current agreement or emotional balance.',
    intentPreset_conflict_goal: 'Create a direct confrontation.',
    intentPreset_conflict_secret: '',
    intentPreset_conflict_target: 'The character who should feel pressure.',
    intentPreset_plot_disrupt: 'Force the scene to stop circling and choose a consequence.',
    intentPreset_plot_goal: 'Push the plot into the next irreversible beat.',
    intentPreset_plot_secret: '',
    intentPreset_plot_target: 'The character holding the current decision.',
    intentPreset_relationship_disrupt: 'Expose an unresolved need, debt, jealousy, or distrust.',
    intentPreset_relationship_goal: 'Test whether this relationship can stay stable.',
    intentPreset_relationship_secret: '',
    intentPreset_relationship_target: 'The closest or most conflicted relationship.',
    intentPreset_routine_disrupt: 'Say something the AI ensemble would normally smooth over.',
    intentPreset_routine_goal: 'Break the routine and force a less predictable reaction.',
    intentPreset_routine_secret: '',
    intentPreset_routine_target: 'The scene as a whole.',
    intentPreset_secret_disrupt: 'Leak knowledge that should not be easy to explain.',
    intentPreset_secret_goal: 'Act from a hidden motive.',
    intentPreset_secret_secret: 'A fact, lie, or motive the character should not openly explain yet.',
    intentPreset_secret_target: 'The person most affected by the secret.',
    intentSecret: 'Secret / reveal',
    intentSecretPlaceholder: 'What hidden fact or impossible knowledge might leak?',
    intentTarget: 'Target',
    intentTargetPlaceholder: 'Who should feel pressure?',
    intrusionKind: 'Intrusion type',
    intrusionKindCharacterTakeover: 'Character takeover',
    intrusionKindClueContamination: 'Clue contamination',
    intrusionKindMemoryFracture: 'Memory fracture',
    intrusionKindPlotHook: 'Plot hook',
    intrusionKindRelationshipSabotage: 'Relationship sabotage',
    intrusionKindHelp: 'Optional tag for exports and handoff behavior. Leave it as Character takeover for normal use.',
    language: 'Language',
    latestHandoffCopied: 'Latest handoff copied',
    loading: 'loading',
    markBranchPoint: 'Mark Branch Point',
    materialCopied: 'Organized material copied',
    materialOrganized: 'Material organized',
    materialPlaceholder: 'Click Organize Material to generate a creator-ready summary.',
    materialWorkbench: 'Material Workbench',
    materialWorkbenchHelp: 'Collect anomaly lines, AI reactions, conflict hooks, branch routes, and next writing moves from the current memory.',
    mood: 'Mood',
    moodPlaceholder: 'oppressive',
    noActiveIntrusion: 'No active intrusion',
    noBrainstormNotes: 'No brainstorm notes yet',
    noHandoffAvailable: 'No handoff available',
    noInspirationAvailable: 'No completed intrusion to capture',
    noInspirationCaptures: 'No inspiration captures yet',
    noMaterialAvailable: 'No material available',
    noSavedBranchPoints: 'No branch points marked',
    none: 'none',
    notCalled: 'not-called',
    ok: 'ok',
    openPanel: 'Open VistrTavern',
    optionA: 'Option A',
    optionB: 'Option B',
    optionC: 'Option C',
    panelFallbackSend: 'Fallback: panel send',
    panelFallbackSendHelp: 'Default flow uses the normal SillyTavern chat box. Use this only if native input routing fails.',
    optionalSetup: 'More Settings',
    optionalIntrusionKind: 'Optional: disturbance tag',
    optionalSetupHelp: 'You can ignore this section for the first run. These settings add context but are not required to start a takeover.',
    recordHumanLine: 'Record Only',
    recordFallback: 'Fallback: record only',
    recordFallbackHelp: 'Use only if SillyTavern sending fails or you want a private VT memory note without inserting a chat message.',
    refresh: 'Refresh',
    refreshShort: '↻',
    refreshStatus: 'Refreshed {count} characters at {time}',
    restartIntrusion: 'Restart takeover',
    panelOpen: 'VistrTavern is open',
    panelSettings: 'Settings',
    panelStatusActive: 'Taking over {character}',
    panelStatusEmpty: 'Open a chat and choose a character',
    panelStatusHandoff: 'Ready for AI to continue',
    panelStatusReady: 'Ready: {character}',
    saveBrainstorm: 'Save Brainstorm Note',
    saveContext: 'Save Context',
    saveScene: 'Save Scene',
    scene: 'Scene',
    sceneSetup: 'Scene setup',
    sceneSetupHelp: 'Optional scene labels for exports and memory grouping. Leave blank if you just want to try the takeover loop.',
    scenePlaceholder: 'Royal Banquet',
    scenarioMurderMystery: 'AI murder mystery',
    scenarioPreset: 'Scenario preset',
    scenarioVirtualTheater: 'Virtual theater',
    scenarioWebNovel: 'Web novel / script',
    savedBranchPoints: 'Saved Branch Points',
    copyMaterial: 'Copy Material',
    organizeMaterial: 'Organize Material',
    startIntrusion: 'Start takeover',
    statusLine: '{mode} · {messages} messages · {intrusions} intrusions · {handoffs} pending handoffs',
    targetBoth: 'Both',
    targetControlled: 'Controlled character',
    targetObservers: 'Observers',
    takeoverMarker: 'Takeover marker',
    takeoverMarkerAi: 'AI-like icon',
    takeoverMarkerHidden: 'Hidden',
    takeoverMarkerVt: 'VT marker',
    tipBrainstormSpace: 'A private creator scratchpad. It does not enter chat or prompt injection.',
    tipBranchPoint: 'Mark a route opened by the cameo, such as a relationship crack, identity reveal, or clue conflict.',
    tipCreatorTools: 'Post-play tools. Open this after you already have useful material.',
    tipCreativeContext: 'Optional local notes used by exports and material organization only.',
    tipDebug: 'Use this only when checking whether handoff injection, storage, or AI capture worked.',
    tipHumanIntent: 'Optional. Explains the human player’s dramatic purpose so exports can preserve the intent.',
    tipInspirationCapture: 'After an intrusion ends, turn the human cameo and AI reaction into reusable writing prompts.',
    tipMaterialWorkbench: 'One-click organizer for turning the session memory into creator-ready notes.',
    tipOptionalSetup: 'Advanced context. Not required for the first run.',
    tipSceneSetup: 'Labels the current scene and tension so later exports have better context.',
    selectedCharacterActive: '{character} is under your control.',
    selectedCharacterMissing: 'No character detected. Refresh the chat or check SillyTavern compatibility.',
    selectedCharacterReady: '{character} is selected.',
    takeoverActiveBody: 'Until {until}, your normal chat-box send becomes {character} speaking.',
    takeoverActiveHint: 'Write as {character} in the SillyTavern chat box, then press Send.',
    takeoverActiveTitle: 'You are {character}',
    takeoverHandoffBody: 'Generate the next AI reply when you want the story to continue from the takeover.',
    takeoverHandoffTitle: 'AI can continue now',
    takeoverNoCharacterBody: 'Open a chat with at least one character, then refresh VistrTavern.',
    takeoverNoCharacterTitle: 'No role selected',
    takeoverReadyBody: 'Click Start when you want your next chat-box send to become {character}.',
    takeoverReadyTitle: 'Ready: {character}',
    takeoverStepCapture: 'After recovery, click Capture Inspiration to turn this moment into writing material.',
    takeoverStepEnd: 'Click End when the cameo is finished.',
    sendAsCharacterAndRecord: 'Send as {character} & Record',
    sendAsCharacterAndRecordGeneric: 'Send as Character & Record',
    sendAsCharacterFailed: 'Send failed: {message}',
    sentAsCharacter: 'Sent as {character} and recorded.',
    takeoverStepRecord: 'Press Send in SillyTavern. VT routes the line through /sendas and records it.',
    takeoverStepReply: 'Let SillyTavern generate the other characters’ reaction.',
    takeoverStepWrite: 'Write one line or action as {character} in the normal SillyTavern chat box.',
    tension: 'Tension',
    title: 'Title',
    titlePlaceholder: 'Identity reveal',
    type: 'Type',
    unknown: 'unknown',
    until: 'until',
    warningInjectionError: 'Prompt injection failed. Copy the Debug Snapshot when reporting this issue.',
    warningInjectionSkipped: 'Pending handoff still exists. Last injection result: {result}. Use Copy Latest Handoff if automatic injection is unclear.',
    warningInterceptorNotCalled: 'Pending handoff is waiting, but the prompt interceptor has not been called yet. Generate the next reply or use Copy Latest Handoff.',
  },
  'zh-CN': {
    activeIntrusions: '进行中的接管',
    anonymous: '匿名',
    anchorConsumed: '已消费',
    anchorInjected: '已注入',
    anchorPending: '待处理',
    awarenessAfterRecovery: '恢复后异常察觉',
    awarenessExplicit: '怀疑',
    awarenessNone: 'AI 无感',
    awarenessSubtle: '断片',
    awarenessTarget: '察觉对象',
    branchClueContamination: '线索污染',
    branchConspiracy: '阴谋线',
    brainstormCharacterDrift: '角色人格变化',
    brainstormConflict: '冲突升级',
    brainstormKind: '笔记类型',
    brainstormKind_character_drift: '角色人格变化',
    brainstormKind_conflict: '冲突升级',
    brainstormKind_next_cameo: '下次客串',
    brainstormKind_spark: '灵感火花',
    brainstormKind_writable_scene: '可写片段',
    brainstormNextCameo: '下次客串',
    brainstormAdvanced: '笔记类型',
    brainstormPlaceholder: '客串后顺手记一个灵感。这里是创作者私有笔记。',
    brainstormRequired: '需要填写脑暴内容',
    brainstormSaved: '脑暴笔记已保存',
    brainstormSpace: '创作者脑暴空间',
    brainstormSpark: '灵感火花',
    brainstormWritableScene: '可写片段',
    branchEmotionalRupture: '情绪破裂',
    branchIdentity: '身份揭露',
    branchMarked: '剧情分支已标记',
    branchOther: '其他',
    branchPoint: '剧情分支',
    branchRelationship: '关系线',
    branchRequired: '需要填写分支标题和说明',
    branchListMeta: '{type} · {character}',
    branchSummary: '分支说明',
    branchSummaryPlaceholder: '这次 intrusion 打开了什么新路线？',
    branchWorldFracture: '世界观裂缝',
    character: '角色',
    compatCharacters: '角色数据',
    compatChat: '聊天数据',
    compatCheck: '需检查：{items}',
    compatContext: '上下文',
    compatEvents: '事件系统',
    compatChatInsert: '聊天插入',
    compatMessageEvent: '消息事件',
    compatNativeInput: '原生输入框',
    compatNativeSend: '原生发送按钮',
    compatPromptInterceptor: 'prompt interceptor',
    compatSlashCommands: 'slash 命令',
    collapsePanel: '收起',
    copyDebugSnapshot: '复制 Debug 快照',
    copyFailed: '复制失败',
    copyLatestHandoff: '复制最新 Handoff',
    captureInspiration: '捕获灵感',
    contextAiRules: 'AI 连续性备注',
    contextAiRulesPlaceholder: '需要保留的连续性、NPC 反应方式、世界后果……',
    contextBackground: '当前局面',
    contextBackgroundPlaceholder: '客串前已经存在什么压力或未解决冲突？',
    contextRoleSlots: '可客串角色',
    contextRoleSlotsPlaceholder: '哪些角色或角色类型可以被短暂客串？',
    contextSaved: '创作上下文已保存',
    contextWorldview: '故事前提',
    contextWorldviewPlaceholder: '宫廷阴谋、闹鬼城市、封闭庄园、虚拟舞台……',
    creativeContext: '创作上下文',
    creativeContextHelp: '用于导出和素材整理的可选本地备注。它不是共享多人功能。',
    creatorTools: '整理与导出',
    creatorToolsHelp: '有一段可用素材之后再打开：标记剧情分支、整理素材、导出文件。',
    debug: 'Debug',
    debugHelp: '排查 prompt 注入、待处理 handoff、AI 捕获和存储状态时使用。',
    debugActiveIntrusion: '进行中的接管',
    debugAwarenessEvents: '异常察觉事件',
    debugBrainstormNotes: '脑暴笔记',
    debugCompatibility: '兼容性',
    debugInspirationCaptures: '灵感捕获',
    debugInterceptor: 'Interceptor',
    debugLastAiMessage: '最近 AI 消息',
    debugLastConsumed: '最近消费',
    debugLastError: '最近错误',
    debugLastInjected: '最近注入',
    debugLastNativeInputSend: '最近原生输入发送',
    debugLastReactionAnchor: '最近反应锚点',
    debugLastTakeoverSend: '最近接管发送',
    debugPendingReactionAnchor: '待处理反应锚点',
    debugPendingHandoff: '待处理 Handoff',
    debugSnapshotCopied: 'Debug 快照已复制',
    debugStorage: '存储',
    debugVersion: '版本',
    director: '导演模式',
    dismissGuide: '知道了',
    durationMin: '持续分钟',
    end: '结束',
    endIntrusionFor: '结束接管',
    exportCharacterPrompt: '导出人设 Prompt',
    exportCreatorPack: '导出创作包',
    exportJson: '导出 JSON',
    exportMarkdown: '导出 Markdown',
    exportOrganizedMaterial: '导出整理素材',
    firstRunRecord: '直接在 SillyTavern 原来的聊天框输入。接管期间，VT 会把它发送成该角色的话。',
    firstRunRecover: '说完后结束接管，再让 AI 继续。',
    firstRunStart: '选择角色，开始接管。',
    firstRunTitle: '快速开始',
    failed: '失败',
    general: '通用',
    handoffConsumed: '已消费',
    handoffInjected: '已注入',
    handoffPending: '待处理',
    humanAnomalyLine: '接管发言',
    humanIntent: '真人意图',
    humanIntentHelp: '可选的创作者备注，用来记录这次真人客串为什么存在。大多数时候点快捷按钮就够。',
    humanLinePlaceholder: '仅 fallback：输入要作为当前角色发出的内容。',
    intrusionEndedFor: '已结束 {character} 的接管。需要把控制权还给 AI 时，再生成下一条回复。',
    intrusionStartedFor: '正在接管 {character}。直接在 SillyTavern 原聊天框输入，VT 会发送成这个角色的话。',
    inspirationCapture: '互动灵感捕获',
    inspirationCaptured: '灵感已捕获',
    inspirationHelp: 'intrusion 结束后，捕获这次真人客串为什么不同于普通 AI 群像输出。',
    intentDisrupt: '想破坏的关系或规则',
    intentDisruptPlaceholder: '破坏信任、污染证词、暴露矛盾……',
    intentGoal: '真人想制造什么？',
    intentGoalPlaceholder: '对抗、谣言、反转、秘密、背叛……',
    intentPresetConflict: '制造冲突',
    intentPresetPlot: '推动剧情',
    intentPresetRelationship: '试探关系',
    intentPresetRoutine: '打破套路',
    intentPresetSecret: '隐藏目的',
    intentPreset_conflict_disrupt: '打破当前共识或情绪平衡。',
    intentPreset_conflict_goal: '制造一次正面对抗。',
    intentPreset_conflict_secret: '',
    intentPreset_conflict_target: '最应该感到压力的角色。',
    intentPreset_plot_disrupt: '让场景停止原地打转，必须产生一个后果。',
    intentPreset_plot_goal: '把剧情推到下一个不可逆节点。',
    intentPreset_plot_secret: '',
    intentPreset_plot_target: '当前掌握选择权的角色。',
    intentPreset_relationship_disrupt: '暴露未解决的需求、亏欠、嫉妒或不信任。',
    intentPreset_relationship_goal: '试探这段关系还能不能保持稳定。',
    intentPreset_relationship_secret: '',
    intentPreset_relationship_target: '关系最近或矛盾最深的对象。',
    intentPreset_routine_disrupt: '说一句 AI 群像通常会圆滑避开的内容。',
    intentPreset_routine_goal: '打破套路，逼出更不可预测的反应。',
    intentPreset_routine_secret: '',
    intentPreset_routine_target: '整个场景。',
    intentPreset_secret_disrupt: '泄露一条很难解释来源的信息。',
    intentPreset_secret_goal: '带着隐藏目的行动。',
    intentPreset_secret_secret: '一个暂时不该明说的事实、谎言或动机。',
    intentPreset_secret_target: '最会被这个秘密影响的人。',
    intentSecret: '秘密 / 揭露',
    intentSecretPlaceholder: '可能泄露什么隐藏事实或不可能知道的信息？',
    intentTarget: '针对对象',
    intentTargetPlaceholder: '想让谁感到压力？',
    intrusionKind: '乱入类型',
    intrusionKindCharacterTakeover: '角色接管',
    intrusionKindClueContamination: '线索污染',
    intrusionKindMemoryFracture: '记忆断片',
    intrusionKindPlotHook: '剧情钩子',
    intrusionKindRelationshipSabotage: '关系破坏',
    intrusionKindHelp: '可选标记，用于导出和 handoff。普通使用保持“角色接管”即可。',
    language: '语言',
    latestHandoffCopied: '最新 Handoff 已复制',
    loading: '加载中',
    markBranchPoint: '标记剧情分支',
    materialCopied: '整理素材已复制',
    materialOrganized: '素材已整理',
    materialPlaceholder: '点击“整理素材”生成创作者可用摘要。',
    materialWorkbench: '素材工作台',
    materialWorkbenchHelp: '从当前 memory 中整理异常发言、AI 反应、冲突钩子、分支路线和下一步可写方向。',
    mood: '氛围',
    moodPlaceholder: '压迫',
    noActiveIntrusion: '暂无进行中的接管',
    noBrainstormNotes: '暂无脑暴笔记',
    noHandoffAvailable: '暂无可复制的 handoff',
    noInspirationAvailable: '暂无已结束 intrusion 可捕获',
    noInspirationCaptures: '暂无灵感捕获',
    noMaterialAvailable: '暂无可用素材',
    noSavedBranchPoints: '暂无已标记剧情分支',
    none: '无',
    notCalled: '未调用',
    ok: '正常',
    openPanel: '打开 VistrTavern',
    optionA: '路线 A',
    optionB: '路线 B',
    optionC: '路线 C',
    panelFallbackSend: 'Fallback：面板发送',
    panelFallbackSendHelp: '默认流程使用 SillyTavern 原聊天框。只有原生输入接管失效时，才用这里。',
    optionalSetup: '更多设置',
    optionalIntrusionKind: '可选：乱入标记',
    optionalSetupHelp: '第一次使用可以完全忽略。这里的字段只增加上下文，不影响开始接管。',
    recordHumanLine: '仅记录',
    recordFallback: 'Fallback：仅记录',
    recordFallbackHelp: '只在 SillyTavern 发送失败，或你只想保存 VT 私有记忆而不插入聊天时使用。',
    refresh: '刷新',
    refreshShort: '刷新',
    refreshStatus: '已刷新：检测到 {count} 个角色 · {time}',
    restartIntrusion: '重新接管',
    panelOpen: 'VistrTavern 已打开',
    panelSettings: '设置',
    panelStatusActive: '正在接管 {character}',
    panelStatusEmpty: '打开聊天并选择角色',
    panelStatusHandoff: '可以让 AI 继续了',
    panelStatusReady: '准备接管：{character}',
    saveBrainstorm: '保存脑暴笔记',
    saveContext: '保存上下文',
    saveScene: '保存场景',
    scene: '场景',
    sceneSetup: '场景设定',
    sceneSetupHelp: '可选的场景标签，用于导出和记忆归类。只想体验接管流程时可以不填。',
    scenePlaceholder: '王都宴会',
    scenarioMurderMystery: 'AI 剧本杀',
    scenarioPreset: '场景类型',
    scenarioVirtualTheater: '虚拟剧场',
    scenarioWebNovel: '网文剧本',
    savedBranchPoints: '已保存剧情分支',
    copyMaterial: '复制素材',
    organizeMaterial: '整理素材',
    startIntrusion: '开始接管',
    statusLine: '{mode} · {messages} 条消息 · {intrusions} 次接管 · {handoffs} 个待处理 handoff',
    targetBoth: '两者',
    targetControlled: '被接管角色',
    targetObservers: '旁观者',
    takeoverMarker: '接管标记',
    takeoverMarkerAi: '像 AI 回复',
    takeoverMarkerHidden: '隐藏',
    takeoverMarkerVt: 'VT 标记',
    tipBrainstormSpace: '创作者私有随手笔记，不进入聊天，也不会注入 prompt。',
    tipBranchPoint: '标记这次客串打开的新路线，例如关系裂痕、身份揭露或线索矛盾。',
    tipCreatorTools: '后处理工具。有素材之后再打开，用来整理、标记和导出。',
    tipCreativeContext: '可选的本地备注，只用于导出和素材整理。',
    tipDebug: '只在检查 handoff 注入、存储或 AI 捕获是否正常时使用。',
    tipHumanIntent: '可选。说明真人玩家的戏剧目的，让导出时保留这层意图。',
    tipInspirationCapture: '接管结束后，把真人客串和 AI 反应整理成可复用创作提示。',
    tipMaterialWorkbench: '一键把当前记忆整理成创作者可读的素材摘要。',
    tipOptionalSetup: '高级上下文。第一次使用不需要填写。',
    tipSceneSetup: '给当前场景和张力打标签，让后续导出更有上下文。',
    selectedCharacterActive: '{character} 正在由你接管。',
    selectedCharacterMissing: '没有检测到角色。请打开聊天后刷新，或检查 SillyTavern 兼容性。',
    selectedCharacterReady: '已选择 {character}。',
    takeoverActiveBody: '到 {until} 前，你在原聊天框发送的内容会变成 {character} 的发言。',
    takeoverActiveHint: '直接在 SillyTavern 聊天框里以 {character} 的身份输入，然后发送。',
    takeoverActiveTitle: '你正在扮演 {character}',
    takeoverHandoffBody: '需要剧情继续时，直接生成下一条 AI 回复即可。',
    takeoverHandoffTitle: 'AI 可以继续了',
    takeoverNoCharacterBody: '请先打开至少包含一个角色的聊天，然后刷新 VistrTavern。',
    takeoverNoCharacterTitle: '还没有选择角色',
    takeoverReadyBody: '点击开始后，你下一次在聊天框发送的内容会变成 {character} 的话。',
    takeoverReadyTitle: '准备接管：{character}',
    takeoverStepCapture: '恢复后点击“捕获灵感”，把这次异常整理成创作素材。',
    takeoverStepEnd: '客串结束后点击“结束”。',
    sendAsCharacterAndRecord: '发送为 {character} 并记录',
    sendAsCharacterAndRecordGeneric: '发送为角色并记录',
    sendAsCharacterFailed: '发送失败：{message}',
    sentAsCharacter: '已作为 {character} 发送并记录。',
    takeoverStepRecord: '按 SillyTavern 的发送按钮。VT 会通过 /sendas 路由并记录。',
    takeoverStepReply: '让 SillyTavern 生成其他角色的反应。',
    takeoverStepWrite: '在 SillyTavern 原聊天框里，以 {character} 的身份写一句话或动作。',
    tension: '张力',
    title: '标题',
    titlePlaceholder: '身份揭露',
    type: '类型',
    unknown: '未知',
    until: '至',
    warningInjectionError: 'Prompt 注入失败。反馈问题时请复制 Debug 快照。',
    warningInjectionSkipped: '仍存在待处理 handoff。最近注入结果：{result}。如果自动注入不明确，请使用复制最新 Handoff。',
    warningInterceptorNotCalled: '存在待处理 handoff，但 prompt interceptor 还没有被调用。请生成下一条回复，或使用复制最新 Handoff。',
  },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

