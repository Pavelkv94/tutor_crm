import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { MainLayout } from '@/components/layout/MainLayout'
import { Login } from '@/pages/Login'
import { Students } from '@/pages/Students'
import { Plans } from '@/pages/Plans'
import { Teachers } from '@/pages/Teachers'
import { Schedule } from '@/pages/Schedule'
import { Home } from '@/pages/Home'
import { Tasks } from '@/pages/Tasks'
import { Payments } from '@/pages/Payments'
import { Materials } from '@/pages/Materials'
import { CourseMaterials } from '@/pages/CourseMaterials'
import { MaterialViewerPage } from '@/pages/MaterialViewerPage'
import { Toaster } from '@/components/ui/sonner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/students"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Students />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/plans"
              element={
                <ProtectedRoute adminOnly>
                  <MainLayout>
                    <Plans />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers"
              element={
                <ProtectedRoute adminOnly>
                  <MainLayout>
                    <Teachers />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedRoute adminOnly>
                  <MainLayout>
                    <Payments />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Tasks />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/materials"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Materials />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/materials/view/:materialId"
              element={
                <ProtectedRoute>
                  <MaterialViewerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/materials/:courseId"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <CourseMaterials />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedule"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Schedule />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Home />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
