import { apiClient } from '@/lib/api-client'
import type {
  AdjustBalanceInput,
  AdjustBalanceResult,
  CreateInvoiceInput,
  Invoice,
  Payment,
  PaymentsFilter,
  StudentBalance,
} from '@/types'

export const paymentsApi = {
  list: async (filter: PaymentsFilter = {}): Promise<Payment[]> => {
    const params: Record<string, string> = {}
    if (filter.student_id !== undefined) {
      params.student_id = filter.student_id.toString()
    }
    if (filter.status) {
      params.status = filter.status
    }
    if (filter.type) {
      params.type = filter.type
    }
    if (filter.from) {
      params.from = filter.from
    }
    if (filter.to) {
      // Фильтр применяется к created_at, а из <input type="date"> приходит полночь —
      // без сдвига на конец суток последний день периода выпал бы из выборки.
      params.to = `${filter.to}T23:59:59.999Z`
    }
    const response = await apiClient.get<Payment[]>('/payments', { params })
    return response.data
  },
  createInvoice: async (data: CreateInvoiceInput): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>('/payments/invoices', data)
    return response.data
  },
  cancelInvoice: async (paymentId: number): Promise<void> => {
    await apiClient.delete(`/payments/invoices/${paymentId}`)
  },
  getStudentBalance: async (studentId: number): Promise<StudentBalance> => {
    const response = await apiClient.get<StudentBalance>(`/payments/students/${studentId}/balance`)
    return response.data
  },
  adjustBalance: async (
    studentId: number,
    data: AdjustBalanceInput,
  ): Promise<AdjustBalanceResult> => {
    const response = await apiClient.post<AdjustBalanceResult>(
      `/payments/students/${studentId}/balance/adjust`,
      data,
    )
    return response.data
  },
  /** Применяет платёж, зависший в статусе REQUIRES_ATTENTION из-за конфликта валют. */
  applyPayment: async (paymentId: number): Promise<AdjustBalanceResult> => {
    const response = await apiClient.post<AdjustBalanceResult>(`/payments/${paymentId}/apply`)
    return response.data
  },
}
