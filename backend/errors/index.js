class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message)
        this.statusCode = statusCode
        this.isOperational = isOperational
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
        Error.captureStackTrace(this, this.constructor)
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404)
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403)
    }
}

class BadRequestError extends AppError {
    constructor(message = 'Bad request') {
        super(message, 400)
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401)
    }
}

class ConflictError extends AppError {
    constructor(message = 'Conflict') {
        super(message, 409)
    }
}

class ValidationError extends AppError {
    constructor(message = 'Validation failed', errors = {}) {
        super(message, 422)
        this.errors = errors
    }
}

class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500)
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429)
    }
}

const errorHandler = (err, req, res, next) => {
    // Log the error for debugging
    console.error(err.stack)

    // Default to 500 if status code not set
    const statusCode = err.statusCode || 500
    const response = {
        success: false,
        message: err.message || 'Internal Server Error',
        ...(err.errors && { errors: err.errors }) // Include validation errors if present
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack
    }

    res.status(statusCode).json(response)
}

export default errorHandler

export {
    AppError,
    NotFoundError,
    ForbiddenError,
    BadRequestError,
    UnauthorizedError,
    ConflictError,
    ValidationError,
    InternalServerError,
    RateLimitError
}