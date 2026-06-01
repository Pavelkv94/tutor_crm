export const REGION_CODES = ['BY', 'PL', 'KZ', 'GE', 'RU', 'EU'] as const

export type RegionCode = (typeof REGION_CODES)[number]

export const DEFAULT_REGION: RegionCode = 'BY'

export const REGIONS: ReadonlyArray<{ code: RegionCode; flag: string; label: string }> = [
  { code: 'BY', flag: '🇧🇾', label: 'Беларусь' },
  { code: 'PL', flag: '🇵🇱', label: 'Польша' },
  { code: 'KZ', flag: '🇰🇿', label: 'Казахстан' },
  { code: 'GE', flag: '🇬🇪', label: 'Грузия' },
  { code: 'RU', flag: '🇷🇺', label: 'Россия' },
  { code: 'EU', flag: '🇪🇺', label: 'Европа' },
] as const

export const getRegion = (code: string | null | undefined) => {
  return REGIONS.find((region) => region.code === code)
}

export const getRegionFlag = (code: string | null | undefined): string | undefined => {
  return getRegion(code)?.flag
}

export const getRegionLabel = (code: string | null | undefined): string | undefined => {
  return getRegion(code)?.label
}
