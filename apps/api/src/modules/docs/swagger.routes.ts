import { Router, Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../../config/swagger.spec.js";

export const swaggerRouter = Router();

// Custom CSS for DAIH Brand Styling (Deep Purple #23055c theme, crisp badges, modern typography)
const customCss = `
  .swagger-ui .topbar { 
    background-color: #23055c; 
    border-bottom: 2px solid #392271; 
    padding: 10px 0;
  }
  .swagger-ui .topbar .topbar-wrapper img {
    content: url('/uploads/resources/logo.png');
    height: 38px;
  }
  .swagger-ui .info {
    margin: 30px 0;
  }
  .swagger-ui .info .title {
    color: #23055c;
    font-family: system-ui, -apple-system, sans-serif;
    font-weight: 800;
  }
  .swagger-ui .info .title small.version-stamp {
    background-color: #23055c;
  }
  .swagger-ui .scheme-container {
    background: #f7f9ff;
    border-top: 1px solid #ebe7f5;
    border-bottom: 1px solid #ebe7f5;
    box-shadow: none;
    padding: 15px 0;
  }
  .swagger-ui .btn.authorize {
    background-color: #23055c;
    color: #fff;
    border-color: #23055c;
    border-radius: 8px;
    font-weight: 700;
  }
  .swagger-ui .btn.authorize svg {
    fill: #fff;
  }
  .swagger-ui .opblock.opblock-post {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.05);
  }
  .swagger-ui .opblock.opblock-get {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
  }
  .swagger-ui .opblock.opblock-put {
    border-color: #f59e0b;
    background: rgba(245, 158, 11, 0.05);
  }
  .swagger-ui .opblock.opblock-delete {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
  }
  .swagger-ui .opblock .opblock-summary-method {
    border-radius: 6px;
    font-weight: 800;
    font-size: 12px;
  }
`;

const swaggerOptions: swaggerUi.SwaggerUiOptions = {
  customCss,
  customSiteTitle: "DAIH Workspace API Explorer & Documentation",
  customfavIcon: "/uploads/resources/favicon.ico",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    deepLinking: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    docExpansion: "list",
  },
};

// Middleware to relax CSP headers specifically for the Swagger UI explorer
const swaggerCspMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; img-src 'self' https: http: data: blob:; style-src 'self' 'unsafe-inline' https: http:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:;",
  );
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
};

// Raw JSON OpenAPI specification endpoint
swaggerRouter.get("/json", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.json(swaggerSpec);
});

swaggerRouter.get("/openapi.json", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.json(swaggerSpec);
});

// Mount interactive Swagger UI
swaggerRouter.use(
  "/",
  swaggerCspMiddleware,
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerOptions),
);
