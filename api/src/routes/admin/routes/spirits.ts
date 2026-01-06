import * as schema from '@/db/schema'
import { generateSlug } from '@/utils/generateSlug'
import { spiritIdentityHash } from '@/utils/identityHashes'
import { spiritAgingContainerSchema, spiritSchema, spiritTypeSchema } from '@/validations/spiritValidations'
import { and, DrizzleQueryError, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { v7 as uuidv7 } from 'uuid'

type Bindings = {
    DB: D1Database
}

const route = new Hono<{ Bindings: Bindings }>()

// export spirits
// import spirits

route.post('/spirits', async(c) => {
    const db = drizzle(c.env.DB, { schema })

    let hashInserted = false
    let drinkInserted = false
    let spiritHash: string | null = null
    let drinkId: string | null = null
    let formatId: string | null = null

    try {
        const body = await c.req.json()

        const validation = spiritSchema.safeParse(body)
        if (!validation.success) {
            return c.json({ error: JSON.parse(validation.error.message) }, 400)
        }

        const data = validation.data
        spiritHash = await spiritIdentityHash(data)

        // TODO: 1. Reservar Identidad Unica, si falla -> duplicado
        await db.insert(schema.uniqueSpiritIdentities).values({ hash: spiritHash })

        // TODO: 2. Buscar si ya existe el drink + spirit
        const drinkExisting = await db.select({ drinkId: schema.drinks.id })
            .from(schema.drinks)
            .innerJoin(schema.spirits, eq(schema.spirits.drinkId, schema.drinks.id))
            .where(
                and(
                    eq(schema.drinks.name, data.name),
                    eq(schema.drinks.brandId, data.brandId),
                    eq(schema.drinks.alcoholByVolume, data.alcoholByVolume),
                    eq(schema.drinks.categoryId, data.categoryId),
                    eq(schema.spirits.spiritTypeId, data.spiritTypeId)
                )
            ).limit(1)

        if (drinkExisting.length > 0) {
            drinkId = drinkExisting[0].drinkId
        } else {
            // TODO: 3. Crear el drink
            drinkId = uuidv7()
            await db.insert(schema.drinks).values({
                id: drinkId,
                name: data.name,
                brandId: data.brandId,
                alcoholByVolume: data.alcoholByVolume,
                categoryId: data.categoryId,
                originId: data.originId,
            })
            drinkInserted = true

            // TODO: 4. Crear el spirit
            await db.insert(schema.spirits).values({
                drinkId: drinkId,
                spiritTypeId: data.spiritTypeId,
                agingContainerId: data.agingContainerId,
                agingTimeMonths: data.agingTimeMonths,
            })
        }

        // TODO: 5. Crear el formato
        formatId = uuidv7()
        await db.insert(schema.drinkFormats).values({
            id: formatId,
            drinkId: drinkId,
            packagingId: data.packagingId,
            volumeCc: data.volumeCc,
        })

        return c.json({
            hash: spiritHash,
            data: {
                drinkId: drinkId,
                formatId: formatId,
            }
        }, 201)
    } catch (error: any) {
        // TODO: Compensacion
        try {
            if (formatId) {
                await db.delete(schema.drinkFormats).where(eq(schema.drinkFormats.id, formatId))
            }

            if (drinkInserted && drinkId) {
                await db.delete(schema.spirits).where(eq(schema.spirits.drinkId, drinkId))
                await db.delete(schema.drinks).where(eq(schema.drinks.id, drinkId))
            }

            if (hashInserted && spiritHash) {
                await db.delete(schema.uniqueSpiritIdentities).where(eq(schema.uniqueSpiritIdentities.hash, spiritHash))
            }
        } catch (rollbackError) {
            console.error('Compensation failed', rollbackError)
        }

        if (error instanceof DrizzleQueryError && String(error.cause).includes('UNIQUE constraint failed')) {
            return c.json({ error: 'Spirit already exists' }, 409)
        }

        console.error('Unexpected server error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.post('/spirit-types', async(c) => {
    const db = drizzle(c.env.DB, { schema })

    try {
        const body = await c.req.json()

        const validation = spiritTypeSchema.safeParse(body)
        if (!validation.success) {
            return c.json({ error: JSON.parse(validation.error.message) }, 400)
        }

        const [spiritType] = await db.insert(schema.spiritTypes).values({
            id: generateSlug(body.name),
            ...validation.data,
        }).returning();

        return c.json({ data: spiritType }, 201)
    } catch (error: any) {
        if (error instanceof DrizzleQueryError) {
            const message = String(error.cause)

            if (message.includes('UNIQUE constraint failed')) {
                return c.json({ error: 'Spirit type already exists' }, 409)
            }
        }

        console.error('Unexpected server error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.post('/spirit-aging-containers', async(c) => {
    const db = drizzle(c.env.DB, { schema })

    try {
        const body = await c.req.json()

        const validation = spiritAgingContainerSchema.safeParse(body)
        if (!validation.success) {
            return c.json({ error: JSON.parse(validation.error.message) }, 400)
        }

        const [spiritAgingContainer] = await db.insert(schema.spiritAgingContainers).values({
            id: generateSlug(body.name),
            ...validation.data,
        }).returning();

        return c.json({ data: spiritAgingContainer }, 201)
    } catch (error: any) {
        if (error instanceof DrizzleQueryError) {
            const message = String(error.cause)

            if (message.includes('UNIQUE constraint failed')) {
                return c.json({ error: 'Spirit aging container already exists' }, 409)
            }
        }

        console.error('Unexpected server error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

export default route
