import { bindAppChrome } from "./app-chrome";
import { hydrateVisualEditor } from "./editor-v2";
import { guardSession } from "./session-guard";

export async function hydrateEditeur(): Promise<void> {
  const me = await guardSession();
  if (!me) return;

  bindAppChrome();
  const pageId = new URLSearchParams(location.search).get("page");
  if (!pageId) {
    location.assign("/dashboard");
    return;
  }

  await hydrateVisualEditor(pageId);
}

void hydrateEditeur();
