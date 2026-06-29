import { SimpleExeptionFilter } from '../../../src/shared/exceptions/simple-exception';
import { ArgumentsHost, BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';

describe('SimpleExeptionFilter', () => {
	let filter: SimpleExeptionFilter;
	let mockResponse: { status: jest.Mock; json: jest.Mock };
	let mockRequest: { url: string };

	const createHttpHost = (): ArgumentsHost => {
		mockResponse = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};
		mockRequest = { url: '/api/test' };

		return {
			getType: () => 'http',
			switchToHttp: () => ({
				getResponse: () => mockResponse,
				getRequest: () => mockRequest,
			}),
		} as unknown as ArgumentsHost;
	};

	const createRpcHost = (): ArgumentsHost => ({
		getType: () => 'rpc',
	}) as unknown as ArgumentsHost;

	const createOtherHost = (): ArgumentsHost => ({
		getType: () => 'ws',
	}) as unknown as ArgumentsHost;

	beforeEach(() => {
		filter = new SimpleExeptionFilter();
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('HTTP context', () => {
		it('should handle HttpException with object response', () => {
			const host = createHttpHost();
			const exception = new BadRequestException({ message: 'Plan not found' });

			filter.catch(exception, host);

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
			expect(mockResponse.json).toHaveBeenCalledWith({
				statusCode: HttpStatus.BAD_REQUEST,
				path: '/api/test',
				message: 'План не найден',
			});
		});

		it('should handle HttpException with string response', () => {
			const host = createHttpHost();
			const exception = new NotFoundException('Not found');

			filter.catch(exception, host);

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
		});

		it('should handle Prisma P2002 unique constraint error', () => {
			const host = createHttpHost();
			const exception = { code: 'P2002', meta: { target: ['email'] } };

			filter.catch(exception, host);

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'A record with this email already exists' }),
			);
		});

		it('should handle Prisma P2003 foreign key error', () => {
			const host = createHttpHost();
			const exception = { code: 'P2003' };

			filter.catch(exception, host);

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Database constraint violation' }),
			);
		});

		it('should handle Prisma P2025 not found error', () => {
			const host = createHttpHost();
			const exception = { code: 'P2025' };

			filter.catch(exception, host);

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Record not found' }),
			);
		});

		it('should handle unknown Prisma error', () => {
			const host = createHttpHost();
			const exception = { code: 'P9999' };

			filter.catch(exception, host);

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Database error occurred' }),
			);
		});

		it('should handle PrismaClientValidationError', () => {
			const host = createHttpHost();
			const exception = Object.assign(new Error('Invalid query'), {
				constructor: { name: 'PrismaClientValidationError' },
			});

			filter.catch(exception, host);

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
		});

		it('should handle generic Error', () => {
			const host = createHttpHost();
			const exception = new Error('Something went wrong');

			filter.catch(exception, host);

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Something went wrong' }),
			);
		});

		it('should handle array of validation messages', () => {
			const host = createHttpHost();
			const exception = new BadRequestException({ message: ['Plan not found', 'Unknown'] });

			filter.catch(exception, host);

			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({ message: ['План не найден', 'Unknown'] }),
			);
		});
	});

	describe('RPC context', () => {
		it('should log telegram bot error', () => {
			const host = createRpcHost();
			const consoleSpy = jest.spyOn(console, 'error');

			filter.catch(new Error('Bot error'), host);

			expect(consoleSpy).toHaveBeenCalledWith('Telegram bot error:', 'Bot error');
		});
	});

	describe('Other context', () => {
		it('should log error for other context types', () => {
			const host = createOtherHost();
			const consoleSpy = jest.spyOn(console, 'error');

			filter.catch(new Error('WS error'), host);

			expect(consoleSpy).toHaveBeenCalledWith('Exception in', 'ws', 'context:', 'WS error');
		});
	});
});
