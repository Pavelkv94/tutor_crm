import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BILLING_DETAILS_FIELDS } from '@/components/teachers/teacher-billing-utils'
import type { TeacherBillingDetailsInput } from '@/types'

interface TeacherBillingDetailsFieldsProps {
  idPrefix: string
  value: TeacherBillingDetailsInput
  onChange: (value: TeacherBillingDetailsInput) => void
}

/**
 * Реквизиты преподавателя для счёта (rachunek). Одна форма на создание и на
 * редактирование — поля бланка одинаковые.
 */
export const TeacherBillingDetailsFields = ({
  idPrefix,
  value,
  onChange,
}: TeacherBillingDetailsFieldsProps) => (
  <div className="grid gap-3 rounded-md border p-3">
    <div>
      <p className="text-sm font-medium">Реквизиты для счетов</p>
      <p className="text-xs text-muted-foreground">
        Попадают в счёт, который преподаватель выставляет школе.
      </p>
    </div>
    {BILLING_DETAILS_FIELDS.map((field) => (
      <div key={field.key} className="grid gap-2">
        <Label htmlFor={`${idPrefix}-${field.key}`}>{field.label}</Label>
        <Input
          id={`${idPrefix}-${field.key}`}
          value={value[field.key] ?? ''}
          onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
          placeholder={field.placeholder}
        />
      </div>
    ))}
  </div>
)
