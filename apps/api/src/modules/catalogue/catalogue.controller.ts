import { Request, Response, NextFunction } from "express";
import { catalogueService, CatalogueService } from "./catalogue.service.js";
import {
  CreateResourceSchema,
  UpdateResourceSchema,
  CreatePricingPlanSchema,
  UpdatePricingPlanSchema,
  CreateBlackoutSchema,
  UpsertSchedulesSchema,
  UploadResourceImageSchema,
} from "./catalogue.schema.js";
import { AuthRequest } from "../../middleware/auth.middleware.js";

function getIpAddress(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0];
  return req.ip || undefined;
}

export class CatalogueController {
  constructor(private service: CatalogueService = catalogueService) {}

  getActiveResources = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const data = await this.service.getActiveResources();
      // Catalogue data changes rarely — allow browsers and CDN to cache for 60s,
      // serve stale for up to 5 minutes while revalidating in background
      res.set(
        "Cache-Control",
        "public, max-age=60, stale-while-revalidate=300",
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  getResourceBySlug = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const slug = String(req.params.slug);
      const data = await this.service.getResourceBySlug(slug);

      if (!data) {
        res.status(404).json({
          code: "RESOURCE_NOT_FOUND",
          message: `Workspace resource '${slug}' was not found in catalogue`,
        });
        return;
      }

      res.set(
        "Cache-Control",
        "public, max-age=60, stale-while-revalidate=300",
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  getAdminResources = async (
    _req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const data = await this.service.getAdminResources();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  getResourceById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const id = String(req.params.id);
      const data = await this.service.getResourceById(id);

      if (!data) {
        res.status(404).json({
          code: "RESOURCE_NOT_FOUND",
          message: `Resource '${id}' not found`,
        });
        return;
      }

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  createResource = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validated = CreateResourceSchema.parse(req.body);
      const actorUserId = req.user?.id;
      const ipAddress = getIpAddress(req);

      const data = await this.service.createResource(
        validated,
        actorUserId,
        ipAddress,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  updateResource = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const id = String(req.params.id);
      const validated = UpdateResourceSchema.parse(req.body);
      const actorUserId = req.user?.id;
      const ipAddress = getIpAddress(req);

      const data = await this.service.updateResource(
        id,
        validated,
        actorUserId,
        ipAddress,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  uploadImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validated = UploadResourceImageSchema.parse(req.body);
      const actorUserId = req.user?.id;
      const ipAddress = getIpAddress(req);
      const reqProtocol = req.protocol;
      const reqHost = req.get("host");

      const data = await this.service.uploadResourceImage(
        validated,
        actorUserId,
        ipAddress,
        reqProtocol,
        reqHost,
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  deleteResource = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const id = String(req.params.id);
      const actorUserId = req.user?.id;
      const ipAddress = getIpAddress(req);

      const data = await this.service.deleteResource(
        id,
        actorUserId,
        ipAddress,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  createPricingPlan = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const resourceId = String(req.params.id);
      const validated = CreatePricingPlanSchema.parse(req.body);
      const actorUserId = req.user?.id;
      const ipAddress = getIpAddress(req);

      const data = await this.service.createPricingPlan(
        resourceId,
        validated,
        actorUserId,
        ipAddress,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  updatePricingPlan = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const planId = String(req.params.planId);
      const validated = UpdatePricingPlanSchema.parse(req.body);
      const actorUserId = req.user?.id;
      const ipAddress = getIpAddress(req);

      const data = await this.service.updatePricingPlan(
        planId,
        validated,
        actorUserId,
        ipAddress,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  deletePricingPlan = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const planId = String(req.params.planId);
      const actorUserId = req.user?.id;
      const ipAddress = getIpAddress(req);

      const data = await this.service.deletePricingPlan(
        planId,
        actorUserId,
        ipAddress,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  createBlackout = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const resourceId = String(req.params.id);
      const validated = CreateBlackoutSchema.parse(req.body);
      const actorUserId = req.user?.id;
      const ipAddress = getIpAddress(req);

      const data = await this.service.createBlackout(
        resourceId,
        validated,
        actorUserId,
        ipAddress,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  deleteBlackout = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const blackoutId = String(req.params.blackoutId);
      const actorUserId = req.user?.id;
      const ipAddress = getIpAddress(req);

      const data = await this.service.deleteBlackout(
        blackoutId,
        actorUserId,
        ipAddress,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  updateSchedules = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const resourceId = String(req.params.id);
      const validated = UpsertSchedulesSchema.parse(req.body);
      const actorUserId = req.user?.id;
      const ipAddress = getIpAddress(req);

      const data = await this.service.updateSchedules(
        resourceId,
        validated,
        actorUserId,
        ipAddress,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}

export const catalogueController = new CatalogueController();
