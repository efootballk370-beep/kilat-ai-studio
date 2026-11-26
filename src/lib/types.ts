export type VisualKind = "burst" | "orbit" | "steps" | "compare" | "stat" | "waves";
export type ProjectStatus = "draft" | "ready" | "scheduled" | "publishing" | "published" | "failed";
export type IdeaStatus = "fresh" | "used" | "archived";

export interface Scene {
  id: string;
  heading: string;
  narration: string;
  caption: string;
  duration: number;
  visual: VisualKind;
  accent: string;
  items: string[];
}

export interface Idea {
  id: string;
  title: string;
  hook: string;
  angle: string;
  rationale: string;
  keywords: string[];
  points: string[];
  cta: string;
  score: number;
  niche: string;
  source: string;
  status: IdeaStatus;
  createdAt: string;
}

export interface Project {
  id: string;
  ideaId: string | null;
  title: string;
  description: string;
  niche: string;
  script: string;
  scenes: Scene[];
  tags: string[];
  status: ProjectStatus;
  theme: "lime" | "coral" | "violet" | "blue";
  music: boolean;
  captions: boolean;
  privacy: "public" | "unlisted" | "private";
  scheduledAt: string | null;
  publishedAt: string | null;
  youtubeVideoId: string | null;
  youtubeUrl: string | null;
  renderMime: string | null;
  renderSize: number;
  hasVideo: boolean;
  error: string | null;
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
  updatedAt: string;
}

export interface MonetizationSettings {
  subscribers: number;
  shortsViews90d: number;
  watchHours365d: number;
  publicUploads90d: number;
  twoStepVerification: boolean;
  advancedFeatures: boolean;
  adsenseReady: boolean;
  originalContent: boolean;
}

export interface StudioSettings {
  id: string;
  channelName: string;
  niche: string;
  audience: string;
  tone: string;
  postingTime: string;
  timezone: string;
  autoPublish: boolean;
  monetization: MonetizationSettings;
  updatedAt: string;
}

export interface Activity {
  id: string;
  projectId: string | null;
  kind: "idea" | "script" | "render" | "schedule" | "publish" | "system" | "error";
  message: string;
  createdAt: string;
}

export interface ChannelState {
  configured: boolean;
  connected: boolean;
  channelTitle: string | null;
  channelId: string | null;
  expiresAt: string | null;
}

export interface StudioState {
  settings: StudioSettings;
  ideas: Idea[];
  projects: Project[];
  activities: Activity[];
  channel: ChannelState;
  aiMode: "openai" | "local";
}

export const THEMES = {
  lime: { background: "#11130f", foreground: "#f5f5ed", accent: "#d9ff63", secondary: "#87927a" },
  coral: { background: "#211310", foreground: "#fff4ec", accent: "#ff7657", secondary: "#d3a395" },
  violet: { background: "#171322", foreground: "#f6f1ff", accent: "#b99aff", secondary: "#a99cbb" },
  blue: { background: "#0d1822", foreground: "#eef8ff", accent: "#68d8ff", secondary: "#8fa9b8" },
} as const;
