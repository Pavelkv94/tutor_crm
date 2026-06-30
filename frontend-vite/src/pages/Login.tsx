import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export const Login = () => {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { login: handleLogin } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await handleLogin({ login, password })
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string | string[] } } }
        const message = axiosError.response?.data?.message
        if (Array.isArray(message)) {
          setError(message.join(', '))
        } else if (typeof message === 'string') {
          setError(message)
        } else {
          setError('Неверный логин или пароль')
        }
      } else {
        setError('Произошла ошибка. Пожалуйста, попробуйте снова.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #5634c4 0%, #421ca8 100%)' }}
    >
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <img
          src="/logo.png"
          alt="English Stars"
          className="h-20 w-20 rounded-full object-cover shadow-2xl"
          style={{ border: '2px solid rgba(255,255,255,0.2)' }}
        />
        <div className="text-center">
          <p className="text-xl font-extrabold tracking-tight text-white" style={{ letterSpacing: '-0.02em' }}>
            English Stars
          </p>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.14em' }}>
            School CRM
          </p>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-2xl" style={{ borderRadius: '1.25rem' }}>
        <CardHeader className="pb-2 pt-7 px-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-center text-foreground" style={{ letterSpacing: '-0.02em' }}>
            Добро пожаловать
          </h1>
          <p className="text-center text-sm text-muted-foreground mt-1">
            Войдите в свой аккаунт, чтобы продолжить
          </p>
        </CardHeader>
        <CardContent className="px-8 pb-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login" className="font-bold text-sm">Логин</Label>
              <Input
                id="login"
                type="text"
                placeholder="Введите логин"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold text-sm">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full font-bold text-sm h-11 mt-2" disabled={isLoading}>
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
