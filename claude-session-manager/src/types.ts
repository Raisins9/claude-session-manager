export interface Session {
  sessionId: string;
  display: string;
  project: string;
  timestamp: number;
  cwd: string;
  slug?: string;
}

export interface SessionDetail extends Session {
  pid?: number;
  startedAt?: number;
}

export interface TagStore {
  sessionTags: Record<string, string[]>;
  groups: Record<string, string[]>;
}

export interface TagOptions {
  tag?: string;
  project?: string;
}
