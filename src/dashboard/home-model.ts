import type { Page, PageStatus, PageType, Workspace } from "../types";

export type DashboardProject = {
  id: string;
  name: string;
  slug: string;
  type: PageType;
  typeLabel: string;
  status: PageStatus;
  statusLabel: "Brouillon" | "Prête" | "Publiée sur Shopify";
  statusTone: "neutral" | "ready" | "live";
  previewImage: string | null;
  updatedAt: string;
  updatedLabel: string;
};

export type DashboardHomeModel = {
  greeting: string;
  workspace: Pick<Workspace, "id" | "name" | "slug">;
  totalProjects: number;
  projects: DashboardProject[];
};

const MEDIA_KEY = /(image|media|poster|thumbnail)/i;
const TYPE_LABEL: Record<PageType, string> = {
  sell: "Page produit",
  write: "Page éditoriale",
  blank: "Page sur mesure",
};

const STATUS: Record<PageStatus, Pick<DashboardProject, "statusLabel" | "statusTone">> = {
  draft: { statusLabel: "Brouillon", statusTone: "neutral" },
  published_hosted: { statusLabel: "Prête", statusTone: "ready" },
  published_shopify: { statusLabel: "Publiée sur Shopify", statusTone: "live" },
};

function validMedia(value: unknown): value is string {
  return typeof value === "string" && (value.startsWith("https:") || value.startsWith("data:image/"));
}

function findMedia(value: unknown, parentKey = ""): string | null {
  if (MEDIA_KEY.test(parentKey) && validMedia(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMedia(item, parentKey);
      if (found) return found;
    }
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const found = findMedia(item, key);
      if (found) return found;
    }
  }
  return null;
}

export function projectPreviewImage(page: Page): string | null {
  return findMedia(page.document.sections);
}

function updatedLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Récemment modifiée";
  return `Modifiée le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date)}`;
}

export function dashboardHomeModel(input: {
  pages: Page[];
  workspace: Workspace;
  userName?: string | null;
}): DashboardHomeModel {
  const firstName = input.userName?.trim().split(/\s+/)[0];
  const projects = [...input.pages]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 6)
    .map((page) => ({
      id: page.id,
      name: page.name,
      slug: page.slug,
      type: page.type,
      typeLabel: TYPE_LABEL[page.type],
      status: page.status,
      ...STATUS[page.status],
      previewImage: projectPreviewImage(page),
      updatedAt: page.updatedAt,
      updatedLabel: updatedLabel(page.updatedAt),
    }));

  return {
    greeting: firstName ? `Bonjour ${firstName}` : "Bonjour",
    workspace: { id: input.workspace.id, name: input.workspace.name, slug: input.workspace.slug },
    totalProjects: input.pages.length,
    projects,
  };
}
