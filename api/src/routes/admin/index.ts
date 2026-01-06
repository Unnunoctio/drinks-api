import beerRoutes from '@/routes/admin/routes/beers'
import catalogRoutes from '@/routes/admin/routes/catalogs'
import spiritRoutes from '@/routes/admin/routes/spirits'
import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'

const router = new Hono()

// TODO: Middleware api authentication
router.use('*', bearerAuth({
    verifyToken: async (token, c) => {
        return token === c.env.ADMIN_API_KEY
    }
}))

router.get('/', (c) => {
    return c.json({
        message: 'Admin endpoint'
    })
})

router.route('', beerRoutes)
router.route('', spiritRoutes)
router.route('', catalogRoutes)

export default router
