# Hybrid Shopify Engine Rollout

This specification is implemented as five independently reviewable plans. Run
them in order because each plan consumes typed interfaces from the preceding
one.

1. [Section packs and editor catalog](./2026-09-03-section-pack-foundation.md)
2. [AI onboarding and Store Blueprint](./2026-09-03-ai-store-blueprint.md)
3. [Shopify commerce runtime](./2026-09-03-shopify-commerce-runtime.md)
4. [Theme adapters and publication](./2026-09-03-shopify-theme-adapters.md)
5. [Canardo 2.0 custom sections](./2026-09-03-canardo-custom-sections.md)

The release gate after every plan is `npm test && npm run build`. Shopify plans
also require their targeted theme-output and publication smoke tests. Features
whose external Shopify capability is not installed remain visible as previews
with a French setup badge and cannot be published as functional.
