import { MemoryStore } from "../repos/memory";
import type { AppDeps } from "./app";

export function prodDeps(): AppDeps {
  return {
    store: new MemoryStore(),
    session: async () => null,
  };
}
