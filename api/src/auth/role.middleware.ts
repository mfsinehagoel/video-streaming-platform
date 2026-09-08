import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { AppError } from "../errors/AppError";

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  if (req.user.role !== "ADMIN") {
    throw new AppError("Admin access required", 403);
  }

  next();
}
