export class AppError extends Error {
  public isOperational = true;
  public details?: unknown;

  constructor(
    public message: string,
    public statusCode: number = 500,
    public errorType: string = 'GENERIC_ERROR',
    details?: unknown
  ) {
    super(message);
    this.name = errorType;
    this.details = details;
  }
}

export class ErrorFactory {
  
  static validation(message: string, zodError?: unknown) {
    return new AppError(message, 400, 'VALIDATION_ERROR', zodError);
  }
  
  static duplicate(message: string) {
    return new AppError(message, 409, 'DUPLICATE_ERROR');
  }
  
  static notFound(message: string) {
    return new AppError(message, 404, 'NOT_FOUND_ERROR');
  }
  
  static unauthorized(message: string) {
    return new AppError(message, 401, 'UNAUTHORIZED_ERROR');
  }
  
  static database(message: string) {
    return new AppError(message, 500, 'DATABASE_ERROR');
  }

  static forbidden(message: string) {//Usuario autenticado pero sin permisos
    return new AppError(message, 403, 'FORBIDDEN_ERROR');
  }

}
