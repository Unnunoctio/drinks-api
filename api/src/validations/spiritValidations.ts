import { z } from 'zod'

export const spiritSchema = z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    brandId: z.string().min(1, { message: 'Brand ID is required' }),
    alcoholByVolume: z.number().min(0, { message: 'ABV must be greater than 0' }).max(100, { message: 'ABV must be less than 100' }),
    categoryId: z.string().min(1, { message: 'Category ID is required' }),
    originId: z.string().nullable().optional(),

    packagingId: z.string().min(1, { message: 'Packaging ID is required' }),
    volumeCc: z.number().min(0, { message: 'Volume must be greater than 0' }),

    spiritTypeId: z.string().min(1, { message: 'Spirit type ID is required' }),
    agingContainerId: z.string().min(1).nullable().optional(),
    agingTimeMonths: z.number().min(0, { message: 'Aging time must be greater than 0' }).nullable().optional(),
})

export const spiritTypeSchema = z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    description: z.string().nullable().optional(),
})

export const spiritAgingContainerSchema = z.object({
    name: z.string().min(1, { message: 'Name is required' }),
})
