import * as schema from '@/db/schema'
import { D1Database } from '@cloudflare/workers-types'
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const route = new Hono<{ Bindings: Bindings }>()

route.get('/beers', async (c) => {
    try {
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
            data: beers.sort((a, b) => a.name.localeCompare(b.name))
        }, 200)
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

export default route