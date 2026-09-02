import type { EditorBlock, EditorSection, SettingValue } from "../editor/document";
import type { InspectorControl } from "../editor/section-schema";

export type SectionCategory = "brand" | "media" | "commerce" | "conversion" | "content" | "layout";

export type SectionRenderContext = {
  section: EditorSection;
  pageName: string;
  editor?: boolean;
};

export type BlockDefinition = {
  type: string;
  name: string;
  defaults: Record<string, SettingValue>;
  settings: InspectorControl[];
};

export type SectionDefinition = {
  type: string;
  name: string;
  category: SectionCategory;
  defaults: Record<string, SettingValue>;
  settings: InspectorControl[];
  blocks: BlockDefinition[];
  renderWeb(context: SectionRenderContext): string;
  renderLiquid(section?: EditorSection): string;
};

export type SectionFactoryOptions = Omit<SectionDefinition, "renderWeb" | "renderLiquid"> & {
  renderWeb: SectionDefinition["renderWeb"];
  renderLiquid: SectionDefinition["renderLiquid"];
};

export type NormalizedBlock = EditorBlock & { settings: Record<string, SettingValue> };
