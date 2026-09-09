import { apiClient } from '@/shared/lib/api-client'
import type { ApiResponse } from '@/shared/types'
export interface ThemeInput {
  name: string
  font_config: {
    name: string
    fillColor?: string
    weight?: 'regular' | 'medium' | 'semibold' | 'bold'
    italic?: boolean
    underline?: boolean
  }
  corner_config: {
    type: 'sharp' | 'curved' | 'round'
    fillColor?: string
    strokeColor?: string | null
    opacity?: number
    shadow?: 'none' | 'soft' | 'hard'
  }
  wallpaper_config: {
    type: 'fill' | 'solid' | 'gradient' | 'image'
    image?: string
    backgroundColor?: string | { color: string; amount: number }[]
  }
}
export interface Theme extends Omit<
  ThemeInput,
  'font_config' | 'corner_config' | 'wallpaper_config'
> {
  id: string
  active: boolean
  createdAt: string
  font_config: Partial<ThemeInput['font_config']> | null
  corner_config: Partial<ThemeInput['corner_config']> | null
  wallpaper_config: Partial<ThemeInput['wallpaper_config']> | null
}
export async function listThemes(signal?: AbortSignal) {
  const { data } = await apiClient.get<ApiResponse<Theme[]>>('/themes', {
    signal,
  })
  return data.data
}
export async function createTheme(body: ThemeInput) {
  const { data } = await apiClient.post<ApiResponse<Theme>>('/themes', body)
  return data.data
}

export async function getTheme(id: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<ApiResponse<Theme>>(`/themes/${id}`, {
    signal,
  })
  return data.data
}
export async function updateTheme(id: string, body: ThemeInput) {
  const { data } = await apiClient.patch<ApiResponse<Theme>>(
    `/themes/${id}`,
    body,
  )
  return data.data
}
export async function deleteTheme(id: string) {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/themes/${id}`)
  return data.data
}
