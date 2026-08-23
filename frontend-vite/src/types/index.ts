import type { RegionCode } from '@/constants/regions'
import type { Currency } from '@/constants/currency'

export interface LoginInput {
  login: string
  password: string
}

export interface LoginOutput {
  accessToken: string
}

export interface JwtPayload {
  id: string
  login: string
  name: string
  role: 'ADMIN' | 'TEACHER'
}

export interface Student {
  id: number
  name: string
  class: number
  birth_date: string
  age: number | null
  created_at: string
  deleted_at: string | null
  teacher_id?: number | null
  timezone?: RegionCode | null
  marketing_consent: boolean
  /**
   * Когда получен ответ про фото/видео. null — вопрос ещё не задавали, и он будет
   * показан на странице оплаты. Отказ — такой же ответ, как согласие.
   */
  marketing_consent_at: string | null
  terms_accepted: boolean
  terms_accepted_at: string | null
  /**
   * Валюта остатка на балансе, а не постоянное свойство ученика.
   * null означает нулевой баланс — валюта «отпущена» и её задаёт первый платёж.
   * Поле только для чтения: менять его можно лишь через корректировку баланса
   * (POST /payments/students/:id/balance/adjust).
   */
  balance_currency: Currency | null
  balance: number
  /**
   * Персональная скидка в процентах, 0 — скидки нет. Применяется к цене каждого занятия,
   * а не к итогу счёта, поэтому влияет и на сумму к оплате, и на закрытие занятий балансом.
   */
  discount: number
}

export interface StudentExtended extends Student {
  actualPlans?: Plan[]
  bookUntilCancellation: boolean
  notifyAboutBirthday: boolean
  notifyAboutLessons: boolean
}

export interface UpdateLessonsPlanForPeriodInput {
  student_id: number
  old_plan_id: number
  new_plan_id: number
  start_date: string
  end_date: string
}

// balance_currency сюда намеренно не входит: в БД стоит констрейнт
// «balance = 0 ⟺ balance_currency IS NULL», поэтому отправка валюты при создании
// (баланс всегда 0) роняет запрос, а при ненулевом балансе сервис отдаёт 400.
export interface CreateStudentInput {
  name: string
  class: number
  birth_date: string | null
  teacher_id: number
  timezone?: RegionCode | null
  marketing_consent?: boolean
  discount?: number
}

export interface UpdateStudentInput {
  name?: string
  class?: number
  birth_date?: string
  teacher_id?: number
  timezone?: RegionCode | null
  marketing_consent?: boolean
  terms_accepted?: boolean
  discount?: number
}

export interface Plan {
  id: number
  plan_name: string
  plan_price: number
  plan_currency: Currency
  duration: number
  plan_type: string
  deleted_at: string | null
  created_at: string
}

export interface CreatePlanInput {
  plan_price: number
  plan_currency: Currency
  duration: number
  plan_type: 'INDIVIDUAL' | 'PAIR'
}

export interface Telegram {
  id: number
  telegram_id: string
  username: string | null
  first_name: string | null
  type: string
}

export interface TeacherBillingDetails {
  full_name_latin: string | null
  address: string | null
  passport: string | null
  email: string | null
  bank_name: string | null
  bank_account: string | null
}

export interface TeacherBillingDetailsInput {
  full_name_latin?: string | null
  address?: string | null
  passport?: string | null
  email?: string | null
  bank_name?: string | null
  bank_account?: string | null
}

export interface Teacher {
  id: number
  name: string
  login: string
  role: string
  timezone: RegionCode
  telegrams: Telegram[]
  billing_details: TeacherBillingDetails | null
  deleted_at: string | null
  created_at: string
}

export interface SalaryDataOutputDto {
	total_lessons: number
	teacher: Teacher
	lessons: {
		plan_name: string
		plan_price: number
		plan_currency: string
		duration: number
		plan_type: string
		lessons_count: number
	}[]
}

export interface CreateTeacherInput {
  name: string
  login: string
  password: string
  timezone: RegionCode
  billing_details?: TeacherBillingDetailsInput
}

export interface UpdateTeacherInput {
  name: string
  telegram_link?: string | null
  timezone: RegionCode
  billing_details?: TeacherBillingDetailsInput
}

export type SalaryInvoiceDelivery = 'TELEGRAM_ADMIN' | 'TELEGRAM_TEACHER'

export interface SalaryInvoiceInput {
  teacher_id: number
  start_date: string
  end_date: string
  invoice_number: string
  invoice_date: string
  lesson_rates: { plan_name: string; rate: number }[]
  extra_amount?: number
  delivery: SalaryInvoiceDelivery[]
}

export interface SalaryInvoiceOutput {
  file_name: string
  total: number
  currency: string
  sent_to_admin: boolean
  sent_to_teacher: boolean
}

export type WeekDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface RegularLessonInput {
  teacher_id: number
  plan_id: number
  start_time: string
  week_day: WeekDay
  start_period_date: string
  end_period_date: string
}

export interface RegularLessonsInput {
  lessons: RegularLessonInput[]
}

export interface TeacherBasic {
  id: number
  name: string
}

export interface StudentLessonsOutputDto {
	id: number
	name: string
	class: number
	canceled_lessons: number
	missed_lessons: number
}

