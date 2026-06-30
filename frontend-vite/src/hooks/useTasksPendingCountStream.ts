import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getAccessToken, setAccessToken } from '@/lib/token-utils'
import type { TasksPendingCount } from '@/types'

const SSE_URL = `${import.meta.env.VITE_API_URL}/tasks/pending-count/stream`
const REFRESH_URL = `${import.meta.env.VITE_API_URL}/auth/refresh-token`
const PENDING_COUNT_QUERY_KEY = ['tasks', 'pending-count']

const refreshAccessToken = async (): Promise<string> => {
  const response = await fetch(REFRESH_URL, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error('Token refresh failed')
  }
  const data = (await response.json()) as { accessToken: string }
  setAccessToken(data.accessToken)
  return data.accessToken
}

export const useTasksPendingCountStream = (): void => {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) return

    const controller = new AbortController()
    let hasRefreshed = false

    const connect = (token: string): void => {
      fetchEventSource(SSE_URL, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        async onopen(response) {
          if (response.ok) {
            hasRefreshed = false
            return
          }

          if (response.status === 401 && !hasRefreshed) {
            hasRefreshed = true
            try {
              const newToken = await refreshAccessToken()
              controller.abort()
              connect(newToken)
            } catch {
              window.location.href = '/login'
            }
            return
          }

          throw new Error(`SSE connection failed: ${response.status}`)
        },
        onmessage(ev) {
          try {
            const payload = JSON.parse(ev.data) as TasksPendingCount
            queryClient.setQueryData<TasksPendingCount>(PENDING_COUNT_QUERY_KEY, payload)
          } catch {
            // ignore malformed messages
          }
        },
        onerror(err) {
          if (controller.signal.aborted) {
            throw err
          }
        },
        openWhenHidden: true,
      })
    }

    const initialToken = getAccessToken()
    if (initialToken) {
      connect(initialToken)
    }

    return () => {
      controller.abort()
    }
  }, [isAuthenticated, queryClient])
}
