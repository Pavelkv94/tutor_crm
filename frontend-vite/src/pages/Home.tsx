import { useAuth } from '@/contexts/AuthContext'
import { NavCard } from '@/components/layout/NavCard'
import { getHomePageItems } from '@/constants/navigation'

export const Home = () => {
  const { user, isAdmin } = useAuth()
  const items = getHomePageItems(isAdmin)

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold">Главная</h1>
        {user?.name && (
          <p className="text-muted-foreground">Добро пожаловать, {user.name}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
        {items.map((item) => (
          <NavCard key={item.path} item={item} />
        ))}
      </div>
    </div>
  )
}
