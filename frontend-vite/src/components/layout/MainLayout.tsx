import { Sidebar } from './Sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container mx-auto p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  )
}

