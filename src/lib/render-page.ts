import type { PageDocument, Section } from "../types";

const INK = "#141310";
const PAPER = "#faf9f5";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function settingText(settings: Record<string, unknown>, key: string): string | undefined {
  const value = settings[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function sectionInner(section: Section): string {
  const title = settingText(section.settings, "title") ?? section.type;
  const heading = escapeHtml(title);
  switch (section.type) {
    case "navigation":
      return `<nav><strong>${heading}</strong></nav>`;
    case "productHero":
    case "hero":
      return `<h1>${heading}</h1>`;
    case "cta":
      return `<p>${heading}</p><p><a href="#acheter">Acheter</a></p>`;
    case "footer":
      return `<p>${heading}</p>`;
    case "article":
      return `<article><h2>${heading}</h2></article>`;
    default:
      return `<h2>${heading}</h2>`;
  }
}

function wrapDocument(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      font-family: Syne, system-ui, sans-serif;
      color: ${INK};
      background: ${PAPER};
    }
    main { max-width: 44rem; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
    section { padding: 1.75rem 0; }
    h1, h2 { font-weight: 700; letter-spacing: -0.03em; }
    a { color: ${INK}; }
    .not-found { min-height: 100vh; display: grid; place-items: center; text-align: center; padding: 2rem; }
    .not-found svg { display: block; margin: 0 auto 1.25rem; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export function renderPage(doc: PageDocument): string {
  const sections = doc.sections
    .map(
      (section) =>
        `<section data-type="${escapeHtml(section.type)}">${sectionInner(section)}</section>`,
    )
    .join("\n    ");
  return wrapDocument(doc.name, `  <main>\n    ${sections}\n  </main>`);
}

const CRYING_DUCK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="96" height="96" role="img" aria-label="Canard qui pleure">
  <ellipse cx="62" cy="78" rx="28" ry="22" fill="#e8c15a"/>
  <circle cx="58" cy="52" r="22" fill="#f2d36b"/>
  <ellipse cx="86" cy="54" rx="14" ry="8" fill="#e07a2f"/>
  <circle cx="52" cy="48" r="3.2" fill="#141310"/>
  <path d="M50 62c4 6 14 6 18 0" fill="none" stroke="#141310" stroke-width="2" stroke-linecap="round"/>
  <path d="M48 58c-1 8-3 14-2 20" fill="none" stroke="#6ec8e8" stroke-width="2" stroke-linecap="round"/>
  <circle cx="46" cy="80" r="2.2" fill="#6ec8e8"/>
</svg>`;

export function renderNotFound(): string {
  return wrapDocument(
    "404 — Page introuvable",
    `  <div class="not-found">
    ${CRYING_DUCK}
    <h1>404</h1>
    <p>Page introuvable. Le canard pleure.</p>
  </div>`,
  );
}
