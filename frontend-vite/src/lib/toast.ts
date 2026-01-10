import { toast } from 'sonner'
import type { ApiError } from '@/types'

/**
 * Formats error message from API error response
 * @param message - Error message (string or array of strings)
 * @returns Formatted error message string
 */
const formatErrorMessage = (message: string | string[] | undefined): string => {
  if (!message) {
    return 'Произошла ошибка'
  }

  if (Array.isArray(message)) {
    return message.join(', ')
  }

  return message
}

/**
 * Shows an error toast notification
 * @param error - API error response
 */
export const showErrorToast = (error: ApiError | undefined): void => {
  if (!error) {
    toast.error('Произошла ошибка')
    return
  }

  const message = formatErrorMessage(error.message)
  toast.error(message)
}

/**
 * Shows a success toast notification
 * @param message - Success message
 */
export const showSuccessToast = (message: string): void => {
  toast.success(message)
}

/**
 * Shows an info toast notification
 * @param message - Info message
 */
export const showInfoToast = (message: string): void => {
  toast.info(message)
}







