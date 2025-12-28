import { ArgumentsHost, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

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
  catch(exception: HttpException, host: ArgumentsHost): any {
		const contextType = host.getType();
    // Handle HTTP context
    if (contextType === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const request = ctx.getRequest();
      const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

      if (status === 400) {
				const responseBody = exception.getResponse() as BadRequestExceptionResponse;
				const errorResponse: BadRequestErrorResponse = {
          statusCode: status,
          path: request.url,
          message: responseBody.message,
				};
				response.status(status).json(errorResponse);
      } else {
        response.status(status).json({
          statusCode: status,
          path: request.url,
          message: (exception as any).message || 'Internal server error',
        });
      }
    }
    
    // Handle Telegram bot context
    else if (contextType === 'rpc') {
      // For Telegram bot errors, just log them
      console.error('Telegram bot error:', exception.message);
    }
    
    // Handle other contexts (like WebSocket)
    else {
      console.error('Exception in', contextType, 'context:', exception.message);
    }
  }
}
