import { registerSection } from "./registry";
import { productMainSection } from "./product-main";
import { productGridSection } from "./product-grid";
import { collectionGridSection } from "./collection-grid";
import { bundleSection } from "./bundle";
import { comparisonSection } from "./comparison";
import { ingredientsSection } from "./ingredients";

export const commerceSections = [productMainSection, productGridSection, collectionGridSection, bundleSection, comparisonSection, ingredientsSection];
for (const definition of commerceSections) registerSection(definition);
