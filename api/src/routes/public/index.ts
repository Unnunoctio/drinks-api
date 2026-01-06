import beerRoutes from '@/routes/public/routes/beers'
import catalogRoutes from '@/routes/public/routes/catalogs'
import spiritRoutes from '@/routes/public/routes/spirits'
import { Hono } from 'hono'


const router = new Hono()

router.get('/', (c) => {
    return c.json({
        enpoints: {
            beers: {
                beer: '/beers/:id',
                beers: '/beers',
                beerStyle: '/beer-styles/:id',
                beerStyles: '/beer-styles',
            },
            catalogs: {
                countries: '/countries',
                origins: '/origins',
                brands: '/brands',
                categories: '/categories',
                packaging: '/packaging'
            }
        }
    }, 200)
})

// Wines
// Stats
router.route('', beerRoutes)
router.route('', spiritRoutes)
router.route('', catalogRoutes)

export default router