export interface Lesson {
  id: number
  student: Student
  plan: Plan
  teacher: TeacherBasic
  date: string
  status: string
  comment: string | null
  payment_status: boolean
  is_paid: boolean
  is_regular: boolean
  is_free: boolean
  is_trial: boolean
  rescheduled_lesson_id: number | null
  rescheduled_lesson_date: string | null
  rescheduled_to_lesson_id: number | null
  rescheduled_to_lesson_date: string | null
  created_at: string
}

export interface ApiError {
  statusCode: number
  path: string
  message: string | string[]
}

export interface SingleLessonInput {
  plan_id: number
  student_id: number
  teacher_id: number
  start_date: string
  isFree: boolean
  isTrial: boolean
}

export interface CancelLessonInput {
  comment: string
  rescheduled: boolean
  missed: boolean
  fullCancel: boolean
}

export interface RescheduledLessonInput {
  rescheduled_lesson_id: number
	teacher_id: number
  start_date: string
}

export interface StudentLessonsOutput {
  id: number
  name: string
  class: number
  canceled_lessons: number
  missed_lessons: number
}

export type TaskStatus = 'IN_PROGRESS' | 'ON_APPROVAL' | 'COMPLETED'

export interface TaskStatusCount {
  IN_PROGRESS: number
  ON_APPROVAL: number
  COMPLETED: number
}

export interface TaskTeacher {
  id: number
  name: string
}

export interface TaskComment {
  id: string
  comment: string
  created_at: string
  commenter_name: string
}

export interface Task {
  id: string
  description: string
  status: TaskStatus
  color: string
  teacher_id: number
  created_at: string
  updated_at: string
  teacher?: TaskTeacher
  comments_count?: number
  comments?: TaskComment[]
}

export interface CreateTaskCommentInput {
  comment: string
}

export interface TeacherTasksSummary {
  id: number
  name: string
  login: string
  role: string
  tasks_count: TaskStatusCount
}

export interface CreateTaskInput {
  description: string
  teacher_id: number
}

export interface UpdateTaskInput {
  description?: string
  teacher_id?: number
  status?: TaskStatus
}

export interface TasksPendingCount {
  count: number
}

export interface Course {
  id: number
  name: string
  created_at: string
}

export interface CreateCourseInput {
  name: string
}

export interface UpdateCourseInput {
  name: string
}

export type MaterialFileType = 'PDF' | 'HTML'
export type MaterialUploadStatus = 'UPLOADING' | 'UPLOADED' | 'FAILED'

/** COURSE — доступ выдан на весь курс, FILE — точечно на этот материал */
export type MaterialAccessSource = 'COURSE' | 'FILE'

export interface TeacherRef {
  id: number
  name: string
}

export interface MaterialTeacher extends TeacherRef {
  accessSource: MaterialAccessSource
}

export interface Material {
  id: number
  courseId: number
  originalName: string
  mimeType: string
  sizeBytes: number
  type: MaterialFileType
  status: MaterialUploadStatus
  created_at: string
  teachers: MaterialTeacher[]
  /** Преподаватели с доступом к курсу, которым этот материал закрыт */
  restrictedTeachers: TeacherRef[]
  hasAccess: boolean
}

export interface RenameMaterialInput {
  originalName: string
}

export interface UpdateAccessInput {
  teacherIds: number[]
}

export interface UploadInitInput {
  courseId: number
  teachers: number[]
  fileName: string
  mimeType: string
  contentType: string
  sizeBytes: number
}

export interface UploadInitResponse {
  materialId: number
  uploadUrl: string
}

export interface ViewUrlResponse {
  url: string
}

export interface MaterialsSize {
  totalSizeBytes: number
}

export type PaymentType =
  | 'STRIPE_PAYMENT'
  | 'STRIPE_REFUND'
  | 'MANUAL_ADJUSTMENT'
  | 'LEGACY_OPENING_BALANCE'

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'CANCELED' | 'FAILED' | 'REQUIRES_ATTENTION'

/** Все суммы — целые единицы валюты (40 = 40 PLN) и знаковые: списания отрицательные. */
export interface Payment {
  id: number
  student_id: number
  student_name: string
  type: PaymentType
  status: PaymentStatus
  amount: number
  currency: Currency
  period_start: string | null
  period_end: string | null
  lessons_count: number | null
  comment: string | null
  paid_at: string | null
  created_at: string
}

export interface PaymentsFilter {
  student_id?: number
  status?: PaymentStatus
  type?: PaymentType
  from?: string
  to?: string
}

export interface CreateInvoiceInput {
  student_id: number
  start_date: string
  end_date: string
}

export interface Invoice {
  payment_id: number
  student_id: number
  amount: number
  currency: Currency
  lessons_count: number
  /** null для BYN и когда Stripe недоступен. */
  link: string | null
}

export interface BalanceAllocation {
  lesson_id: number
  lesson_date: string
  amount: number
  currency: Currency
}

export interface StudentBalance {
  student_id: number
  balance: number
  balance_currency: Currency | null
  allocations: BalanceAllocation[]
}

export interface AdjustBalanceInput {
  /** Знаковая сумма, не равная нулю: отрицательная — списание. */
  amount: number
  /** Обязательна при нулевом балансе, недопустима при другом остатке. */
  currency?: Currency
  comment: string
}

export interface AffectedLesson {
  lesson_id: number
  amount: number
  new_status: string
}

export interface AdjustBalanceResult {
  balance: number
  balance_currency: Currency | null
  affected_lessons: AffectedLesson[]
}

