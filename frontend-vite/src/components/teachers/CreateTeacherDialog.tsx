import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { teachersApi } from '@/api/teachers'
import type { CreateTeacherInput } from '@/types'

interface CreateTeacherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CreateTeacherDialog = ({ open, onOpenChange }: CreateTeacherDialogProps) => {
  const [name, setName] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [timezone, setTimezone] = useState<'BY' | 'PL'>('BY')
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: CreateTeacherInput) => teachersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      onOpenChange(false)
      setName('')
      setLogin('')
      setPassword('')
      setTimezone('BY')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !login || !password) return

    const data: CreateTeacherInput = {
      name,
      login,
      password,
      timezone,
    }

    createMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Создать преподавателя</DialogTitle>
          <DialogDescription>Добавить нового преподавателя в систему.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="login">Логин</Label>
              <Input
                id="login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Часовой пояс</Label>
              <Select value={timezone} onValueChange={(value: 'BY' | 'PL') => setTimezone(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BY">BY</SelectItem>
                  <SelectItem value="PL">PL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

