import type { Store } from "./types";

function notImplemented(): never {
  throw new Error("not implemented");
}

export class MemoryStore implements Store {
  createWorkspace = notImplemented;
  listWorkspaces = notImplemented;
  getWorkspace = notImplemented;
  assertMember = notImplemented;
  listPages = notImplemented;
  getPage = notImplemented;
  createPage = notImplemented;
  updatePage = notImplemented;
  deletePage = notImplemented;
  getCredits = notImplemented;
  saveCredits = notImplemented;
  getShopify = notImplemented;
  saveShopify = notImplemented;
  clearShopify = notImplemented;
  getWhop = notImplemented;
  saveWhop = notImplemented;
  getAttribution = notImplemented;
  saveAttribution = notImplemented;
  getUserProfile = notImplemented;
}
