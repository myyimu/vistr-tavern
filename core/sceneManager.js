import { createId } from '../data/schema.js';

export class SceneManager {
  constructor(memory) {
    this.memory = memory;
  }

  getActiveScene() {
    const activeSceneId = this.memory.session.activeSceneId;
    return this.memory.scenes.find((scene) => scene.id === activeSceneId) || null;
  }

  setScene({ name, mood = '', tension = 50, participants = [] }) {
    const trimmedName = name?.trim() || 'Untitled Scene';
    const scene = {
      id: createId('scene'),
      name: trimmedName,
      mood: mood?.trim() || '',
      tension: this.#normalizeTension(tension),
      participants,
      createdAt: new Date().toISOString(),
    };

    this.memory.scenes.push(scene);
    this.memory.session.activeSceneId = scene.id;
    return scene;
  }

  updateActiveScene({ name, mood, tension, participants } = {}) {
    const scene = this.getActiveScene();
    if (!scene) {
      return this.setScene({ name, mood, tension, participants });
    }

    if (name !== undefined) {
      scene.name = name.trim() || scene.name;
    }
    if (mood !== undefined) {
      scene.mood = mood.trim();
    }
    if (tension !== undefined) {
      scene.tension = this.#normalizeTension(tension);
    }
    if (participants !== undefined) {
      scene.participants = participants;
    }

    return scene;
  }

  #normalizeTension(value) {
    const number = Number(value);
    if (Number.isNaN(number)) {
      return 50;
    }

    return Math.min(100, Math.max(0, Math.round(number)));
  }
}

