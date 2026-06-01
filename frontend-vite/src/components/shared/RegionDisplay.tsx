import { getRegion } from '@/constants/regions'
import type { RegionCode } from '@/constants/regions'

interface RegionDisplayProps {
  region: RegionCode | string | null | undefined
}

export const RegionDisplay = ({ region }: RegionDisplayProps) => {
  if (!region) {
    return <>-</>
  }

  const regionInfo = getRegion(region)

  return (
    <div className="flex items-center gap-2">
      <span>{regionInfo?.label ?? region}</span>
      {regionInfo?.flag && <span>{regionInfo.flag}</span>}
    </div>
  )
}
