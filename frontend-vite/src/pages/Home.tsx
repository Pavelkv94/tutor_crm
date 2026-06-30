import { useAuth } from '@/contexts/AuthContext'
import { NavCard } from '@/components/layout/NavCard'
import { getHomePageItems } from '@/constants/navigation'

export const Home = () => {
  const { user, isAdmin } = useAuth()
  const items = getHomePageItems(isAdmin)

  return (
    <div className="animate-screen-enter space-y-8">
      {/* Header block */}
      <div className="flex items-center gap-6">
        <img
          src="/logo.png"
          alt="English Stars"
          className="h-24 w-24 flex-shrink-0 rounded-full object-cover"
          style={{ boxShadow: '0 8px 26px rgba(75,46,170,0.3), 0 0 0 4px hsl(254 75% 92%)' }}
        />
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: 'hsl(250 40% 14%)', letterSpacing: '-0.025em' }}>
            Главная
          </h1>
          {user?.name && (
            <p className="mt-2 text-base text-muted-foreground">
              Добро пожаловать,{' '}
              <b style={{ color: '#4b2eaa' }}>{user.name}</b>
            </p>
          )}
        </div>
      </div>

      {/* Nav cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <NavCard key={item.path} item={item} />
        ))}
      </div>
    </div>
  )
}
