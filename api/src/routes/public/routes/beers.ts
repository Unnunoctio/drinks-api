import * as schema from '@/db/schema'
import { D1Database } from '@cloudflare/workers-types'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const route = new Hono<{ Bindings: Bindings }>()

route.get('/beers', async (c) => {
    try {
        const db = drizzle(c.env.DB, { schema })
        const beers = await db.select({
            id: schema.drinks.id,
            name: schema.drinks.name,
            brand: schema.brands.name,
            abv: schema.drinks.alcoholByVolume,
            style: schema.beerStyles.name,
            ibu: schema.beers.ibu,
            servingTempMinC: schema.beers.servingTempMinC,
            servingTempMaxC: schema.beers.servingTempMaxC,
            country: schema.countries.name,
            region: schema.origins.region,
        })
            .from(schema.drinks)
            .innerJoin(schema.brands, eq(schema.drinks.brandId, schema.brands.id))
            .innerJoin(schema.beers, eq(schema.drinks.id, schema.beers.drinkId))
            .innerJoin(schema.beerStyles, eq(schema.beers.beerStyleId, schema.beerStyles.id))
            .innerJoin(schema.origins, eq(schema.drinks.originId, schema.origins.id))
            .innerJoin(schema.countries, eq(schema.origins.countryId, schema.countries.id))
            .orderBy(schema.drinks.name);

        return c.json({
            data: beers
        }, 200)
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

export default route