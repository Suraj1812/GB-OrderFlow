import type { Request, Response } from "express";

import { clearAuthCookies, cookieNames, setAuthCookies, setCsrfCookie } from "../core/cookies.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { AuthService } from "../services/auth.service.js";
import { getRequestMeta, getSessionUser } from "./controller.utils.js";

export class AuthController {
  constructor(private readonly service: AuthService) {}

  public async loginDealer(request: Request, response: Response) {
    const result = await this.service.loginDealer(request.body, getRequestMeta(request));
    setAuthCookies(response, result.accessToken, result.refreshToken);
    setCsrfCookie(response, result.response.csrfToken);
    response.status(200).json(result.response);
  }

  public async loginHeadOffice(request: Request, response: Response) {
    const result = await this.service.loginHeadOffice(request.body, getRequestMeta(request));
    setAuthCookies(response, result.accessToken, result.refreshToken);
    setCsrfCookie(response, result.response.csrfToken);
    response.status(200).json(result.response);
  }

  public async refreshSession(request: Request, response: Response) {
    const result = await this.service.refreshSession(
      request.cookies?.[cookieNames.refreshToken],
      getRequestMeta(request),
    );
    setAuthCookies(response, result.accessToken, result.refreshToken);
    setCsrfCookie(response, result.response.csrfToken);
    response.status(200).json(result.response);
  }

  public async getCurrentSession(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.getSessionUser(getSessionUser(request).id);
    setCsrfCookie(response, result.csrfToken);
    response.status(200).json(result);
  }

  public async logout(request: Request, response: Response) {
    await this.service.logout(
      request.cookies?.[cookieNames.refreshToken],
      getRequestMeta(request),
    );
    clearAuthCookies(response);
    response.status(200).json({ message: "Logged out successfully." });
  }

  public async requestPasswordReset(request: Request, response: Response) {
    const result = await this.service.requestPasswordReset(
      request.body,
      getRequestMeta(request),
    );
    response.status(200).json(result);
  }

  public async resetPassword(request: Request, response: Response) {
    const result = await this.service.resetPassword(request.body, getRequestMeta(request));
    clearAuthCookies(response);
    response.status(200).json(result);
  }
}
