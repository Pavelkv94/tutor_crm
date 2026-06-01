import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { REGIONS } from '@/constants/regions'
import type { RegionCode } from '@/constants/regions'

interface RegionSelectBaseProps {
  id?: string
  label?: string
  placeholder?: string
}

interface RequiredRegionSelectProps extends RegionSelectBaseProps {
  optional?: false
  value: RegionCode
  onValueChange: (value: RegionCode) => void
}

interface OptionalRegionSelectProps extends RegionSelectBaseProps {
  optional: true
  value: RegionCode | ''
  onValueChange: (value: RegionCode | '') => void
}

export type RegionSelectProps = RequiredRegionSelectProps | OptionalRegionSelectProps

export const RegionSelect = (props: RegionSelectProps) => {
  const {
    id = 'timezone',
    label = 'Регион',
    placeholder = props.optional ? 'Выберите регион (необязательно)' : undefined,
  } = props

  const selectValue = props.optional
    ? props.value || 'none'
    : props.value

  const handleValueChange = (value: string) => {
    if (props.optional) {
      props.onValueChange(value === 'none' ? '' : (value as RegionCode))
      return
    }
    props.onValueChange(value as RegionCode)
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={selectValue} onValueChange={handleValueChange}>
        <SelectTrigger id={id} aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {props.optional && <SelectItem value="none">Не выбрано</SelectItem>}
          {REGIONS.map((region) => (
            <SelectItem key={region.code} value={region.code}>
              <span className="flex items-center gap-2">
                <span>{region.label}</span>
                <span>{region.flag}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
