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
  birth_date: string
  teacher_id: number
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
  plan_currency: 'USD' | 'EUR' | 'PLN' | 'BYN'
  duration: number
  plan_type: 'INDIVIDUAL' | 'PAIR'
}

export interface Teacher {
  id: number
  name: string
  login: string
  telegram_id: string | null
  role: string
  timezone: 'BY' | 'PL'
  telegram_link: string | null
  deleted_at: string | null
  created_at: string
}

export interface CreateTeacherInput {
  name: string
  login: string
  password: string
  telegram_link?: string | null
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
  teacher_id?: number | null
  start_date: string
}

