import { useState, useEffect } from 'react'
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
import { toBillingDetailsPayload } from '@/components/teachers/teacher-billing-utils'
import type { UpdateTeacherInput, Teacher, TeacherBillingDetailsInput } from '@/types'

interface EditTeacherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher: Teacher | null
}

export const EditTeacherDialog = ({ open, onOpenChange, teacher }: EditTeacherDialogProps) => {
	const [name, setName] = useState('')
  const [timezone, setTimezone] = useState<RegionCode>(DEFAULT_REGION)
  const [birthDate, setBirthDate] = useState('')
  const [billingDetails, setBillingDetails] = useState<TeacherBillingDetailsInput>({})
  const queryClient = useQueryClient()

  useEffect(() => {
    if (teacher) {
      setName(teacher.name)
			// telegram_link is no longer in the Teacher type, but we still allow editing it
      setTimezone(teacher.timezone)
      setBirthDate(teacher.birth_date ? teacher.birth_date.split('T')[0] : '')
      setBillingDetails({
        full_name_latin: teacher.billing_details?.full_name_latin ?? '',
        address: teacher.billing_details?.address ?? '',
        passport: teacher.billing_details?.passport ?? '',
        email: teacher.billing_details?.email ?? '',
        bank_name: teacher.billing_details?.bank_name ?? '',
        bank_account: teacher.billing_details?.bank_account ?? '',
      })
    }
  }, [teacher])

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTeacherInput) => teachersApi.update(teacher!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      onOpenChange(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!teacher || !name) return

    const data: UpdateTeacherInput = {
			name,
      timezone,
      birth_date: birthDate ? new Date(birthDate).toISOString() : null,
      billing_details: toBillingDetailsPayload(billingDetails),
    }

    updateMutation.mutate(data)
  }

  if (!teacher) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать преподавателя</DialogTitle>
          <DialogDescription>Обновить информацию о преподавателе.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Имя</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите имя преподавателя"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-birthDate">Дата рождения</Label>
              <Input
                id="edit-birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                aria-label="Дата рождения"
              />
            </div>
            <RegionSelect id="edit-timezone" value={timezone} onValueChange={setTimezone} />
            <TeacherBillingDetailsFields
              idPrefix="edit-teacher"
              value={billingDetails}
              onChange={setBillingDetails}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Обновление...' : 'Обновить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

