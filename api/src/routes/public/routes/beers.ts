import * as schema from '@/db/schema'
import { parseQuery } from '@/utils/parseQuery'
import { paginationSchema } from '@/validations/paginationValidations'
import { D1Database } from '@cloudflare/workers-types'
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { alias } from 'drizzle-orm/sqlite-core'
import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const route = new Hono<{ Bindings: Bindings }>()

route.get('/beers', async (c) => {
    try {
        const query = parseQuery(c.req.query())
        const pagination = paginationSchema.safeParse(query)
        if (pagination.error !== undefined) return c.json({ error: JSON.parse(pagination.error.message) }, 400)

        const { page, limit } = pagination.data
        const offset = (page - 1) * limit

        const db = drizzle(c.env.DB, { schema })
        const beers = await db
        .select({
            id: schema.beers.drinkId,
            name: schema.drinks.name,
            brand: schema.brands.name,
            abv: schema.drinks.alcoholByVolume,
            packaging: schema.packaging.name,
            volume: schema.drinkFormats.volumeCc,
            style: schema.beerStyles.name,
            ibu: schema.beers.ibu,
            servingTempMinC: schema.beers.servingTempMinC,
            servingTempMaxC: schema.beers.servingTempMaxC,
            country: schema.countries.name,
            region: schema.origins.region,
        })
            .from(schema.beers)
            .innerJoin(schema.drinks, eq(schema.beers.drinkId, schema.drinks.id))
            .innerJoin(schema.brands, eq(schema.drinks.brandId, schema.brands.id))
            .innerJoin(schema.drinkFormats, eq(schema.drinks.id, schema.drinkFormats.drinkId))
            .innerJoin(schema.packaging, eq(schema.drinkFormats.packagingId, schema.packaging.id))
            .innerJoin(schema.beerStyles, eq(schema.beers.beerStyleId, schema.beerStyles.id))
            // Origen efectivo del drink (prioriza drinks.origin_id)
            .leftJoin(
                schema.origins,
                eq(schema.origins.id, sql`COALESCE(${schema.drinks.originId}, ${schema.brands.originId})`)
            )
            .leftJoin(
                schema.countries,
                eq(schema.origins.countryId, schema.countries.id)
            );

        return c.json({
            pagination: { page, limit, totalPages: Math.ceil(beers.length / limit) },
            data: beers.sort((a, b) => a.name.localeCompare(b.name)).slice(offset, offset + limit)
        }, 200)
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.get('/beers/:id', async (c) => {
    try {
        const id = c.req.param('id')

        const db = drizzle(c.env.DB, { schema })
        const beers = await db
        .select({
            id: schema.beers.drinkId,
            name: schema.drinks.name,
            brand: schema.brands.name,
            abv: schema.drinks.alcoholByVolume,
            packaging: schema.packaging.name,
            volume: schema.drinkFormats.volumeCc,
            style: schema.beerStyles.name,
            ibu: schema.beers.ibu,
            servingTempMinC: schema.beers.servingTempMinC,
            servingTempMaxC: schema.beers.servingTempMaxC,
            country: schema.countries.name,
            region: schema.origins.region,
        })
            .from(schema.beers)
            .innerJoin(schema.drinks, eq(schema.beers.drinkId, schema.drinks.id))
            .innerJoin(schema.brands, eq(schema.drinks.brandId, schema.brands.id))
            .innerJoin(schema.drinkFormats, eq(schema.drinks.id, schema.drinkFormats.drinkId))
            .innerJoin(schema.packaging, eq(schema.drinkFormats.packagingId, schema.packaging.id))
            .innerJoin(schema.beerStyles, eq(schema.beers.beerStyleId, schema.beerStyles.id))
            // Origen efectivo del drink (prioriza drinks.origin_id)
            .leftJoin(
                schema.origins,
                eq(schema.origins.id, sql`COALESCE(${schema.drinks.originId}, ${schema.brands.originId})`)
            )
            .leftJoin(
                schema.countries,
                eq(schema.origins.countryId, schema.countries.id)
            )
            .where(eq(schema.beers.drinkId, id))
            .limit(1);
        
        if (beers.length === 0) {
            return c.json({ error: 'Beer not found' }, 404)
        }

        return c.json({ data: beers[0] }, 200)
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.get('/beer-styles', async (c) => {
    try {
        const query = parseQuery(c.req.query())
        const pagination = paginationSchema.safeParse(query)
        if (pagination.error !== undefined) return c.json({ error: JSON.parse(pagination.error.message) }, 400)

        const { page, limit } = pagination.data
        const offset = (page - 1) * limit

        const db = drizzle(c.env.DB, { schema })
        const parentStylesAlias = alias(schema.beerStyles, 'parentStyle')
        const beerStyles = await db
            .select({
                id: schema.beerStyles.id,
                name: schema.beerStyles.name,
                description: schema.beerStyles.description,
                country: schema.countries.name,
                region: schema.origins.region,
                parentStyle: parentStylesAlias.name
            })
            .from(schema.beerStyles)
            .innerJoin(schema.origins, eq(schema.beerStyles.originId, schema.origins.id))
            .innerJoin(schema.countries, eq(schema.origins.countryId, schema.countries.id))
            .leftJoin(parentStylesAlias, eq(schema.beerStyles.parentStyleId, parentStylesAlias.id))
            .orderBy(schema.beerStyles.parentStyleId, schema.beerStyles.name);

        return c.json({
            pagination: { page, limit, totalPages: Math.ceil(beerStyles.length / limit) },
            data: beerStyles.slice(offset, offset + limit)
        }, 200)
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.get('/beer-styles/:id', async (c) => {
    try {
        const id = c.req.param('id')

        const db = drizzle(c.env.DB, { schema })
        const parentStylesAlias = alias(schema.beerStyles, 'parentStyle')
        const beerStyles = await db
            .select({
                id: schema.beerStyles.id,
                name: schema.beerStyles.name,
                description: schema.beerStyles.description,
                country: schema.countries.name,
                region: schema.origins.region,
                parentStyle: parentStylesAlias.name
            })
            .from(schema.beerStyles)
            .innerJoin(schema.origins, eq(schema.beerStyles.originId, schema.origins.id))
            .innerJoin(schema.countries, eq(schema.origins.countryId, schema.countries.id))
            .leftJoin(parentStylesAlias, eq(schema.beerStyles.parentStyleId, parentStylesAlias.id))
            .where(eq(schema.beerStyles.id, id))
            .limit(1);

        if (beerStyles.length === 0) {
            return c.json({ error: 'Beer Style not found' }, 404)
        }

        return c.json({
            data: beerStyles[0]
        }, 200)
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

export default route