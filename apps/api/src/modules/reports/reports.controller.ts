import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { reportsService } from "./reports.service.js";

export class ReportsController {
  exportReport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const type = (req.query.type as any) || "revenue";
      const format = (req.query.format as any) || "csv";
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const preset = req.query.preset as string | undefined;

      const { buffer, contentType, filename } =
        await reportsService.generateExport({
          type,
          format,
          startDate,
          endDate,
          preset,
        });

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };
}

export const reportsController = new ReportsController();
