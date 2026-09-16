import { Request, Response, NextFunction } from "express";
import { legalService } from "./legal.service.js";
import { PolicyType } from "./legal.types.js";

export class LegalController {
  async getAllPolicies(_req: Request, res: Response, next: NextFunction) {
    try {
      const policies = await legalService.getAllPolicies();
      res.json(policies);
    } catch (err) {
      next(err);
    }
  }

  async getPolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const rawType = String(req.params.type || "")
        .toUpperCase()
        .replace(/-/g, "_");
      if (rawType !== "TERMS_OF_SERVICE" && rawType !== "PRIVACY_POLICY") {
        return res.status(400).json({
          error:
            "Invalid policy type. Must be 'TERMS_OF_SERVICE' or 'PRIVACY_POLICY'.",
        });
      }

      const policy = await legalService.getPolicyByType(rawType as PolicyType);
      res.json(policy);
    } catch (err) {
      next(err);
    }
  }

  async updatePolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const rawType = String(req.params.type || "")
        .toUpperCase()
        .replace(/-/g, "_");
      if (rawType !== "TERMS_OF_SERVICE" && rawType !== "PRIVACY_POLICY") {
        return res.status(400).json({
          error:
            "Invalid policy type. Must be 'TERMS_OF_SERVICE' or 'PRIVACY_POLICY'.",
        });
      }

      const { title, content, version } = req.body;
      const adminUserId = (req as any).user?.id;

      const updated = await legalService.updatePolicy(
        rawType as PolicyType,
        { title, content, version },
        adminUserId,
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
}

export const legalController = new LegalController();
