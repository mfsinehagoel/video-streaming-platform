import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
