import { Sidebar } from './Sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useTasksPendingCountStream } from '@/hooks/useTasksPendingCountStream'

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  useTasksPendingCountStream()

  return (
    <TooltipProvider>
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 min-w-0 flex-col overflow-hidden bg-background">
        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-8 py-8 pb-16">
            {children}
          </div>
        </main>
      </div>
    </div>
    </TooltipProvider>
  )
}
