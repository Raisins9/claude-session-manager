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
exports.sessionManager = exports.SessionManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CLAUDE_DIR = path.join(process.env.HOME || '', '.claude');
const HISTORY_FILE = path.join(CLAUDE_DIR, 'history.jsonl');
const SESSIONS_DIR = path.join(CLAUDE_DIR, 'sessions');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
// Simple stopwords for keyword extraction
const STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what',
    'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all',
    'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'just', 'also', 'now', '的', '是', '了', '在', '和', '与', '或', '我', '你',
    '他', '她', '它', '我们', '你们', '他们', '这', '那', '这个', '那个', '什么',
    '怎么', '如何', '为什么', '有', '没有', '不是', '的', '了', '吗', '呢', '吧', '啊'
]);
class SessionManager {
    async getRunningSessions() {
        const running = [];
        if (!fs.existsSync(SESSIONS_DIR)) {
            return running;
        }
        const files = fs.readdirSync(SESSIONS_DIR);
        for (const file of files) {
            if (!file.endsWith('.json'))
                continue;
            const filePath = path.join(SESSIONS_DIR, file);
            try {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                if (!content.sessionId)
                    continue; // Skip invalid entries
                running.push({
                    sessionId: content.sessionId,
                    pid: content.pid,
                    cwd: content.cwd,
                    startedAt: content.startedAt,
                    slug: content.slug
                });
            }
            catch (e) {
                // Skip malformed files
            }
        }
        return running;
    }
    async getAllSessions() {
        const sessions = [];
        // Read history.jsonl
        if (fs.existsSync(HISTORY_FILE)) {
            const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    sessions.push({
                        sessionId: entry.sessionId,
                        display: entry.display || 'Untitled',
                        project: entry.project || '',
                        timestamp: entry.timestamp,
                        cwd: entry.cwd || '',
                        slug: entry.slug
                    });
                }
                catch (e) {
                    // Skip malformed lines
                }
            }
        }
        return sessions;
    }
    async getSessionDetails(sessionId) {
        // Read from sessions/{pid}.json to get cwd and startedAt
        if (!fs.existsSync(SESSIONS_DIR)) {
            return null;
        }
        const files = fs.readdirSync(SESSIONS_DIR);
        for (const file of files) {
            if (!file.endsWith('.json'))
                continue;
            const filePath = path.join(SESSIONS_DIR, file);
            try {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                if (content.sessionId === sessionId) {
                    return {
                        sessionId: content.sessionId,
                        display: '',
                        project: '',
                        timestamp: content.startedAt,
                        cwd: content.cwd,
                        pid: content.pid,
                        startedAt: content.startedAt
                    };
                }
            }
            catch (e) {
                // Skip malformed files
            }
        }
        return null;
    }
    async deleteSession(sessionId) {
        // Delete from history.jsonl
        if (fs.existsSync(HISTORY_FILE)) {
            const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
            const lines = content.split('\n').filter(line => {
                if (!line.trim())
                    return false;
                try {
                    const entry = JSON.parse(line);
                    return entry.sessionId !== sessionId;
                }
                catch (e) {
                    return true;
                }
            });
            fs.writeFileSync(HISTORY_FILE, lines.join('\n') + '\n');
        }
        // Note: The actual session message files in projects/ are not deleted
        // as they might be referenced elsewhere. They will be orphaned but that's
        // generally safe since Claude Code doesn't use them for new sessions.
        return true;
    }
    async getSessionSummary(sessionId, cwd) {
        // Try to find the session message file
        // Path: ~/.claude/projects/{projectPathEncoded}/{sessionId}.jsonl
        if (!cwd) {
            // Try to find cwd from running sessions
            const running = await this.getRunningSessions();
            const match = running.find(s => s.sessionId === sessionId);
            if (match) {
                cwd = match.cwd;
            }
        }
        if (!cwd) {
            return '';
        }
        // Encode project path (same logic as Claude Code)
        // e.g., /Users/xuanye/dev -> -Users-xuanye-dev
        const encodedPath = '-' + cwd.substring(1).replace(/\//g, '-');
        const sessionFile = path.join(PROJECTS_DIR, encodedPath, `${sessionId}.jsonl`);
        if (!fs.existsSync(sessionFile)) {
            return '';
        }
        try {
            const content = fs.readFileSync(sessionFile, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            // Extract user messages (filter out empty ones)
            const userMessages = [];
            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    if (entry.type === 'user' && entry.message?.content) {
                        const text = typeof entry.message.content === 'string'
                            ? entry.message.content
                            : entry.message.content[0]?.text || '';
                        if (text.trim()) {
                            userMessages.push(text);
                        }
                    }
                }
                catch (e) {
                    // Skip malformed lines
                }
            }
            if (userMessages.length === 0) {
                return '';
            }
            // Get last few messages
            const recent = userMessages.slice(-5).join(' ');
            // Extract keywords (simple approach: words 2+ chars, not stopwords)
            const words = recent.match(/[\w\u4e00-\u9fa5]{2,}/g) || [];
            const wordCounts = new Map();
            for (const word of words) {
                const lower = word.toLowerCase();
                if (!STOPWORDS.has(lower) && lower.length > 1) {
                    wordCounts.set(lower, (wordCounts.get(lower) || 0) + 1);
                }
            }
            // Sort by frequency and take top 5
            const keywords = Array.from(wordCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([word]) => word);
            if (keywords.length > 0) {
                return keywords.join(', ');
            }
            // Fallback: return last message truncated
            const lastMsg = userMessages[userMessages.length - 1];
            return lastMsg.substring(0, 50) + (lastMsg.length > 50 ? '...' : '');
        }
        catch (e) {
            return '';
        }
    }
    formatRunningSession(session, tags, summary) {
        const shortId = (session.sessionId || '').substring(0, 8);
        const cwd = (session.cwd || '').replace(process.env.HOME || '', '~');
        const name = session.slug || cwd.split('/').pop() || 'Untitled';
        let output = `  ${shortId}  ${name}`;
        output += `\n  cwd: ${cwd}`;
        if (tags && tags.length > 0) {
            output += `\n  tags: ${tags.join(', ')}`;
        }
        if (summary) {
            output += `\n  summary: ${summary}`;
        }
        return output;
    }
    formatSession(session, tags) {
        const date = new Date(session.timestamp);
        const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        let output = `[${session.sessionId.substring(0, 8)}] ${dateStr} | ${session.display || 'Untitled'}`;
        if (session.project) {
            const projectName = session.project.replace(process.env.HOME || '', '~');
            output += ` | ${projectName}`;
        }
        if (tags && tags.length > 0) {
            output += ` | tags: ${tags.join(', ')}`;
        }
        return output;
    }
}
exports.SessionManager = SessionManager;
exports.sessionManager = new SessionManager();
