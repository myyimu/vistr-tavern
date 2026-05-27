import { MODULE_NAME, createEmptyMemory } from './schema.js';

const LOCAL_STORAGE_KEY = `${MODULE_NAME}.memory`;

export class StorageAdapter {
  constructor({ getContext = null } = {}) {
    this.getContext = getContext;
  }

  load() {
    const metadataMemory = this.#readFromChatMetadata();
    if (metadataMemory) {
      return metadataMemory;
    }

    const localMemory = this.#readFromLocalStorage();
    return localMemory || createEmptyMemory();
  }

  async save(memory) {
    const nextMemory = {
      ...memory,
      session: {
        ...memory.session,
        updatedAt: new Date().toISOString(),
      },
    };

    const savedToMetadata = await this.#writeToChatMetadata(nextMemory);
    if (!savedToMetadata) {
      this.#writeToLocalStorage(nextMemory);
    }

    return nextMemory;
  }

  #readFromChatMetadata() {
    const context = this.#safeContext();
    return context?.chatMetadata?.[MODULE_NAME] || null;
  }

  async #writeToChatMetadata(memory) {
    const context = this.#safeContext();
    if (!context?.chatMetadata) {
      return false;
    }

    context.chatMetadata[MODULE_NAME] = memory;

    if (typeof context.saveMetadata === 'function') {
      await context.saveMetadata();
    }

    return true;
  }

  #readFromLocalStorage() {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('[VistrTavern] Failed to parse local memory.', error);
      return null;
    }
  }

  #writeToLocalStorage(memory) {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memory));
  }

  #safeContext() {
    try {
      return this.getContext?.() || null;
    } catch {
      return null;
    }
  }
}

