import "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      role: "dealer" | "head_office";
      displayName: string;
      email: string | null;
      dealerId?: string | null;
      dealerCode?: string | null;
    };
  }
}

