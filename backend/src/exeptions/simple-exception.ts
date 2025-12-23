import { ArgumentsHost, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

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
        const responseBody: any = exception.getResponse();
        response.status(status).json({
          statusCode: status,
          path: request.url,
          message: responseBody.message,
        });
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
