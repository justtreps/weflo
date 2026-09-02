import type { PublicationStrategy } from "./publication-plan";

export type PublicationRecord = {
  id: string;
  strategy: PublicationStrategy;
  themeId: string;
  sourceThemeId?: string;
  status: "running" | "completed" | "failed" | "rolled_back";
  backups: Array<{ key: string; value: string | null }>;
  results: Array<{ key: string; status: "written" | "unchanged" | "restored" }>;
  previewUrl?: string;
  createdAt: string;
  expiresAt: string;
};
