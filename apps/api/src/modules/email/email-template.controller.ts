import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { emailTemplateService } from "./email-template.service.js";

export class EmailTemplateController {
  /**
   * Lists all email templates with metadata and customization status
   */
  listTemplates = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const templates = await emailTemplateService.listTemplates();
      res.json({
        success: true,
        data: templates,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Retrieves single email template details
   */
  getTemplate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const type = String(req.params.type);
      const template = await emailTemplateService.getTemplate(type);
      res.json({
        success: true,
        data: {
          type,
          ...template,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Updates an email template (Super Admin only)
   */
  updateTemplate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const type = String(req.params.type);
      const { subject, htmlBody, textBody, isActive } = req.body;

      if (!subject || !htmlBody) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "subject and htmlBody are required",
        });
        return;
      }

      const result = await emailTemplateService.updateTemplate(
        type,
        { subject, htmlBody, textBody, isActive },
        req.user?.id,
      );

      res.json({
        success: true,
        message: "Email template updated successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const emailTemplateController = new EmailTemplateController();
