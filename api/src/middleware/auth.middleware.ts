import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError";

const JWT_SECRET: string = process.env.JWT_SECRET || "";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: "USER" | "ADMIN";
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser | undefined;
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("Authentication required", 401);
  }

  if (!authHeader.startsWith("Bearer ")) {
    throw new AppError("Invalid authorization header", 401);
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded === "string") {
      throw new AppError("Invalid token", 401);
    }

    if (
      typeof decoded.id !== "number" ||
      typeof decoded.email !== "string" ||
      (decoded.role !== "USER" && decoded.role !== "ADMIN")
    ) {
      throw new AppError("Invalid token payload", 401);
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }
}
