import { createSectionDefinition } from "./factory";
import { textControl } from "./shared";
export const beforeAfterSection = createSectionDefinition("beforeAfter", "Avant / après", "media", "beforeAfter", { before_image: "", after_image: "", before_alt: "Avant", after_alt: "Après" }, [textControl("before_image", "Image avant", "image"), textControl("after_image", "Image après", "image")]);
