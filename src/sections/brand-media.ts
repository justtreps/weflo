import { registerSection } from "./registry";
import { navigationSection } from "./navigation";
import { announcementSection } from "./announcement";
import { heroSection } from "./hero";
import { productHeroSection } from "./product-hero";
import { videoHeroSection } from "./video-hero";
import { gallerySection } from "./gallery";
import { imageTextSection } from "./image-text";
import { beforeAfterSection } from "./before-after";

export const brandMediaSections = [navigationSection, announcementSection, heroSection, productHeroSection, videoHeroSection, gallerySection, imageTextSection, beforeAfterSection];
for (const definition of brandMediaSections) registerSection(definition);
