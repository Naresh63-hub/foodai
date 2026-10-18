import { describe, it, expect, vi, beforeEach } from 'vitest'
import client, { aiClient } from '../api/client'
import {
  scanBarcode,
  scanText,
  analyzeFoodNutrition,
  analyzeFoodPhoto,
  getSampleProducts,
  searchProducts,
} from '../api/food'

describe('API Routing & Client Separation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('client and aiClient have distinct base URLs for Django vs Express AI', () => {
    expect(client.defaults.baseURL).toContain('/api')
    expect(aiClient.defaults.baseURL).toContain('/api/ai')
  })

  it('scanBarcode routes to Django client on /scan/barcode/', async () => {
    const postSpy = vi.spyOn(client, 'post').mockResolvedValueOnce({
      data: { product: { barcode: '123', product_name: 'Test Product' } },
    } as any)

    await scanBarcode('123', 25, 70, ['diabetes'])

    expect(postSpy).toHaveBeenCalledTimes(1)
    expect(postSpy).toHaveBeenCalledWith(
      '/scan/barcode/',
      expect.objectContaining({
        barcode: '123',
        age: 25,
        weight_kg: 70,
        health_conditions: ['diabetes'],
      })
    )
  })

  it('scanText routes to Django client on /scan/text/', async () => {
    const postSpy = vi.spyOn(client, 'post').mockResolvedValueOnce({
      data: { product: { product_name: 'Custom' } },
    } as any)

    await scanText({ ingredients_text: 'Wheat, sugar, salt' })

    expect(postSpy).toHaveBeenCalledTimes(1)
    expect(postSpy).toHaveBeenCalledWith(
      '/scan/text/',
      expect.objectContaining({
        ingredients_text: 'Wheat, sugar, salt',
      })
    )
  })

  it('getSampleProducts routes to Django client on /products/sample/', async () => {
    const getSpy = vi.spyOn(client, 'get').mockResolvedValueOnce({
      data: [],
    } as any)

    await getSampleProducts()

    expect(getSpy).toHaveBeenCalledTimes(1)
    expect(getSpy).toHaveBeenCalledWith('/products/sample/', expect.any(Object))
  })

  it('searchProducts routes to Django client on /products/search/', async () => {
    const getSpy = vi.spyOn(client, 'get').mockResolvedValueOnce({
      data: [],
    } as any)

    await searchProducts({ q: 'biscuit' })

    expect(getSpy).toHaveBeenCalledTimes(1)
    expect(getSpy).toHaveBeenCalledWith(
      '/products/search/',
      expect.objectContaining({ params: expect.objectContaining({ q: 'biscuit' }) })
    )
  })

  it('analyzeFoodNutrition routes to Express aiClient on /nutrition-analyze', async () => {
    const aiPostSpy = vi.spyOn(aiClient, 'post').mockResolvedValueOnce({
      data: { food_name: 'Oatmeal', calories_kcal: 150 },
    } as any)

    await analyzeFoodNutrition({ food_query: 'Bowl of oatmeal' })

    expect(aiPostSpy).toHaveBeenCalledTimes(1)
    expect(aiPostSpy).toHaveBeenCalledWith(
      '/nutrition-analyze',
      expect.objectContaining({ food_query: 'Bowl of oatmeal' })
    )
  })

  it('analyzeFoodPhoto routes to Express aiClient on /food-vision-analyze', async () => {
    const aiPostSpy = vi.spyOn(aiClient, 'post').mockResolvedValueOnce({
      data: { food_name: 'Grilled Salmon', calories_kcal: 400 },
    } as any)

    await analyzeFoodPhoto({ image_base64: 'data:image/jpeg;base64,mock' })

    expect(aiPostSpy).toHaveBeenCalledTimes(1)
    expect(aiPostSpy).toHaveBeenCalledWith(
      '/food-vision-analyze',
      expect.objectContaining({ image_base64: 'data:image/jpeg;base64,mock' })
    )
  })
})
