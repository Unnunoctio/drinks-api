import * as schema from '@/db/schema'
import { generateSlug } from '@/utils/generateSlug'
import { beerStyleSchema } from '@/validations/beerValidations'
import { brandSchema, categorySchema, countrySchema, originSchema, packagingSchema } from '@/validations/catalogValidations'
import { D1Database } from "@cloudflare/workers-types"
import { DrizzleQueryError, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/d1"
import { Hono } from "hono"
import * as XLSX from 'xlsx'

type Bindings = {
    DB: D1Database
}

const route = new Hono<{ Bindings: Bindings }>()

route.get('/export-catalog', async (c) => {
    const db = drizzle(c.env.DB, { schema })

    try {
        // TODO: Export Countries, Origins, Brands, Categories, Packaging, Beer-Styles
        const catalogData = [
            {
                sheet: 'Countries',
                data: await db.select().from(schema.countries).orderBy(schema.countries.name)
            },
            {
                sheet: 'Origins',
                data: await db.select().from(schema.origins).orderBy(schema.origins.countryId, schema.origins.region)
            },
            {
                sheet: 'Brands',
                data: await db.select().from(schema.brands).orderBy(schema.brands.name)
            },
            {
                sheet: 'Categories',
                data: await db.select().from(schema.categories).orderBy(schema.categories.name)
            },
            {
                sheet: 'Packaging',
                data: await db.select().from(schema.packaging).orderBy(schema.packaging.name)
            },
            {
                sheet: 'Beer-Styles',
                data: await db.select().from(schema.beerStyles).orderBy(schema.beerStyles.parentStyleId, schema.beerStyles.name)
            }
        ]

        const workbook = XLSX.utils.book_new()

        for (const d of catalogData) {
            const worksheet = XLSX.utils.json_to_sheet(d.data)
            XLSX.utils.book_append_sheet(workbook, worksheet, d.sheet)
        }

        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

        c.res.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        c.res.headers.set('Content-Disposition', 'attachment; filename=CATALOG.xlsx')

        return c.body(buffer)
    } catch (error: any) {
        console.error('Unexpected server error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.post('/import-catalog', async (c) => {
    const db = drizzle(c.env.DB, { schema })

    try {
        const body = await c.req.parseBody()
        const file = body.file
        if (!file || !(file instanceof File)) return c.json({ error: 'File not provided' }, 400)

        const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
        if (['.xlsx', '.xls'].includes(extension) === false) return c.json({ error: 'File must be an Excel file' }, 400)

        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true, raw: false })
        const sheetNames = workbook.SheetNames

        const errors: Array<{ sheet: string, row: number, error: unknown }> = []

        const config_sheets = [
            {
                sheet: 'Countries',
                getSlug: (data: any) => generateSlug(data.isoCode),
                schemaValidation: countrySchema,
                dbTable: schema.countries,
                set: { name: sql`excluded.name`, isoCode: sql`excluded.iso_code` }
            },
            {
                sheet: 'Origins',
                getSlug: (data: any) => generateSlug(`${data.countryId}-${(data.region === '' || data.region === undefined || data.region === null) ? 'none' : data.region}`),
                schemaValidation: originSchema,
                dbTable: schema.origins,
                set: { countryId: sql`excluded.country_id`, region: sql`excluded.region` },
                references: [
                    {
                        field: 'countryId',
                        idFieldDB: schema.countries.id,
                        tableDB: schema.countries,
                        values: <{ id: string }[]>[]
                    }
                ]
            },
            {
                sheet: 'Brands',
                getSlug: (data: any) => generateSlug(data.name),
                schemaValidation: brandSchema,
                dbTable: schema.brands,
                set: { name: sql`excluded.name`, originId: sql`excluded.origin_id`, website: sql`excluded.website` },
                references: [
                    {
                        field: 'originId',
                        idFieldDB: schema.origins.id,
                        tableDB: schema.origins,
                        values: <{ id: string }[]>[]
                    }
                ]
            },
            {
                sheet: 'Categories',
                getSlug: (data: any) => generateSlug(data.name),
                schemaValidation: categorySchema,
                dbTable: schema.categories,
                set: { name: sql`excluded.name` }
            },
            {
                sheet: 'Packaging',
                getSlug: (data: any) => generateSlug(data.name),
                schemaValidation: packagingSchema,
                dbTable: schema.packaging,
                set: { name: sql`excluded.name` }
            },
            {
                sheet: 'Beer-Styles',
                getSlug: (data: any) => generateSlug(data.name),
                schemaValidation: beerStyleSchema,
                dbTable: schema.beerStyles,
                set: { name: sql`excluded.name`, description: sql`excluded.description`, originId: sql`excluded.origin_id`, parentStyleId: sql`excluded.parent_style_id` },
                references: [
                    {
                        field: 'originId',
                        idFieldDB: schema.origins.id,
                        tableDB: schema.origins,
                        values: <{ id: string }[]>[]
                    },
                    {
                        field: 'parentStyleId',
                        idFieldDB: schema.beerStyles.id,
                        tableDB: schema.beerStyles,
                        values: <{ id: string }[]>[]
                    }
                ]
            }
        ]

        for (const sheetName of sheetNames) {
            const config = config_sheets.find(c => c.sheet === sheetName)
            if (!config) continue
            
            // Get all values dynamically for references
            if (config.references) {
                for (const reference of config.references) {
                    reference.values = await db.select({ id: reference.idFieldDB }).from(reference.tableDB)
                }
            }

            // Load data from sheet
            const worksheet = workbook.Sheets[sheetName]
            const sheetData = XLSX.utils.sheet_to_json(worksheet) as any[]
            
            const validRows: any[] = []
            for (let i = 0; i < sheetData.length; i++) {
                const data = sheetData[i]
                const rowNumber = i + 2 // Skip header

                // Validate data schema
                const validation = config.schemaValidation.safeParse(data)
                if (!validation.success) {
                    errors.push({
                        sheet: sheetName,
                        row: rowNumber,
                        error: `Schema validation failed: ${JSON.parse(validation.error.message)}`
                    })
                    continue
                }

                // validate existing references (foreign keys)
                if (config.references) {
                    let hasReferenceError = false

                    for (const reference of config.references) {
                        const value = data[reference.field]
                        if (value && !reference.values.find(v => v.id === value)) {
                            errors.push({
                                sheet: sheetName,
                                row: rowNumber,
                                error: `Foreign key error: ${reference.field} = '${value}' does not exist`
                            })
                            hasReferenceError = true
                        }
                    }

                    if (hasReferenceError) continue
                }

                // Generate slug id if not provided
                let dataId = data.id
                if (dataId === undefined || dataId === null || dataId === '') {
                    dataId = config.getSlug(validation.data)
                }

                validRows.push({ id: dataId, ...validation.data })
            }

            if (validRows.length === 0) continue
            
            // Masive insert or update if only rows are valid
            try {
                await db.insert(config.dbTable).values(validRows).onConflictDoUpdate({
                    target: config.dbTable.id,
                    set: config.set as any
                })
            } catch (error: any) {
                // Error dont have a cause
                console.error(`Batch insert error for ${sheetName}:`, error)

                errors.push({
                    sheet: sheetName,
                    row: 0,
                    error: `Database batch error: ${error instanceof DrizzleQueryError ? String(error.cause) : error.message}`
                })
            }
        }

        return c.json({ success: true, errors: errors }, 200)
    } catch (error: any) {
        console.error('Unexpected server error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.post('/countries', async (c) => {
    const db = drizzle(c.env.DB, { schema })

     try {
        const body = await c.req.json()

        const validation = countrySchema.safeParse(body)
        if (!validation.success) {
            return c.json({ error: JSON.parse(validation.error.message) }, 400)
        }

        const [country] = await db.insert(schema.countries).values({
            id: generateSlug(validation.data.isoCode),
            ...validation.data,
        }).returning();

        return c.json({ data: country }, 201)
    } catch (error: any) {
        if (error instanceof DrizzleQueryError) {
            const message = String(error.cause)

            if (message.includes('UNIQUE constraint failed')) {
                return c.json({ error: 'Country already exists' }, 409)
            }
        }

        console.error('Unexpected server error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.post('/origins', async(c) => {
    const db = drizzle(c.env.DB, { schema })

    try {
        const body = await c.req.json()

        const validation = originSchema.safeParse(body)
        if (!validation.success) {
            return c.json({ error: JSON.parse(validation.error.message) }, 400)
        }

        const [origin] = await db.insert(schema.origins).values({
            id: generateSlug(`${body.countryId}-${(body.region === '' || body.region === undefined || body.region === null) ? 'none' : body.region}`),
            ...validation.data,
        }).returning();

        return c.json({ data: origin }, 201)
    } catch (error: any) {
        if (error instanceof DrizzleQueryError) {
            const message = String(error.cause)

            if (message.includes('UNIQUE constraint failed')) {
                return c.json({ error: 'Origin already exists' }, 409)
            }
            if (message.includes('FOREIGN KEY constraint failed')) {
                return c.json({ error: 'Country does not exist' }, 400)
            }
        }

        console.error('Unexpected server error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.post('/brands', async(c) => {
    const db = drizzle(c.env.DB, { schema })

    try {
        const body = await c.req.json()

        const validation = brandSchema.safeParse(body)
        if (!validation.success) {
            return c.json({ error: JSON.parse(validation.error.message) }, 400)
        }

        const [brand] = await db.insert(schema.brands).values({
            id: generateSlug(body.name),
            ...validation.data,
        }).returning();

        return c.json({ data: brand }, 201)
    } catch (error: any) {
        if (error instanceof DrizzleQueryError) {
            const message = String(error.cause)

            if (message.includes('UNIQUE constraint failed')) {
                return c.json({ error: 'Brand already exists' }, 409)
            }
            if (message.includes('FOREIGN KEY constraint failed')) {
                return c.json({ error: 'Origin does not exist' }, 400)
            }
        }

        console.error('Unexpected server error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.post('/categories', async (c) => {
    const db = drizzle(c.env.DB, { schema })

    try {
        const body = await c.req.json()

        const validation = categorySchema.safeParse(body)
        if (!validation.success) {
            return c.json({ error: JSON.parse(validation.error.message) }, 400)
        }

        const [category] = await db.insert(schema.categories).values({
            id: generateSlug(body.name),
            ...validation.data,
        }).returning();

        return c.json({ data: category }, 201)
    } catch (error: any) {
        if (error instanceof DrizzleQueryError) {
            const message = String(error.cause)

            if (message.includes('UNIQUE constraint failed')) {
                return c.json({ error: 'Category already exists' }, 409)
            }
        }

        console.error('Unexpected server error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.post('/packaging', async (c) => {
    const db = drizzle(c.env.DB, { schema })

    try {
        const body = await c.req.json()

        const validation = packagingSchema.safeParse(body)
        if (!validation.success) {
            return c.json({ error: JSON.parse(validation.error.message) }, 400)
        }

        const [packaging] = await db.insert(schema.packaging).values({
            id: generateSlug(body.name),
            ...validation.data,
        }).returning();

        return c.json({ data: packaging }, 201)
    } catch (error: any) {
        if (error instanceof DrizzleQueryError) {
            const message = String(error.cause)

            if (message.includes('UNIQUE constraint failed')) {
                return c.json({ error: 'Packaging already exists' }, 409)
            }
        }

        console.error('Unexpected server error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

export default route
