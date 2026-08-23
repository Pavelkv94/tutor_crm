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
import { RegionSelect } from '@/components/shared/RegionSelect'
import { DEFAULT_REGION } from '@/constants/regions'
import type { RegionCode } from '@/constants/regions'
import { teachersApi } from '@/api/teachers'
import { TeacherBillingDetailsFields } from '@/components/teachers/TeacherBillingDetailsFields'
import { hasBillingDetails, toBillingDetailsPayload } from '@/components/teachers/teacher-billing-utils'
import type { CreateTeacherInput, TeacherBillingDetailsInput } from '@/types'

interface CreateTeacherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CreateTeacherDialog = ({ open, onOpenChange }: CreateTeacherDialogProps) => {
  const [name, setName] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [timezone, setTimezone] = useState<RegionCode>(DEFAULT_REGION)
  const [billingDetails, setBillingDetails] = useState<TeacherBillingDetailsInput>({})
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: CreateTeacherInput) => teachersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      onOpenChange(false)
      setName('')
      setLogin('')
      setPassword('')
      setTimezone(DEFAULT_REGION)
      setBillingDetails({})
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
      billing_details: hasBillingDetails(billingDetails)
        ? toBillingDetailsPayload(billingDetails)
        : undefined,
    }

    createMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
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
                placeholder="Введите имя преподавателя"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="login">Логин</Label>
              <Input
                id="login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Введите логин"
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
                placeholder="Введите пароль"
                required
              />
            </div>
            <RegionSelect value={timezone} onValueChange={setTimezone} />
            <TeacherBillingDetailsFields
              idPrefix="create-teacher"
              value={billingDetails}
              onChange={setBillingDetails}
            />
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

