import { AwarenessScope, BranchType, ControlMode, HandoffAwareness, ScenarioPreset, Visibility } from '../data/schema.js';

const LANGUAGE_STORAGE_KEY = 'vistr-tavern:language';
const FIRST_RUN_STORAGE_KEY = 'vistr-tavern:first-run-dismissed';
const DEFAULT_LANGUAGE = 'zh-CN';

export class UiOverlay {
  constructor({ getCharacters, onStartIntrusion, onEndIntrusion, onRecordHumanLine, onMarkBranchPoint, onSetScenarioPreset, onSaveScene, onCopyLatestHandoff, onExportMarkdown, onExportCreatorPack, onExportOrganizedMaterial, onExportCharacterSheetPrompt, onExportJson, getState, getDebugState }) {
    this.getCharacters = getCharacters;
    this.onStartIntrusion = onStartIntrusion;
    this.onEndIntrusion = onEndIntrusion;
    this.onRecordHumanLine = onRecordHumanLine;
    this.onMarkBranchPoint = onMarkBranchPoint;
    this.onSetScenarioPreset = onSetScenarioPreset;
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
    const scenarioSelect = this.root.querySelector('[data-vt-scenario]');
    const branchList = this.root.querySelector('[data-vt-branch-list]');

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
      ? state.activeIntrusions.map((intrusion) => `<li>${escapeHtml(intrusion.characterName || intrusion.characterId)} · ${escapeHtml(intrusion.visibility)} · ${this.#t('until')} ${new Date(intrusion.endsAt).toLocaleTimeString()}</li>`).join('')
      : `<li>${escapeHtml(this.#t('noActiveIntrusion'))}</li>`;

    status.textContent = this.#t('statusLine', {
      mode: state.viewMode,
      messages: state.messageCount,
      intrusions: state.intrusionCount,
      handoffs: state.pendingHandoffCount || 0,
    });
    guide.hidden = Boolean(readLocalStorage(FIRST_RUN_STORAGE_KEY));
    scenarioSelect.value = state.scenarioPreset || ScenarioPreset.WEB_NOVEL;
    branchList.innerHTML = formatBranchList(state.branchPoints || [], this.language);

    debugPanel.innerHTML = formatDebugState(this.getDebugState?.() || state.debug || {}, this.language);
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
      this.refresh();
    });

    this.root.querySelector('[data-vt-refresh]').addEventListener('click', () => this.refresh());

    this.root.querySelector('[data-vt-language]').addEventListener('change', (event) => {
      this.language = normalizeLanguage(event.target.value);
      writeLocalStorage(LANGUAGE_STORAGE_KEY, this.language);
      this.#render(false);
    });

    this.root.querySelector('[data-vt-scenario]').addEventListener('change', async (event) => {
      await this.onSetScenarioPreset?.(event.target.value);
      this.#render(false);
    });

    this.root.querySelector('[data-vt-dismiss-guide]').addEventListener('click', () => {
      writeLocalStorage(FIRST_RUN_STORAGE_KEY, 'true');
      this.root.querySelector('[data-vt-first-run]').hidden = true;
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
            <span data-vt-status>${this.#t('loading')}</span>
          </div>
          <div class="vt-header-actions">
            <label>
              ${this.#t('language')}
              <select data-vt-language>
                <option value="zh-CN" ${this.language === 'zh-CN' ? 'selected' : ''}>中文</option>
                <option value="en" ${this.language === 'en' ? 'selected' : ''}>English</option>
              </select>
            </label>
            <button type="button" data-vt-refresh>${this.#t('refresh')}</button>
          </div>
        </header>

        <section class="vt-first-run" data-vt-first-run>
          <strong>${this.#t('firstRunTitle')}</strong>
          <ol>
            <li>${this.#t('firstRunFolder')} <code>vistr-tavern</code>.</li>
            <li>${this.#t('firstRunStart')}</li>
            <li>${this.#t('firstRunRecord')}</li>
            <li>${this.#t('firstRunRecover')}</li>
            <li>${this.#t('firstRunFallback')}</li>
          </ol>
          <button type="button" data-vt-dismiss-guide>${this.#t('dismissGuide')}</button>
        </section>

        <div class="vt-field">
          <label>${this.#t('character')}</label>
          <select data-vt-character></select>
        </div>

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

        <div class="vt-actions">
          <button type="button" data-vt-start>${this.#t('startIntrusion')}</button>
          <button type="button" data-vt-end>${this.#t('end')}</button>
        </div>

        <hr>

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

        <hr>

        <label class="vt-field">
          ${this.#t('humanAnomalyLine')}
          <textarea rows="4" data-vt-human-line placeholder="${this.#t('humanLinePlaceholder')}"></textarea>
        </label>
        <button type="button" data-vt-record-line>${this.#t('recordHumanLine')}</button>

        <hr>

        <strong>${this.#t('branchPoint')}</strong>
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

        <details class="vt-branch-list" open>
          <summary>${this.#t('savedBranchPoints')}</summary>
          <div data-vt-branch-list></div>
        </details>

        <hr>

        <strong>${this.#t('materialWorkbench')}</strong>
        <p class="vt-help">${this.#t('materialWorkbenchHelp')}</p>
        <textarea rows="8" readonly data-vt-material-output placeholder="${this.#t('materialPlaceholder')}"></textarea>
        <div class="vt-actions">
          <button type="button" data-vt-organize-material>${this.#t('organizeMaterial')}</button>
          <button type="button" data-vt-copy-material>${this.#t('copyMaterial')}</button>
        </div>
        <button type="button" data-vt-export-material>${this.#t('exportOrganizedMaterial')}</button>
        <span class="vt-copy-status" data-vt-material-status></span>

        <hr>

        <strong>${this.#t('activeIntrusions')}</strong>
        <ul class="vt-active-list" data-vt-active-list></ul>

        <hr>

        <details class="vt-debug" open>
          <summary>${this.#t('debug')}</summary>
          <p class="vt-debug-warning" data-vt-debug-warning></p>
          <dl data-vt-debug></dl>
          <div class="vt-actions">
            <button type="button" data-vt-copy-handoff>${this.#t('copyLatestHandoff')}</button>
            <button type="button" data-vt-copy-debug>${this.#t('copyDebugSnapshot')}</button>
          </div>
          <span class="vt-copy-status" data-vt-copy-status></span>
        </details>

        <div class="vt-actions">
          <button type="button" data-vt-export-md>${this.#t('exportMarkdown')}</button>
          <button type="button" data-vt-export-creator-pack>${this.#t('exportCreatorPack')}</button>
          <button type="button" data-vt-export-character-prompt>${this.#t('exportCharacterPrompt')}</button>
          <button type="button" data-vt-export-json>${this.#t('exportJson')}</button>
        </div>
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
    [translate(language, 'debugLastAiMessage'), debug.lastCapturedAiMessage ? `${debug.lastCapturedAiMessage.speakerName} · ${debug.lastCapturedAiMessage.createdAt}` : translate(language, 'none')],
    [translate(language, 'debugInterceptor'), debug.lastInterceptorCallAt ? `${debug.lastInjectionResult} · ${debug.lastInterceptorCallAt}` : debug.lastInjectionResult || translate(language, 'notCalled')],
    [translate(language, 'debugLastError'), debug.lastError ? `${debug.lastError.type}: ${debug.lastError.message}` : debug.lastInjectionError || translate(language, 'none')],
  ];

  return rows
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join('');
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
  const template = dictionary[key] || I18N.en[key] || key;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

const I18N = {
  en: {
    activeIntrusions: 'Active Intrusions',
    anonymous: 'Anonymous',
    awarenessAfterRecovery: 'Awareness after recovery',
    awarenessExplicit: 'Reality doubt',
    awarenessNone: 'AI no awareness',
    awarenessSubtle: 'Memory fracture',
    awarenessTarget: 'Awareness target',
    branchClueContamination: 'Clue contamination',
    branchConspiracy: 'Conspiracy',
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
    compatMessageEvent: 'message event',
    compatPromptInterceptor: 'prompt interceptor',
    copyDebugSnapshot: 'Copy Debug Snapshot',
    copyFailed: 'Copy failed',
    copyLatestHandoff: 'Copy Latest Handoff',
    debug: 'Debug',
    debugActiveIntrusion: 'Active intrusion',
    debugAwarenessEvents: 'Awareness events',
    debugCompatibility: 'Compatibility',
    debugInterceptor: 'Interceptor',
    debugLastAiMessage: 'Last AI message',
    debugLastConsumed: 'Last consumed',
    debugLastError: 'Last error',
    debugLastInjected: 'Last injected',
    debugPendingHandoff: 'Pending handoff',
    debugSnapshotCopied: 'Debug snapshot copied',
    debugStorage: 'Storage',
    debugVersion: 'Version',
    director: 'Director',
    dismissGuide: 'Dismiss Guide',
    durationMin: 'Duration min',
    end: 'End',
    exportCharacterPrompt: 'Export Character Prompt',
    exportCreatorPack: 'Export Creator Pack',
    exportJson: 'Export JSON',
    exportMarkdown: 'Export Markdown',
    exportOrganizedMaterial: 'Export Organized Material',
    firstRunFallback: 'Use Debug or Copy Latest Handoff if automatic injection is unclear.',
    firstRunFolder: 'Confirm this folder is named',
    firstRunRecord: 'Record a human anomaly line.',
    firstRunRecover: 'End intrusion, then generate the next AI reply.',
    firstRunStart: 'Select a character and start an intrusion.',
    firstRunTitle: 'First Run Guide',
    handoffConsumed: 'consumed',
    handoffInjected: 'injected',
    handoffPending: 'pending',
    humanAnomalyLine: 'Human anomaly line',
    humanLinePlaceholder: 'Record the human-controlled character line here.',
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
    noHandoffAvailable: 'No handoff available',
    noMaterialAvailable: 'No material available',
    noSavedBranchPoints: 'No branch points marked',
    none: 'none',
    notCalled: 'not-called',
    ok: 'ok',
    optionA: 'Option A',
    optionB: 'Option B',
    optionC: 'Option C',
    recordHumanLine: 'Record Human Line',
    refresh: 'Refresh',
    saveScene: 'Save Scene',
    scene: 'Scene',
    scenePlaceholder: 'Royal Banquet',
    scenarioMurderMystery: 'AI murder mystery',
    scenarioPreset: 'Scenario preset',
    scenarioVirtualTheater: 'Virtual theater',
    scenarioWebNovel: 'Web novel / script',
    savedBranchPoints: 'Saved Branch Points',
    copyMaterial: 'Copy Material',
    organizeMaterial: 'Organize Material',
    startIntrusion: 'Start Intrusion',
    statusLine: '{mode} · {messages} messages · {intrusions} intrusions · {handoffs} pending handoffs',
    targetBoth: 'Both',
    targetControlled: 'Controlled character',
    targetObservers: 'Observers',
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
    awarenessAfterRecovery: '恢复后异常察觉',
    awarenessExplicit: '怀疑',
    awarenessNone: 'AI 无感',
    awarenessSubtle: '断片',
    awarenessTarget: '察觉对象',
    branchClueContamination: '线索污染',
    branchConspiracy: '阴谋线',
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
    compatMessageEvent: '消息事件',
    compatPromptInterceptor: 'prompt interceptor',
    copyDebugSnapshot: '复制 Debug 快照',
    copyFailed: '复制失败',
    copyLatestHandoff: '复制最新 Handoff',
    debug: 'Debug',
    debugActiveIntrusion: '进行中的接管',
    debugAwarenessEvents: '异常察觉事件',
    debugCompatibility: '兼容性',
    debugInterceptor: 'Interceptor',
    debugLastAiMessage: '最近 AI 消息',
    debugLastConsumed: '最近消费',
    debugLastError: '最近错误',
    debugLastInjected: '最近注入',
    debugPendingHandoff: '待处理 Handoff',
    debugSnapshotCopied: 'Debug 快照已复制',
    debugStorage: '存储',
    debugVersion: '版本',
    director: '导演模式',
    dismissGuide: '关闭引导',
    durationMin: '持续分钟',
    end: '结束',
    exportCharacterPrompt: '导出人设 Prompt',
    exportCreatorPack: '导出创作包',
    exportJson: '导出 JSON',
    exportMarkdown: '导出 Markdown',
    exportOrganizedMaterial: '导出整理素材',
    firstRunFallback: '如果自动注入不明确，查看 Debug 或复制最新 Handoff。',
    firstRunFolder: '确认扩展目录名为',
    firstRunRecord: '记录一条真人异常发言。',
    firstRunRecover: '结束接管，然后生成下一条 AI 回复。',
    firstRunStart: '选择角色并开始接管。',
    firstRunTitle: '首次使用引导',
    handoffConsumed: '已消费',
    handoffInjected: '已注入',
    handoffPending: '待处理',
    humanAnomalyLine: '真人异常发言',
    humanLinePlaceholder: '在这里记录真人接管角色说出的内容。',
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
    noHandoffAvailable: '暂无可复制的 handoff',
    noMaterialAvailable: '暂无可用素材',
    noSavedBranchPoints: '暂无已标记剧情分支',
    none: '无',
    notCalled: '未调用',
    ok: '正常',
    optionA: '路线 A',
    optionB: '路线 B',
    optionC: '路线 C',
    recordHumanLine: '记录真人发言',
    refresh: '刷新',
    saveScene: '保存场景',
    scene: '场景',
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

