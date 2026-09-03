# Weflo Native Commerce Builder — Design

Date: 2026-09-03  
Status: approved

## Outcome

Weflo owns a structured Shopify-style builder made from original premium sections. Pages are vertical stacks of sections; sections contain sortable business blocks. The first deep business section is a quantity-offer/bundle editor whose tiers, pricing rules, Shopify bindings, badges and selection state are editable rather than represented as generic cards.

## Canonical editing model

- `EditorPage.sections` remains the source of section order. Moving a section changes this array only.
- `EditorSection.blocks` remains the source of internal block order. Moving an offer tier changes this array only.
- The editor selection contains both `selectedId` (section) and `selectedBlockId` (optional block).
- Canvas clicks report the nearest `data-wf-block-id` as well as the section ID.
- Section and block edits use immutable commands so undo, redo and autosave remain reliable.
- The canvas shows insertion rails above and below sections while dragging. Dropping uses the pointer midpoint to resolve before/after placement.

## Offer domain model

The `quantity-offer` section uses `offer-tier` blocks. Each tier stores:

- `title`, `subtitle`, `badge`;
- `quantity` as an integer from 1 to 99;
- `discount_type`: `none`, `percentage`, or `fixed`;
- `discount_value` as a non-negative number;
- `product_handle` and optional `variant_id` Shopify bindings;
- `preselected`, with exactly one effective selected tier;
- `show_variant_picker`.

Section settings control the heading, call to action, visual composition, savings display, delivery note and capability state. Preview fixtures may supply illustrative prices and products, but fixture values must not enter a customer document unless materialized deliberately.

## Editing experience

Selecting the offer section opens an `Offres et bundles` inspector:

- tier accordion/list with drag handle and selected outline;
- add, duplicate, move and delete actions;
- quantity stepper;
- discount type/value;
- badge and preselection controls;
- Shopify product/variant binding;
- section-level composition selector;
- explicit capability badge: native, app required, or unavailable.

Clicking a tier in the canvas selects the matching editor row. Every destructive action is named and confirmable. Keyboard move controls remain available alongside pointer drag-and-drop.

## Rendering and Shopify behavior

The Web and Liquid renderers share the same semantic structure and CSS class contract. A multipack of one variant submits one Shopify variant with the selected quantity. A fixed bundle binds to a real Shopify bundle product. Mixed-product bundles are never presented as functional unless the Weflo app block and Cart Transform capability are installed.

The first visual family ships with three genuinely different compositions: horizontal cards, stacked premium cards, and compact tier table. The difference must affect hierarchy/layout, not only colors.

## Quality bar

- Responsive at 390, 834 and 1440 px.
- Keyboard-selectable tiers and accessible radio group.
- Web/Liquid parity for labels, quantities, discounts and selected tier.
- No remote script injection or merchant credential in output.
- Existing documents migrate without data loss.
- Undo/redo covers block selection-independent mutations.

