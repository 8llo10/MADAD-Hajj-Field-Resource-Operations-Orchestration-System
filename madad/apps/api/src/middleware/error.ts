import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

export const errorHandler: ErrorRequestHandler = (
    err,
    req,
    res,
    _next
) => {
    if (err instanceof ZodError) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            issues: err.issues,
            requestId: req.get("x-request-id"),
        });
    }

    if (err instanceof AppError) {
        const statusCode =
            (err as any).status ??
            (err as any).statusCode ??
            500;

        return res.status(statusCode).json({
            error: err.message,
            details: (err as any).details,
        });
    }

    console.error(err);

    return res.status(500).json({
        error: "Internal server error",
    });
};