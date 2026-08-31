export type User = { id: string; email: string; name?: string | null };

export type PageType = "sell" | "write" | "blank";
export type PageStatus = "draft" | "published_hosted" | "published_shopify";
export type SectionType =
  | "navigation" | "productHero" | "benefits" | "bundle" | "guarantees"
  | "reviews" | "faq" | "cta" | "footer" | "hero" | "collectionGrid"
  | "atelier" | "article";

export type Section = { id: string; type: SectionType; settings: Record<string, unknown> };
export type PageDocument = { name: string; path: string; sections: Section[] };

export type Workspace = { id: string; name: string; slug: string; ownerUserId: string; createdAt: string };
export type WorkspaceRole = "owner" | "member" | "viewer";
export type Membership = { userId: string; workspaceId: string; role: WorkspaceRole };

export type Page = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  type: PageType;
  status: PageStatus;
  document: PageDocument;
  updatedAt: string;
};

export type ShopifyStatus = "connected" | "invalid" | "none";
export type ShopifyConnection = {
  workspaceId: string;
  shopDomain: string;
  tokenEncrypted: string;
  status: ShopifyStatus;
};

export type CreditLedger = {
  workspaceId: string;
  monthlyRemaining: number;
  monthlyResetAt: string;
  purchasedRemaining: number;
};

export type WhopLink = {
  workspaceId: string;
  membershipId: string | null;
  planId: string | null;
  status: "none" | "active" | "inactive";
  manageUrl: string | null;
  affiliateId: string | null;
};

export type ReferralAttribution = {
  refereeWorkspaceId: string;
  referrerWorkspaceId: string;
  promoApplied: boolean;
  createdAt: string;
};

export type AppSession = User | null;

export type AuthPort = {
  signInEmail(email: string, password: string): Promise<{ accessToken: string; user: User }>;
  signUpEmail(email: string, password: string, name: string): Promise<{ accessToken: string; user: User }>;
  signInGoogle(): Promise<{ url: string }>;
  signOut(): Promise<void>;
};

export type LlmPort = {
  complete(input: { prompt: string; document: PageDocument }): Promise<{ message: string; document: PageDocument }>;
};

export type ShopifyPort = {
  ping(shop: string, token: string): Promise<void>;
  publish(input: {
    shop: string;
    token: string;
    document: PageDocument;
    pageName: string;
  }): Promise<{ themeId: string; productId: string }>;
  rollback(input: { shop: string; token: string; themeId?: string; productId?: string }): Promise<void>;
};
