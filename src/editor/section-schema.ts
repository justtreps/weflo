export type InspectorControlType = "text" | "textarea" | "number" | "select" | "toggle" | "color" | "image" | "link" | "product" | "collection" | "code";
export type InspectorScope = "settings" | "style" | "responsive";

export type InspectorControl = {
  key: string;
  label: string;
  type: InspectorControlType;
  scope: InspectorScope;
  options?: string[];
};

export type InspectorGroup = {
  id: "content" | "style" | "layout" | "responsive" | "animation";
  label: string;
  controls: InspectorControl[];
};

const CONTENT: InspectorControl[] = [
  { key: "title", label: "Titre", type: "text", scope: "settings" },
  { key: "subtitle", label: "Sous-titre", type: "text", scope: "settings" },
  { key: "text", label: "Texte", type: "textarea", scope: "settings" },
  { key: "image", label: "Image", type: "image", scope: "settings" },
  { key: "cta_label", label: "Bouton", type: "text", scope: "settings" },
];

export function inspectorGroupsForSection(type: string): InspectorGroup[] {
  const content = type === "customCode"
    ? [{ key: "html", label: "HTML", type: "code", scope: "settings" }, { key: "css", label: "CSS", type: "code", scope: "settings" }, { key: "js", label: "JavaScript", type: "code", scope: "settings" }] as InspectorControl[]
    : CONTENT;
  return [
    { id: "content", label: "Contenu", controls: content },
    { id: "style", label: "Style", controls: [{ key: "backgroundColor", label: "Arrière-plan", type: "color", scope: "style" }, { key: "color", label: "Texte", type: "color", scope: "style" }] },
    { id: "layout", label: "Disposition", controls: [{ key: "paddingTop", label: "Espace supérieur", type: "number", scope: "style" }, { key: "paddingBottom", label: "Espace inférieur", type: "number", scope: "style" }, { key: "textAlign", label: "Alignement", type: "select", scope: "style", options: ["left", "center", "right"] }] },
    { id: "responsive", label: "Responsive", controls: [{ key: "paddingTop", label: "Espace sur cet écran", type: "number", scope: "responsive" }] },
    { id: "animation", label: "Animation", controls: [{ key: "animation", label: "Entrée", type: "select", scope: "style", options: ["none", "fade", "reveal"] }] },
  ];
}

