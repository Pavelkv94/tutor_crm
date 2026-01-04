import { ArgumentsHost, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { translateError } from '../utils/error-translations';

/**
 * Type for BadRequestException response body from NestJS
 * Validation errors can return either a single message string or an array of message strings
 */
type BadRequestExceptionResponse = {
	message: string | string[];
	statusCode: HttpStatus.BAD_REQUEST;
	error?: string;
};

/**
 * Type for the 400 error response sent to the client
 */
export class BadRequestErrorResponse {
	@ApiProperty({
		description: 'The HTTP status code',
		example: 400,
	})
	statusCode: HttpStatus.BAD_REQUEST;
	@ApiProperty({
		description: 'The path of the request',
		example: '/api/v1/users',
	})
	path: string;
	@ApiProperty({
		description: 'The message of the error',
		example: ['Error message 1', 'Error message 2'],
	})
	message: string | string[];
};

export class SimpleExeptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost): any {
		const contextType = host.getType();
    // Handle HTTP context
    if (contextType === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const request = ctx.getRequest();

			let status: number;
			let message: string | string[];

			// Handle Prisma errors
			// Check for PrismaClientKnownRequestError by checking for the code property
			if (
				exception &&
				typeof exception === 'object' &&
				'code' in exception &&
				typeof (exception as any).code === 'string' &&
				(exception as any).code.startsWith('P')
			) {
				const prismaError = exception as Prisma.PrismaClientKnownRequestError;
				// Map Prisma error codes to HTTP status codes
				switch (prismaError.code) {
					case 'P2002': // Unique constraint violation
						status = HttpStatus.BAD_REQUEST;
						const target = Array.isArray(prismaError.meta?.target)
							? prismaError.meta.target.join(', ')
							: prismaError.meta?.target || 'field';
						message = `A record with this ${target} already exists`;
						break;
					case 'P2003': // Foreign key constraint violation
						status = HttpStatus.BAD_REQUEST;
						message = 'Database constraint violation';
						break;
					case 'P2025': // Record not found
						status = HttpStatus.NOT_FOUND;
						message = 'Record not found';
						break;
					default:
						status = HttpStatus.INTERNAL_SERVER_ERROR;
						message = 'Database error occurred';
				}
			}
			// Handle Prisma validation errors
			else if (
				exception &&
				typeof exception === 'object' &&
				'constructor' in exception &&
				exception.constructor.name === 'PrismaClientValidationError'
			) {
				status = HttpStatus.BAD_REQUEST;
				message = exception instanceof Error ? exception.message : 'Invalid database query parameters';
			}
			// Handle HttpException
			else if (exception instanceof HttpException) {
				status = exception.getStatus();
				const responseBody = exception.getResponse();

				if (typeof responseBody === 'object' && responseBody !== null && 'message' in responseBody) {
					message = (responseBody as { message: string | string[] }).message;
				} else if (typeof responseBody === 'string') {
					message = responseBody;
				} else {
					message = exception.message || 'Internal server error';
				}
			}
			// Handle other errors (generic Error, unhandled rejections, etc.)
			else {
				status = HttpStatus.INTERNAL_SERVER_ERROR;
				message = exception instanceof Error ? exception.message : 'Internal server error';
			}

			// Format response
			if (status === 400) {
				const errorResponse: BadRequestErrorResponse = {
          statusCode: status,
          path: request.url,
					message: translateError(message),
				};
				response.status(status).json(errorResponse);
      } else {
        response.status(status).json({
          statusCode: status,
          path: request.url,
					message: translateError(message),
        });
      }
    }
    
    // Handle Telegram bot context
    else if (contextType === 'rpc') {
      // For Telegram bot errors, just log them
			const errorMessage = exception instanceof Error ? exception.message : 'Unknown error';
			console.error('Telegram bot error:', errorMessage);
    }
    
    // Handle other contexts (like WebSocket)
    else {
			const errorMessage = exception instanceof Error ? exception.message : 'Unknown error';
			console.error('Exception in', contextType, 'context:', errorMessage);
    }
  }
}
