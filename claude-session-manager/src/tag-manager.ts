import * as fs from 'fs';
import * as path from 'path';
import { TagStore } from './types';

const CLAUDE_DIR = path.join(process.env.HOME || '', '.claude');
const TAGS_FILE = path.join(CLAUDE_DIR, 'sessions', 'tags.json');

const defaultStore: TagStore = {
  sessionTags: {},
  groups: {}
};

export class TagManager {
  private store: TagStore | null = null;

  loadTags(): TagStore {
    if (this.store) {
      return this.store;
    }

    if (fs.existsSync(TAGS_FILE)) {
      try {
        this.store = JSON.parse(fs.readFileSync(TAGS_FILE, 'utf-8'));
        return this.store!;
      } catch (e) {
        // Fall through to default
      }
    }

    this.store = { ...defaultStore };
    return this.store;
  }

  saveTags(): void {
    if (!this.store) {
      return;
    }

    const dir = path.dirname(TAGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(TAGS_FILE, JSON.stringify(this.store, null, 2));
  }

  addTag(sessionId: string, tag: string): void {
    const store = this.loadTags();

    if (!store.sessionTags[sessionId]) {
      store.sessionTags[sessionId] = [];
    }

    if (!store.sessionTags[sessionId].includes(tag)) {
      store.sessionTags[sessionId].push(tag);
      this.saveTags();
    }
  }

  removeTag(sessionId: string, tag: string): void {
    const store = this.loadTags();

    if (store.sessionTags[sessionId]) {
      store.sessionTags[sessionId] = store.sessionTags[sessionId].filter(t => t !== tag);
      if (store.sessionTags[sessionId].length === 0) {
        delete store.sessionTags[sessionId];
      }
      this.saveTags();
    }
  }

  getTags(sessionId: string): string[] {
    const store = this.loadTags();
    return store.sessionTags[sessionId] || [];
  }

  getSessionsByTag(tag: string): string[] {
    const store = this.loadTags();
    const sessions: string[] = [];

    for (const [sessionId, tags] of Object.entries(store.sessionTags)) {
      if (tags.includes(tag)) {
        sessions.push(sessionId);
      }
    }

    return sessions;
  }

  listGroups(): Record<string, string[]> {
    const store = this.loadTags();
    return store.groups;
  }

  createGroup(name: string, sessionIds: string[]): void {
    const store = this.loadTags();
    store.groups[name] = sessionIds;
    this.saveTags();
  }

  deleteGroup(name: string): void {
    const store = this.loadTags();
    delete store.groups[name];
    this.saveTags();
  }
}

export const tagManager = new TagManager();
