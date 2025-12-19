import { z } from 'zod'

export const countrySchema = z.object({
    id: z.string().min(1, { message: 'ID is required' }),
    name: z.string().min(1, { message: 'Name is required' }),
    isoCode: z.string().min(1, { message: 'ISO code is required' }),
})

export const originSchema = z.object({
    id: z.string().min(1, { message: 'ID is required' }),
    countryId: z.string().min(1, { message: 'Country ID is required' }),
    region: z.string().min(1).optional()
})

export const brandSchema = z.object({
    id: z.string().min(1, { message: 'ID is required' }),
    name: z.string().min(1, { message: 'Name is required' }),
    originId: z.string().min(1, { message: 'Origin ID is required' }),
    website: z.string().min(1, { message: 'Website is required' }),
})

export const categorySchema = z.object({
    id: z.string().min(1, { message: 'ID is required' }),
    name: z.string().min(1, { message: 'Name is required' })
})

export const packagingSchema = z.object({
    id: z.string().min(1, { message: 'ID is required' }),
    name: z.string().min(1, { message: 'Name is required' })
})