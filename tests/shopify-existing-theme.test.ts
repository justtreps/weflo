import { describe, expect, it } from "vitest";
import { bindingForDocument } from "../src/shopify/page-binding";
import { buildModelDocument } from "../src/models/model-manifest";

describe("existing Shopify theme binding", () => {
  it("creates an isolated page binding for a landing page", () => {
    const document = buildModelDocument("proteo", "Landing"); document.kind = "landing";
    expect(bindingForDocument(document, "weflo-landing")).toEqual({ resource: "page", create: true, templateSuffix: "weflo-landing" });
  });

  it("assigns only the selected product or collection", () => {
    const product = buildModelDocument("proteo", "Product"); product.kind = "product"; product.shopify = { productId: "p1" };
    expect(bindingForDocument(product, "weflo-product")).toMatchObject({ resource: "product", resourceId: "p1", create: false });
    const collection = buildModelDocument("proteo", "Collection"); collection.kind = "collection"; collection.shopify = { collectionId: "c1" };
    expect(bindingForDocument(collection, "weflo-collection")).toMatchObject({ resource: "collection", resourceId: "c1", create: false });
  });
});
