export type FieldDetail = { field: string; message: string };

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: FieldDetail[];

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: FieldDetail[],
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const notFound = () =>
  new AppError(404, "NOT_FOUND", "Task not found");

export const imageNotFound = () =>
  new AppError(404, "NOT_FOUND", "Image not found");

export const validationError = (
  message = "Request validation failed",
  details?: FieldDetail[],
) => new AppError(400, "VALIDATION_ERROR", message, details);

export const invalidTransition = (
  message: string,
  details: FieldDetail[],
) => new AppError(409, "INVALID_TRANSITION", message, details);