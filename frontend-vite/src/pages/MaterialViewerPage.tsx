import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { materialsApi } from '@/api/materials'

export const MaterialViewerPage = () => {
  const { materialId } = useParams<{ materialId: string }>()
  const [searchParams] = useSearchParams()
  const materialName = searchParams.get('name') ?? 'Материал'
  const parsedMaterialId = Number(materialId)

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['materials', parsedMaterialId, 'view-url'],
    queryFn: () => materialsApi.getViewUrl(parsedMaterialId),
    enabled: Number.isFinite(parsedMaterialId) && parsedMaterialId > 0,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })

  useEffect(() => {
    document.title = materialName
  }, [materialName])

  if (!Number.isFinite(parsedMaterialId) || parsedMaterialId <= 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-destructive">
        Некорректный идентификатор материала
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        Загрузка...
      </div>
    )
  }

  if (isError || !data?.url) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-destructive">
        Не удалось открыть материал
      </div>
    )
  }

  return (
    <iframe
      src={data.url}
      title={materialName}
      className="h-screen w-screen border-0"
    />
  )
}
