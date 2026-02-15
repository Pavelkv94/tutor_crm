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
  created_at: string
  deleted_at: string | null
  teacher_id?: number | null
  timezone?: 'BY' | 'PL' | null
}

export interface StudentExtended extends Student {
  balance: number
  bookUntilCancellation: boolean
  notifyAboutBirthday: boolean
  notifyAboutLessons: boolean
}

export interface CreateStudentInput {
  name: string
  class: number
  birth_date: string | null
  teacher_id: number
  timezone?: 'BY' | 'PL' | null
}

export interface UpdateStudentInput {
  name?: string
  class?: number
  birth_date?: string
  teacher_id?: number
  timezone?: 'BY' | 'PL' | null
}

export interface Plan {
  id: number
  plan_name: string
  plan_price: number
  plan_currency: string
  duration: number
  plan_type: string
  deleted_at: string | null
  created_at: string
}

export interface CreatePlanInput {
  plan_price: number
  plan_currency: 'USD' | 'EUR' | 'PLN' | 'BYN' | 'RUB'
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

export interface Teacher {
  id: number
  name: string
  login: string
  role: string
  timezone: 'BY' | 'PL'
  telegrams: Telegram[]
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
  timezone: 'BY' | 'PL'
}

export interface UpdateTeacherInput {
  name: string
  telegram_link?: string | null
  timezone: 'BY' | 'PL'
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

