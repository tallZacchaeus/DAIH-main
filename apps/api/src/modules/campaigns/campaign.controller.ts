import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { campaignService, CampaignService } from "./campaign.service.js";
import { prisma } from "../../db/client.js";

export class CampaignController {
  constructor(private service: CampaignService = campaignService) {}

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      const result = await this.service.createCampaign(userId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const status = req.query.status as any;
      const type = req.query.type as any;
      const skip = (page - 1) * limit;

      const where: any = {
        ...(status ? { status } : { status: { not: "ARCHIVED" as any } }),
        ...(type && { type }),
      };

      const [items, total] = await Promise.all([
        prisma.campaign.findMany({
          where,
          include: {
            metrics: true,
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            aiApprovedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.campaign.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  };

  get = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: {
          metrics: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          aiApprovedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          executions: {
            take: 20,
            orderBy: { createdAt: "desc" },
            include: {
              recipient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          code: "CAMPAIGN_NOT_FOUND",
          message: "Campaign not found",
        });
      }

      res.status(200).json({ success: true, data: campaign });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const result = await this.service.updateCampaign(id, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const result = await this.service.deleteCampaign(id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  approveAi = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      const id = req.params.id as string;
      const result = await this.service.approveAiCampaign(userId, id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  approve = this.approveAi;

  execute = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const executedByUserId = req.user?.id;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const result = await this.service.executeCampaign(
        id,
        executedByUserId,
        ipAddress,
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  generateAiCopy = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.generateAiCopy(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  calculateRfm = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.calculateRfmScores();
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  getMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const metrics = await this.service.recalculateMetrics(id);
      res.status(200).json({ success: true, data: metrics });
    } catch (err) {
      next(err);
    }
  };
}

export const campaignController = new CampaignController();
