import type { Request } from "express";

import type { Dealer, Order, Sku, UserRole } from "../shared/contracts.js";

export interface DealerRecord extends Dealer {
  passwordHash: string;
}

export interface HeadOfficeUser {
  id: string;
  username: string;
  name: string;
  passwordHash: string;
}

export interface Database {
  headOfficeUsers: HeadOfficeUser[];
  dealers: DealerRecord[];
  skus: Sku[];
  orders: Order[];
}

export interface SessionUser {
  id: string;
  role: UserRole;
  displayName: string;
  dealerCode?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
}

