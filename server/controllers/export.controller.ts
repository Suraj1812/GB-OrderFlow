import type { Request, Response } from "express";

import { verifyDownloadToken } from "../core/tokens.js";
import { AppError } from "../core/errors.js";
import { HeadOfficeService } from "../services/head-office.service.js";

export class ExportController {
  constructor(private readonly service: HeadOfficeService) {}

  public async download(request: Request, response: Response) {
    const token = request.query.token;

    if (typeof token !== "string") {
      throw new AppError(400, "INVALID_DOWNLOAD", "A valid export token is required.");
    }

    const payload = verifyDownloadToken(token);
    const result = await this.service.getDownloadableExport(payload.exportId);

    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(result.fileName)}"`,
    );
    response.status(200).send(result.content);
  }
}
