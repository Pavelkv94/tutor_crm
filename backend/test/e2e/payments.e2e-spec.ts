import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import Stripe = require("stripe");
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { createTestApp, generateTestAccessToken, getAuthConfig, getJwtService, closeTestApp } from '../helpers/test-utils';
import { Currency, LessonStatus, PaymentStatus, PaymentType, PlanType, TeacherRole } from '../../src/infrastructure/prisma/generated/client';
import { BcryptService } from '../../src/infrastructure/bcrypt/bcrypt.service';
import { stripeConfig, StripeConfig } from '../../src/config/namespaces/stripe.config';

describe('Payments (e2e)', () => {
	let app: INestApplication;
	let module: TestingModule;
	let prisma: PrismaService;
	let adminToken: string;
	let webhookSecret: string;

	let teacherId: number;
	let plnPlanId: number;
	let bynPlanId: number;
	let studentId: number;

	const stripe = new Stripe('sk_test_dummy_for_signing');
	const createdPaymentLinks: string[] = [];

	/** StripeService подменён: сеть не трогаем, но подпись вебхука проверяется по-настоящему. */
	const stripeServiceMock = {
		createProductWithPrice: jest.fn(async ({ planId }: { planId: number }) => ({ productId: `prod_${planId}`, priceId: `price_${planId}` })),
		archiveProduct: jest.fn(),
		createPaymentLink: jest.fn(async () => {
			const id = `plink_${createdPaymentLinks.length + 1}`;
			createdPaymentLinks.push(id);
			return { id, url: `https://buy.stripe.com/${id}` };
		}),
		deactivatePaymentLink: jest.fn(),
		constructWebhookEvent: (rawBody: Buffer, signature: string, secret: string) => stripe.webhooks.constructEvent(rawBody, signature, secret),
	};

	const AUGUST = { start: '2026-08-01', end: '2026-08-31' };
	const lessonDate = (day: number) => new Date(Date.UTC(2026, 7, day, 10, 0, 0));

	// Возвращаем supertest-Test, а не Promise: так вызывающий код может цепочкой звать .expect().
	const postWebhook = (payload: object) => {
		const body = JSON.stringify(payload);
		const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: webhookSecret });
		return request(app.getHttpServer()).post('/payments/stripe/webhook').set('stripe-signature', signature).set('content-type', 'application/json').send(body);
	};

	const checkoutSessionEvent = (
		overrides: {
			eventId?: string;
			sessionId?: string;
			amountTotal?: number;
			paymentLink?: string;
			currency?: string;
			type?: string;
			termsAccepted?: boolean;
			marketing?: 'yes' | 'no';
		} = {},
	) => ({
		id: overrides.eventId ?? 'evt_test_1',
		object: 'event',
		type: overrides.type ?? 'checkout.session.completed',
		data: {
			object: {
				id: overrides.sessionId ?? 'cs_test_1',
				object: 'checkout.session',
				payment_status: 'paid',
				currency: overrides.currency ?? 'pln',
				amount_total: overrides.amountTotal ?? 20000,
				payment_link: overrides.paymentLink ?? createdPaymentLinks.at(-1),
				payment_intent: 'pi_test_1',
				metadata: {},
				...(overrides.termsAccepted ? { consent: { terms_of_service: 'accepted', promotions: null } } : {}),
				...(overrides.marketing
					? { custom_fields: [{ key: 'marketingConsent', type: 'dropdown', dropdown: { value: overrides.marketing } }] }
					: {}),
			},
		},
	});

	const getStudent = async () => prisma.student.findUniqueOrThrow({ where: { id: studentId } });
	const getLessons = async () => prisma.lesson.findMany({ where: { student_id: studentId }, orderBy: { date: 'asc' } });

	const createLesson = async (day: number, planId: number, extra: { is_free?: boolean; is_trial?: boolean } = {}) =>
		prisma.lesson.create({
			data: {
				student_id: studentId,
				teacher_id: teacherId,
				plan_id: planId,
				date: lessonDate(day),
				is_regular: false,
				status: LessonStatus.PENDING_UNPAID,
				...extra,
			},
		});

	beforeAll(async () => {
		const context = await createTestApp({ stripeService: stripeServiceMock });
		app = context.app;
		module = context.module;
		prisma = module.get<PrismaService>(PrismaService);
		webhookSecret = module.get<StripeConfig>(stripeConfig.KEY).stripeWebhookSecret;

		const bcrypt = module.get<BcryptService>(BcryptService);
		const teacher = await prisma.teacher.create({
			data: {
				login: 'payments_e2e_admin',
				password: await bcrypt.generateHash('testPassword123'),
				name: 'Payments E2E Admin',
				role: TeacherRole.ADMIN,
			},
		});
		teacherId = teacher.id;

		// Токен должен указывать на реально существующего преподавателя: payment.created_by_id
		// ссылается на teacher по внешнему ключу.
		adminToken = await generateTestAccessToken(getJwtService(module), getAuthConfig(module), {
			id: String(teacher.id),
			login: teacher.login,
			name: teacher.name,
			role: TeacherRole.ADMIN,
		});

		const plnPlan = await prisma.plan.create({
			data: { plan_type: PlanType.INDIVIDUAL, plan_currency: Currency.PLN, plan_name: 'PLN 60 мин', duration: 60, plan_price: 40 },
		});
		plnPlanId = plnPlan.id;

		const bynPlan = await prisma.plan.create({
			data: { plan_type: PlanType.INDIVIDUAL, plan_currency: Currency.BYN, plan_name: 'BYN 60 мин', duration: 60, plan_price: 25 },
		});
		bynPlanId = bynPlan.id;
	});

	beforeEach(async () => {
		createdPaymentLinks.length = 0;
		jest.clearAllMocks();

		const student = await prisma.student.create({
			data: { name: 'Payments E2E Student', class: 5, teacher_id: teacherId, balance: 0, balance_currency: null },
		});
		studentId = student.id;
	});

	afterEach(async () => {
		await prisma.lessonPayment.deleteMany({ where: { student_id: studentId } });
		await prisma.payment.deleteMany({ where: { student_id: studentId } });
		await prisma.lesson.deleteMany({ where: { student_id: studentId } });
		await prisma.student.delete({ where: { id: studentId } });
		await prisma.stripeWebhookEvent.deleteMany({});
	});

	afterAll(async () => {
		await prisma.plan.deleteMany({ where: { id: { in: [plnPlanId, bynPlanId] } } });
		await prisma.teacher.delete({ where: { id: teacherId } });
		await closeTestApp(app);
	});

	describe('согласия на странице оплаты', () => {
		const issueInvoice = async () =>
			request(app.getHttpServer())
				.post('/payments/invoices')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ student_id: studentId, start_date: AUGUST.start, end_date: AUGUST.end })
				.expect(201);

		it('спрашивает оба согласия у того, кто платит впервые', async () => {
			await createLesson(5, plnPlanId);

			await issueInvoice();

			expect(stripeServiceMock.createPaymentLink).toHaveBeenCalledWith(
				expect.objectContaining({ consents: { collectTermsOfService: true, collectMarketingConsent: true } }),
			);
		});

		it('записывает ответы ученику и больше их не спрашивает', async () => {
			await createLesson(5, plnPlanId);
			await issueInvoice();

			await postWebhook(checkoutSessionEvent({ amountTotal: 4000, termsAccepted: true, marketing: 'yes' })).expect(200);

			const student = await getStudent();
			expect(student.terms_accepted_at).toBeInstanceOf(Date);
			expect(student.marketing_consent).toBe(true);
			expect(student.marketing_consent_at).toBeInstanceOf(Date);

			// Следующий счёт тому же ученику уже ничего не спрашивает.
			await createLesson(12, plnPlanId);
			await issueInvoice();

			expect(stripeServiceMock.createPaymentLink).toHaveBeenLastCalledWith(
				expect.objectContaining({ consents: { collectTermsOfService: false, collectMarketingConsent: false } }),
			);
		});

		it('фиксирует отказ так же, как согласие', async () => {
			await createLesson(5, plnPlanId);
			await issueInvoice();

			await postWebhook(checkoutSessionEvent({ amountTotal: 4000, termsAccepted: true, marketing: 'no' })).expect(200);

			const student = await getStudent();
			expect(student.marketing_consent).toBe(false);
			// Дата отличает «отказался» от «не спрашивали» — второй раз вопрос не покажется.
			expect(student.marketing_consent_at).toBeInstanceOf(Date);
		});

		it('не перезаписывает ответ, проставленный админом', async () => {
			await request(app.getHttpServer())
				.patch(`/students/${studentId}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ marketing_consent: true })
				.expect(204);

			const afterAdmin = await getStudent();
			expect(afterAdmin.marketing_consent_at).toBeInstanceOf(Date);

			await createLesson(5, plnPlanId);
			await issueInvoice();
			// Ученик всё равно оплатил по старой ссылке и выбрал «нет».
			await postWebhook(checkoutSessionEvent({ amountTotal: 4000, marketing: 'no' })).expect(200);

			const student = await getStudent();
			expect(student.marketing_consent).toBe(true);
			expect(student.marketing_consent_at).toEqual(afterAdmin.marketing_consent_at);
		});

		it('переживает сессию без согласий', async () => {
			await createLesson(5, plnPlanId);
			await issueInvoice();

			// Так выглядят ссылки, созданные до появления фичи.
			await postWebhook(checkoutSessionEvent({ amountTotal: 4000 })).expect(200);

			const student = await getStudent();
			expect(student.balance).toBe(0);
			expect(student.terms_accepted_at).toBeNull();
			expect(student.marketing_consent_at).toBeNull();
			expect((await getLessons())[0].status).toBe(LessonStatus.PENDING_PAID);
		});

		it('даёт админу снять принятие условий', async () => {
			await request(app.getHttpServer())
				.patch(`/students/${studentId}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ terms_accepted: true })
				.expect(204);
			expect((await getStudent()).terms_accepted_at).toBeInstanceOf(Date);

			await request(app.getHttpServer())
				.patch(`/students/${studentId}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ terms_accepted: false })
				.expect(204);

			// Вопрос вернётся на следующей оплате.
			expect((await getStudent()).terms_accepted_at).toBeNull();
		});
	});

	describe('invoice → payment → allocation', () => {
		it('pays lessons from a Stripe payment and keeps the surplus on the balance', async () => {
			await createLesson(5, plnPlanId);
			await createLesson(12, plnPlanId);
			await createLesson(19, plnPlanId);
			await createLesson(26, plnPlanId);

			const invoiceResponse = await request(app.getHttpServer())
				.post('/payments/invoices')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ student_id: studentId, start_date: AUGUST.start, end_date: AUGUST.end })
				.expect(201);

			expect(invoiceResponse.body).toMatchObject({ amount: 160, currency: Currency.PLN, lessons_count: 4 });
			expect(invoiceResponse.body.link).toContain('https://buy.stripe.com/');

			// Оплачено на одно занятие больше, чем назначено: 200 при счёте на 160.
			await postWebhook(checkoutSessionEvent({ amountTotal: 20000 })).expect(200);

			const lessons = await getLessons();
			expect(lessons.every((lesson) => lesson.status === LessonStatus.PENDING_PAID)).toBe(true);

			const student = await getStudent();
			expect(student.balance).toBe(40);
			expect(student.balance_currency).toBe(Currency.PLN);

			const payment = await prisma.payment.findUniqueOrThrow({ where: { id: invoiceResponse.body.payment_id } });
			expect(payment.status).toBe(PaymentStatus.SUCCEEDED);
			expect(payment.amount).toBe(200);
		});

		it('pays a newly scheduled lesson straight from the balance', async () => {
			await createLesson(5, plnPlanId);
			await request(app.getHttpServer())
				.post('/payments/invoices')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ student_id: studentId, start_date: AUGUST.start, end_date: AUGUST.end })
				.expect(201);
			await postWebhook(checkoutSessionEvent({ amountTotal: 8000 })).expect(200);

			expect((await getStudent()).balance).toBe(40);

			await request(app.getHttpServer())
				.post('/lessons/single')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ student_id: studentId, teacher_id: teacherId, plan_id: plnPlanId, start_date: lessonDate(12).toISOString(), isFree: false, isTrial: false })
				.expect(201);

			// Остаток закрывает новое занятие автоматически.
			const lessons = await getLessons();
			expect(lessons).toHaveLength(2);
			expect(lessons.every((lesson) => lesson.status === LessonStatus.PENDING_PAID)).toBe(true);
			const student = await getStudent();
			expect(student.balance).toBe(0);
			expect(student.balance_currency).toBeNull();
		});

		it('ignores a redelivered webhook event', async () => {
			await createLesson(5, plnPlanId);
			await request(app.getHttpServer())
				.post('/payments/invoices')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ student_id: studentId, start_date: AUGUST.start, end_date: AUGUST.end })
				.expect(201);

			await postWebhook(checkoutSessionEvent({ amountTotal: 8000 })).expect(200);
			await postWebhook(checkoutSessionEvent({ amountTotal: 8000 })).expect(200);

			expect((await getStudent()).balance).toBe(40);
			expect(await prisma.lessonPayment.count({ where: { student_id: studentId, reverted_at: null } })).toBe(1);
		});

		it('rejects a webhook with a bad signature', async () => {
			await request(app.getHttpServer())
				.post('/payments/stripe/webhook')
				.set('stripe-signature', 't=1,v1=deadbeef')
				.set('content-type', 'application/json')
				.send(JSON.stringify(checkoutSessionEvent()))
				.expect(400);
		});
	});

	describe('скидка ученика', () => {
		const issueInvoice = () =>
			request(app.getHttpServer())
				.post('/payments/invoices')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ student_id: studentId, start_date: AUGUST.start, end_date: AUGUST.end });

		it('уменьшает счёт и всё равно закрывает все занятия', async () => {
			await prisma.student.update({ where: { id: studentId }, data: { discount: 10 } });
			await createLesson(5, plnPlanId);
			await createLesson(12, plnPlanId);
			await createLesson(19, plnPlanId);
			await createLesson(26, plnPlanId);

			// 4 × round(40 × 0.9) = 144 вместо 160. Скидка на итог дала бы столько же,
			// но занятия закрывались бы по 40 — и на четвёртое денег бы не хватило.
			const invoiceResponse = await issueInvoice().expect(201);
			expect(invoiceResponse.body).toMatchObject({ amount: 144, currency: Currency.PLN, lessons_count: 4 });

			// Готовой цены на 36 в Stripe нет: она принадлежит ученику, а не плану.
			expect(stripeServiceMock.createPaymentLink).toHaveBeenLastCalledWith(
				expect.objectContaining({
					items: [{ productId: `prod_${plnPlanId}`, unitAmountMajor: 36, currency: Currency.PLN, quantity: 4 }],
				}),
			);

			await postWebhook(checkoutSessionEvent({ amountTotal: 14400 })).expect(200);

			const lessons = await getLessons();
			expect(lessons.every((lesson) => lesson.status === LessonStatus.PENDING_PAID)).toBe(true);

			const student = await getStudent();
			expect(student.balance).toBe(0);
			expect(student.balance_currency).toBeNull();

			const payment = await prisma.payment.findUniqueOrThrow({ where: { id: invoiceResponse.body.payment_id } });
			expect(payment.discount_percent).toBe(10);
		});

		it('раскладывает оплату по скидке со счёта, а не по текущей', async () => {
			await prisma.student.update({ where: { id: studentId }, data: { discount: 10 } });
			await createLesson(5, plnPlanId);
			await createLesson(12, plnPlanId);
			await issueInvoice().expect(201);

			// Админ снял скидку уже после того, как ссылка ушла ученику.
			await prisma.student.update({ where: { id: studentId }, data: { discount: 0 } });
			await postWebhook(checkoutSessionEvent({ amountTotal: 7200 })).expect(200);

			const lessons = await getLessons();
			expect(lessons.every((lesson) => lesson.status === LessonStatus.PENDING_PAID)).toBe(true);
			expect((await getStudent()).balance).toBe(0);
		});

		it('не принимает скидку выше потолка', async () => {
			await request(app.getHttpServer())
				.patch(`/students/${studentId}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ discount: 11 })
				.expect(400);
		});

		it('не даёт записать в БД скидку вне процента', async () => {
			await expect(prisma.student.update({ where: { id: studentId }, data: { discount: 101 } })).rejects.toThrow();
		});
	});

	describe('refunds', () => {
		it('reverts payment from the latest lesson', async () => {
			await createLesson(5, plnPlanId);
			await createLesson(12, plnPlanId);
			await request(app.getHttpServer())
				.post('/payments/invoices')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ student_id: studentId, start_date: AUGUST.start, end_date: AUGUST.end })
				.expect(201);
			await postWebhook(checkoutSessionEvent({ amountTotal: 8000 })).expect(200);

			await postWebhook({
				id: 'evt_refund_1',
				object: 'event',
				type: 'refund.created',
				data: { object: { id: 're_test_1', object: 'refund', status: 'succeeded', amount: 4000, payment_intent: 'pi_test_1' } },
			}).expect(200);

			const lessons = await getLessons();
			expect(lessons[0].status).toBe(LessonStatus.PENDING_PAID);
			expect(lessons[1].status).toBe(LessonStatus.PENDING_UNPAID);
			expect((await getStudent()).balance).toBe(0);
		});
	});

	describe('manual balance adjustments', () => {
		it('credits and debits the balance', async () => {
			await createLesson(5, plnPlanId);

			const credited = await request(app.getHttpServer())
				.post(`/payments/students/${studentId}/balance/adjust`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ amount: 100, currency: Currency.PLN, comment: 'Оплата наличными' })
				.expect(200);

			expect(credited.body.balance).toBe(60);
			expect(credited.body.affected_lessons).toHaveLength(1);

			const debited = await request(app.getHttpServer())
				.post(`/payments/students/${studentId}/balance/adjust`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ amount: -30, comment: 'Корректировка' })
				.expect(200);

			expect(debited.body.balance).toBe(30);
		});

		it('refuses to spend more than the student has', async () => {
			await request(app.getHttpServer())
				.post(`/payments/students/${studentId}/balance/adjust`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ amount: -100, currency: Currency.PLN, comment: 'Слишком много' })
				.expect(400);
		});
	});

	describe('currency rules', () => {
		it('issues a BYN invoice without a payment link', async () => {
			await createLesson(5, bynPlanId);

			const response = await request(app.getHttpServer())
				.post('/payments/invoices')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ student_id: studentId, start_date: AUGUST.start, end_date: AUGUST.end })
				.expect(201);

			expect(response.body).toMatchObject({ amount: 25, currency: Currency.BYN, link: null });
			expect(stripeServiceMock.createPaymentLink).not.toHaveBeenCalled();
		});

		it('blocks a lesson in a currency conflicting with the balance', async () => {
			await request(app.getHttpServer())
				.post(`/payments/students/${studentId}/balance/adjust`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ amount: 100, currency: Currency.PLN, comment: 'Пополнение' })
				.expect(200);

			await request(app.getHttpServer())
				.post('/lessons/single')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ student_id: studentId, teacher_id: teacherId, plan_id: bynPlanId, start_date: lessonDate(12).toISOString(), isFree: false, isTrial: false })
				.expect(400);
		});

		it('allows switching currency once the balance is empty', async () => {
			await createLesson(5, plnPlanId);
			await request(app.getHttpServer())
				.post(`/payments/students/${studentId}/balance/adjust`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ amount: 40, currency: Currency.PLN, comment: 'Ровно на одно занятие' })
				.expect(200);

			const spent = await getStudent();
			expect(spent.balance).toBe(0);
			expect(spent.balance_currency).toBeNull();

			// Следующий месяц уже можно вести в другой валюте.
			await request(app.getHttpServer())
				.post('/lessons/single')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					student_id: studentId,
					teacher_id: teacherId,
					plan_id: bynPlanId,
					start_date: new Date(Date.UTC(2026, 8, 10, 10, 0, 0)).toISOString(),
					isFree: false,
					isTrial: false,
				})
				.expect(201);
		});

		it('refuses to invoice lessons in mixed currencies', async () => {
			await createLesson(5, plnPlanId);
			await createLesson(12, bynPlanId);

			await request(app.getHttpServer())
				.post('/payments/invoices')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ student_id: studentId, start_date: AUGUST.start, end_date: AUGUST.end })
				.expect(400);
		});
	});

	describe('free and trial lessons', () => {
		it('keeps free and trial lessons out of the invoice', async () => {
			await createLesson(5, plnPlanId);
			await createLesson(12, plnPlanId, { is_free: true });
			await createLesson(19, plnPlanId, { is_trial: true });

			const response = await request(app.getHttpServer())
				.post('/payments/invoices')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ student_id: studentId, start_date: AUGUST.start, end_date: AUGUST.end })
				.expect(201);

			expect(response.body).toMatchObject({ amount: 40, lessons_count: 1 });
		});
	});

	describe('legacy route', () => {
		it('keeps the old contract with 204 and no body', async () => {
			await createLesson(5, plnPlanId);

			const response = await request(app.getHttpServer())
				.post('/telegram/send-lessons-cost-to-admin')
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ student_id: studentId, start_date: AUGUST.start, end_date: AUGUST.end })
				.expect(204);

			expect(response.body).toEqual({});
			expect(await prisma.payment.count({ where: { student_id: studentId, type: PaymentType.STRIPE_PAYMENT } })).toBe(1);
		});
	});

	describe('balance endpoint', () => {
		it('returns the balance and its allocations', async () => {
			await createLesson(5, plnPlanId);
			await request(app.getHttpServer())
				.post(`/payments/students/${studentId}/balance/adjust`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ amount: 100, currency: Currency.PLN, comment: 'Пополнение' })
				.expect(200);

			const response = await request(app.getHttpServer())
				.get(`/payments/students/${studentId}/balance`)
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(200);

			expect(response.body).toMatchObject({ student_id: studentId, balance: 60, balance_currency: Currency.PLN });
			expect(response.body.allocations).toHaveLength(1);
		});

		it('requires authentication', async () => {
			await request(app.getHttpServer()).get(`/payments/students/${studentId}/balance`).expect(401);
		});
	});

	describe('payments list', () => {
		// created_at у операций — «сейчас», поэтому границы периода берём от текущей даты,
		// а не от августа 2026, на который назначены занятия.
		const dayOffset = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

		it('applies numeric and date query filters and returns the student name', async () => {
			await createLesson(5, plnPlanId);
			await request(app.getHttpServer())
				.post(`/payments/students/${studentId}/balance/adjust`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ amount: 100, currency: Currency.PLN, comment: 'Пополнение' })
				.expect(200);

			// student_id/from/to проходят через @Type(() => Number|Date): без transform они
			// доехали бы до Prisma строками и роут ответил бы 400.
			const response = await request(app.getHttpServer())
				.get('/payments')
				.query({
					student_id: studentId,
					type: PaymentType.MANUAL_ADJUSTMENT,
					status: PaymentStatus.SUCCEEDED,
					from: dayOffset(-1),
					to: dayOffset(1),
				})
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(200);

			expect(response.body).toHaveLength(1);
			expect(response.body[0]).toMatchObject({
				student_id: studentId,
				student_name: 'Payments E2E Student',
				type: PaymentType.MANUAL_ADJUSTMENT,
				status: PaymentStatus.SUCCEEDED,
				amount: 100,
				currency: Currency.PLN,
				comment: 'Пополнение',
			});
		});

		it('excludes operations outside the requested period', async () => {
			await request(app.getHttpServer())
				.post(`/payments/students/${studentId}/balance/adjust`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ amount: 100, currency: Currency.PLN, comment: 'Пополнение' })
				.expect(200);

			const response = await request(app.getHttpServer())
				.get('/payments')
				.query({ student_id: studentId, from: dayOffset(1), to: dayOffset(2) })
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(200);

			expect(response.body).toEqual([]);
		});

		it('rejects an unknown status', async () => {
			await request(app.getHttpServer())
				.get('/payments')
				.query({ status: 'NOT_A_STATUS' })
				.set('Authorization', `Bearer ${adminToken}`)
				.expect(400);
		});

		it('requires authentication', async () => {
			await request(app.getHttpServer()).get('/payments').expect(401);
		});
	});
});
