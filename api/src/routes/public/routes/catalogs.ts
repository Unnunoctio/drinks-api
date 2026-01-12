import * as schema from '@/db/schema'
import { parseQuery } from '@/utils/parseQuery'
import { paginationSchema } from '@/validations/paginationValidations'
import { D1Database } from '@cloudflare/workers-types'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const route = new Hono<{ Bindings: Bindings }>()

route.get('/countries', async (c) => {
    try {
        const query = parseQuery(c.req.query())
        const pagination = paginationSchema.safeParse(query)
        if (pagination.error !== undefined) return c.json({ error: JSON.parse(pagination.error.message) }, 400)

        const { page, limit } = pagination.data
        const offset = (page - 1) * limit

        const db = drizzle(c.env.DB, { schema })
        const countries = await db.select().from(schema.countries).orderBy(schema.countries.name)

        return c.json(
            {
                pagination: { page, limit, totalPages: Math.ceil(countries.length / limit) },
                data: countries.slice(offset, offset + limit),
            },
            200
        )
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.get('/origins', async (c) => {
    try {
        const query = parseQuery(c.req.query())
        const pagination = paginationSchema.safeParse(query)
        if (pagination.error !== undefined) return c.json({ error: JSON.parse(pagination.error.message) }, 400)

        const { page, limit } = pagination.data
        const offset = (page - 1) * limit

        const db = drizzle(c.env.DB, { schema })
        const origins = await db
            .select({
                id: schema.origins.id,
                country: schema.countries.name,
                region: schema.origins.region,
            })
            .from(schema.origins)
            .innerJoin(schema.countries, eq(schema.origins.countryId, schema.countries.id))
            .orderBy(schema.countries.name, schema.origins.region)

        return c.json(
            {
                pagination: { page, limit, totalPages: Math.ceil(origins.length / limit) },
                data: origins.slice(offset, offset + limit),
            },
            200
        )
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.get('/brands', async (c) => {
    try {
        const query = parseQuery(c.req.query())
        const pagination = paginationSchema.safeParse(query)
        if (pagination.error !== undefined) return c.json({ error: JSON.parse(pagination.error.message) }, 400)

        const { page, limit } = pagination.data
        const offset = (page - 1) * limit

        const db = drizzle(c.env.DB, { schema })
        const brands = await db
            .select({
                id: schema.brands.id,
                name: schema.brands.name,
                country: schema.countries.name,
                region: schema.origins.region,
                website: schema.brands.website,
            })
            .from(schema.brands)
            .innerJoin(schema.origins, eq(schema.brands.originId, schema.origins.id))
            .innerJoin(schema.countries, eq(schema.origins.countryId, schema.countries.id))
            .orderBy(schema.brands.name)

        return c.json(
            {
                pagination: { page, limit, totalPages: Math.ceil(brands.length / limit) },
                data: brands.slice(offset, offset + limit),
            },
            200
        )
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.get('/categories', async (c) => {
    try {
        const query = parseQuery(c.req.query())
        const pagination = paginationSchema.safeParse(query)
        if (pagination.error !== undefined) return c.json({ error: JSON.parse(pagination.error.message) }, 400)

        const { page, limit } = pagination.data
        const offset = (page - 1) * limit

        const db = drizzle(c.env.DB, { schema })
        const categories = await db.select().from(schema.categories).orderBy(schema.categories.name)

        return c.json(
            {
                pagination: { page, limit, totalPages: Math.ceil(categories.length / limit) },
                data: categories.slice(offset, offset + limit),
            },
            200
        )
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.get('/packaging', async (c) => {
    try {
        const query = parseQuery(c.req.query())
        const pagination = paginationSchema.safeParse(query)
        if (pagination.error !== undefined) return c.json({ error: JSON.parse(pagination.error.message) }, 400)

        const { page, limit } = pagination.data
        const offset = (page - 1) * limit

        const db = drizzle(c.env.DB, { schema })
        const packaging = await db.select().from(schema.packaging).orderBy(schema.packaging.name)

        return c.json(
            {
                pagination: { page, limit, totalPages: Math.ceil(packaging.length / limit) },
                data: packaging.slice(offset, offset + limit),
            },
            200
        )
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

export default route
