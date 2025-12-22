import beerRoutes from '@/routes/public/routes/beers'
import { Hono } from 'hono'


const router = new Hono()

router.get('/', (c) => {
    return c.json({
        enpoints: {
            beers: '/v1/public/beers'
        }
    })
})

// Catalog
// Spirits
// Wines
// Stats
router.route('', beerRoutes)

export default router