import client from './client'
import {
  AdditiveReferenceItem,
  ComparisonResult,
  ProductAnalysisResult,
  UserProfileData,
} from '../types/food'

export async function scanBarcode(
  barcode: string,
  age?: number | null,
  weightKg?: number | null,
  healthConditions?: string[] | null,
): Promise<ProductAnalysisResult> {
  const response = await client.post<ProductAnalysisResult>('/scan/barcode/', {
    barcode,
    age,
    weight_kg: weightKg,
    health_conditions: healthConditions,
  })
  return response.data
}

export async function scanText(payload: {
  product_name?: string
  ingredients_text: string
  nutriments?: Record<string, any>
  serving_size?: string
  product_weight_g?: number
  age?: number | null
  weight_kg?: number | null
  health_conditions?: string[] | null
}): Promise<ProductAnalysisResult> {
  const response = await client.post<ProductAnalysisResult>('/scan/text/', payload)
  return response.data
}

export async function scanOCR(imageFile: File): Promise<{ text: string }> {
  const formData = new FormData()
  formData.append('image', imageFile)
  const response = await client.post<{ text: string }>('/scan/ocr/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export async function getSampleProducts(
  age?: number | null,
  weightKg?: number | null,
  healthConditions?: string[] | null,
): Promise<ProductAnalysisResult[]> {
  const params: Record<string, any> = {}
  if (age) params.age = age
  if (weightKg) params.weight_kg = weightKg
  if (healthConditions && healthConditions.length > 0) {
    params.health_conditions = healthConditions.join(',')
  }
  const response = await client.get<ProductAnalysisResult[]>('/products/sample/', { params })
  return response.data
}

export async function getProductDetail(
  idOrBarcode: string,
  age?: number | null,
  weightKg?: number | null,
  healthConditions?: string[] | null,
): Promise<ProductAnalysisResult> {
  const params: Record<string, any> = {}
  if (age) params.age = age
  if (weightKg) params.weight_kg = weightKg
  if (healthConditions && healthConditions.length > 0) {
    params.health_conditions = healthConditions.join(',')
  }
  const response = await client.get<ProductAnalysisResult>(`/products/${idOrBarcode}/`, { params })
  return response.data
}

export async function compareProducts(
  barcode1: string,
  barcode2: string,
): Promise<ComparisonResult> {
  const response = await client.post<ComparisonResult>('/products/compare/', {
    barcode_1: barcode1,
    barcode_2: barcode2,
  })
  return response.data
}

export async function getAdditives(query?: string): Promise<AdditiveReferenceItem[]> {
  const response = await client.get<AdditiveReferenceItem[]>('/additives/', {
    params: query ? { q: query } : {},
  })
  return response.data
}

export async function getAdditiveDetail(
  codeOrId: string,
  weightKg?: number | null,
): Promise<AdditiveReferenceItem> {
  const params: Record<string, any> = {}
  if (weightKg) params.weight_kg = weightKg
  const response = await client.get<AdditiveReferenceItem>(`/additives/${codeOrId}/`, { params })
  return response.data
}

export async function getScanHistory(): Promise<any[]> {
  const response = await client.get<any[]>('/scans/')
  return response.data
}

export async function deleteScan(id: number): Promise<void> {
  await client.delete(`/scans/${id}/`)
}

export async function getUserProfile(): Promise<UserProfileData> {
  const response = await client.get<UserProfileData>('/users/profile/')
  return response.data
}

export async function updateUserProfile(profile: UserProfileData): Promise<UserProfileData> {
  const response = await client.put<UserProfileData>('/users/profile/', profile)
  return response.data
}

export interface CatalogProductItem {
  id: number
  barcode: string
  product_name: string
  brands: string
  serving_size: string
  product_weight_g: number | null
  categories_tags: string[]
  sugars_100g: number
  salt_100g: number
  fat_100g: number
  proteins_100g: number
  has_palm_oil: boolean
}

export async function searchProducts(filters: {
  q?: string
  brand?: string
  category?: string
  palm_oil_free?: boolean
  low_sugar?: boolean
  low_salt?: boolean
}): Promise<CatalogProductItem[]> {
  const params: Record<string, any> = {}
  if (filters.q) params.q = filters.q
  if (filters.brand) params.brand = filters.brand
  if (filters.category) params.category = filters.category
  if (filters.palm_oil_free) params.palm_oil_free = 'true'
  if (filters.low_sugar) params.low_sugar = 'true'
  if (filters.low_salt) params.low_salt = 'true'

  const response = await client.get<CatalogProductItem[]>('/products/search/', { params })
  return response.data
}
