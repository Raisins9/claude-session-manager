"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagManager = exports.TagManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CLAUDE_DIR = path.join(process.env.HOME || '', '.claude');
const TAGS_FILE = path.join(CLAUDE_DIR, 'sessions', 'tags.json');
const defaultStore = {
    sessionTags: {},
    groups: {}
};
class TagManager {
    constructor() {
        this.store = null;
    }
    loadTags() {
        if (this.store) {
            return this.store;
        }
        if (fs.existsSync(TAGS_FILE)) {
            try {
                this.store = JSON.parse(fs.readFileSync(TAGS_FILE, 'utf-8'));
                return this.store;
            }
            catch (e) {
                // Fall through to default
            }
        }
        this.store = { ...defaultStore };
        return this.store;
    }
    saveTags() {
        if (!this.store) {
            return;
        }
        const dir = path.dirname(TAGS_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(TAGS_FILE, JSON.stringify(this.store, null, 2));
    }
    addTag(sessionId, tag) {
        const store = this.loadTags();
        if (!store.sessionTags[sessionId]) {
            store.sessionTags[sessionId] = [];
        }
        if (!store.sessionTags[sessionId].includes(tag)) {
            store.sessionTags[sessionId].push(tag);
            this.saveTags();
        }
    }
    removeTag(sessionId, tag) {
        const store = this.loadTags();
        if (store.sessionTags[sessionId]) {
            store.sessionTags[sessionId] = store.sessionTags[sessionId].filter(t => t !== tag);
            if (store.sessionTags[sessionId].length === 0) {
                delete store.sessionTags[sessionId];
            }
            this.saveTags();
        }
    }
    getTags(sessionId) {
        const store = this.loadTags();
        return store.sessionTags[sessionId] || [];
    }
    getSessionsByTag(tag) {
        const store = this.loadTags();
        const sessions = [];
        for (const [sessionId, tags] of Object.entries(store.sessionTags)) {
            if (tags.includes(tag)) {
                sessions.push(sessionId);
            }
        }
        return sessions;
    }
    listGroups() {
        const store = this.loadTags();
        return store.groups;
    }
    createGroup(name, sessionIds) {
        const store = this.loadTags();
        store.groups[name] = sessionIds;
        this.saveTags();
    }
    deleteGroup(name) {
        const store = this.loadTags();
        delete store.groups[name];
        this.saveTags();
    }
}
exports.TagManager = TagManager;
exports.tagManager = new TagManager();
