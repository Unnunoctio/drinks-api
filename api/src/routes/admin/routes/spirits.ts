import * as schema from '@/db/schema'
import { generateSlug } from '@/utils/generateSlug'
import { spiritIdentityHash } from '@/utils/identityHashes'
import { spiritAgingContainerSchema, spiritSchema, spiritTypeSchema } from '@/validations/spiritValidations'
import { and, DrizzleQueryError, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import ExcelJS from 'exceljs'
import { Hono } from 'hono'
import { v7 as uuidv7 } from 'uuid'
import * as XLSX from 'xlsx'

type Bindings = {
    DB: D1Database
}

const route = new Hono<{ Bindings: Bindings }>()

route.get('/export-spirits', async (c) => {
    const db = drizzle(c.env.DB, { schema })

    try {
        const workbook = new ExcelJS.Workbook()

        // TODO: Add external values
        const externalValues = {
            brands: await db.select({ id: schema.brands.id }).from(schema.brands).orderBy(schema.brands.id),
            categories: await db.select({ id: schema.categories.id }).from(schema.categories).orderBy(schema.categories.id),
            origins: await db.select({ id: schema.origins.id }).from(schema.origins).orderBy(schema.origins.id),
            packaging: await db.select({ id: schema.packaging.id }).from(schema.packaging).orderBy(schema.packaging.id),
            spiritTypes: await db.select({ id: schema.spiritTypes.id }).from(schema.spiritTypes).orderBy(schema.spiritTypes.id),
            spiritAgingContainers: await db
                .select({ id: schema.spiritAgingContainers.id })
                .from(schema.spiritAgingContainers)
                .orderBy(schema.spiritAgingContainers.id),
        }

        // Add external value to Values sheet
        const valuesSheet = workbook.addWorksheet('VALUES')

        // Configure columns for Values sheet
        valuesSheet.columns = [
            { header: 'brands', key: 'brands', width: 20 },
            { header: 'categories', key: 'categories', width: 20 },
            { header: 'origins', key: 'origins', width: 20 },
            { header: 'packaging', key: 'packaging', width: 20 },
            { header: 'spiritTypes', key: 'spiritTypes', width: 20 },
            { header: 'spiritAgingContainers', key: 'spiritAgingContainers', width: 20 },
        ]

        // Find the maximum length to iterate
        const maxLength = Math.max(
            externalValues.brands.length,
            externalValues.categories.length,
            externalValues.origins.length,
            externalValues.packaging.length,
            externalValues.spiritTypes.length,
            externalValues.spiritAgingContainers.length
        )

        // Add rows to Values sheet
        for (let i = 0; i < maxLength; i++) {
            valuesSheet.addRow({
                brands: externalValues.brands[i]?.id || '',
                categories: externalValues.categories[i]?.id || '',
                origins: externalValues.origins[i]?.id || '',
                packaging: externalValues.packaging[i]?.id || '',
                spiritTypes: externalValues.spiritTypes[i]?.id || '',
                spiritAgingContainers: externalValues.spiritAgingContainers[i]?.id || '',
            })
        }

        // TODO: Export Spirits by Brand
        const spirits = await db
            .select({
                id: schema.drinks.id,
                name: schema.drinks.name,
                brandId: schema.drinks.brandId,
                alcoholByVolume: schema.drinks.alcoholByVolume,
                categoryId: schema.drinks.categoryId,
                originId: schema.drinks.originId,
                packagingId: schema.drinkFormats.packagingId,
                volumeCc: schema.drinkFormats.volumeCc,
                spiritTypeId: schema.spirits.spiritTypeId,
                agingContainerId: schema.spirits.agingContainerId,
                agingTimeMonths: schema.spirits.agingTimeMonths,
            })
            .from(schema.spirits)
            .innerJoin(schema.drinks, eq(schema.drinks.id, schema.spirits.drinkId))
            .innerJoin(schema.drinkFormats, eq(schema.drinkFormats.drinkId, schema.drinks.id))
            .orderBy(schema.drinks.brandId)

        const spiritsByBrand = Object.groupBy(spirits, ({ brandId }) => brandId)
        Object.keys(spiritsByBrand).forEach((brandId) => {
            const brandSpirits = spiritsByBrand[brandId]
            if (brandSpirits === undefined) return

            const worksheet = workbook.addWorksheet(brandId)

            const columns = Object.keys(brandSpirits[0]).map((key) => ({
                header: key,
                key: key,
                width: 20,
            }))
            worksheet.columns = columns

            // Sort by name and volume (ascending)
            brandSpirits.sort((a, b) => a.name.localeCompare(b.name) || a.volumeCc - b.volumeCc).forEach((row) => worksheet.addRow(row))

            // Add validations
            function addValidation(column: string, formula: string) {
                for (let row = 2; row <= 1000; row++) {
                    worksheet.getCell(`${column}${row}`).dataValidation = {
                        type: 'list',
                        allowBlank: true,
                        formulae: [formula],
                    }
                }
            }

            addValidation('C', 'VALUES!$A$2:$A$1000') // brands
            addValidation('E', 'VALUES!$B$2:$B$1000') // categories
            addValidation('F', 'VALUES!$C$2:$C$1000') // origins
            addValidation('G', 'VALUES!$D$2:$D$1000') // packaging
            addValidation('I', 'VALUES!$E$2:$E$1000') // spirit-types
            addValidation('J', 'VALUES!$F$2:$F$1000') // spirit-aging-containers
        })

        // TODO: Download File
        const buffer = await workbook.xlsx.writeBuffer()

        c.res.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        c.res.headers.set('Content-Disposition', 'attachment; filename=SPIRITS.xlsx')

        return c.body(buffer)
    } catch (error: any) {
        console.error('Unexpected server error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.post('/import-spirits', async (c) => {
    const db = drizzle(c.env.DB, { schema })

    try {
        const body = await c.req.parseBody()
        const file = body.file
        if (!file || !(file instanceof File)) return c.json({ error: 'File not provided' }, 400)

        const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
        if (['.xlsx', '.xls'].includes(extension) === false) return c.json({ error: 'File must be an Excel file' }, 400)

        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true, raw: false })
        const sheetNames = workbook.SheetNames

        const errors: Array<{ sheet: string; row: number; error: unknown }> = []

        const config_sheets = sheetNames.map((sheetName) => {
            return {
                sheet: sheetName,
                schemaValidation: spiritSchema,
                references: [
                    {
                        field: 'brandId',
                        idFieldDB: schema.brands.id,
                        tableDB: schema.brands,
                        values: <{ id: string }[]>[],
                    },
                    {
                        field: 'categoryId',
                        idFieldDB: schema.categories.id,
                        tableDB: schema.categories,
                        values: <{ id: string }[]>[],
                    },
                    {
                        field: 'originId',
                        idFieldDB: schema.origins.id,
                        tableDB: schema.origins,
                        values: <{ id: string }[]>[],
                    },
                    {
                        field: 'spiritTypeId',
                        idFieldDB: schema.spiritTypes.id,
                        tableDB: schema.spiritTypes,
                        values: <{ id: string }[]>[],
                    },
                    {
                        field: 'agingContainerId',
                        idFieldDB: schema.spiritAgingContainers.id,
                        tableDB: schema.spiritAgingContainers,
                        values: <{ id: string }[]>[],
                    },
                ],
            }
        })

        for (const sheetName of sheetNames) {
            if (sheetName === 'VALUES') continue

            const config = config_sheets.find((c) => c.sheet === sheetName)
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
                        error: `Schema validation failed: ${JSON.parse(validation.error.message)}`,
                    })
                    continue
                }

                // validate existing references (foreign keys)
                if (config.references) {
                    let hasReferenceError = false

                    for (const reference of config.references) {
                        const value = data[reference.field]
                        if (value && !reference.values.find((v) => v.id === value)) {
                            errors.push({
                                sheet: sheetName,
                                row: rowNumber,
                                error: `Foreign key error: ${reference.field} = '${value}' does not exist`,
                            })
                            hasReferenceError = true
                        }
                    }

                    if (hasReferenceError) continue
                }

                validRows.push(validation.data)
            }

            if (validRows.length === 0) continue

            // Masive insert or update if only rows are valid
            for (const row of validRows) {
                const data = row

                try {
                    const spiritHash = await spiritIdentityHash(data)

                    // Insert or update Hash
                    await db.insert(schema.uniqueSpiritIdentities).values({ hash: spiritHash }).onConflictDoNothing()

                    // Search for existing drink
                    let drinkId: string | null = null
                    const drinkExisting = await db
                        .select({ id: schema.drinks.id })
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
                        )
                        .limit(1)

                    if (drinkExisting.length > 0) {
                        drinkId = drinkExisting[0].id
                        // update Drink
                        await db
                            .insert(schema.drinks)
                            .values({
                                id: drinkId,
                                name: data.name,
                                brandId: data.brandId,
                                alcoholByVolume: data.alcoholByVolume,
                                categoryId: data.categoryId,
                                originId: data.originId,
                            })
                            .onConflictDoUpdate({
                                target: schema.drinks.id,
                                set: {
                                    name: sql`excluded.name`,
                                    brandId: sql`excluded.brand_id`,
                                    alcoholByVolume: sql`excluded.alcohol_by_volume`,
                                    categoryId: sql`excluded.category_id`,
                                    originId: sql`excluded.origin_id`,
                                },
                            })

                        // update Spirit
                        await db
                            .insert(schema.spirits)
                            .values({
                                drinkId: drinkId,
                                spiritTypeId: data.spiritTypeId,
                                agingContainerId: data.agingContainerId,
                                agingTimeMonths: data.agingTimeMonths,
                            })
                            .onConflictDoUpdate({
                                target: schema.spirits.drinkId,
                                set: {
                                    spiritTypeId: sql`excluded.spirit_type_id`,
                                    agingContainerId: sql`excluded.aging_container_id`,
                                    agingTimeMonths: sql`excluded.aging_time_months`,
                                },
                            })
                    } else {
                        // Insert drink
                        drinkId = uuidv7()
                        await db.insert(schema.drinks).values({
                            id: drinkId,
                            name: data.name,
                            brandId: data.brandId,
                            alcoholByVolume: data.alcoholByVolume,
                            categoryId: data.categoryId,
                            originId: data.originId,
                        })

                        // Insert spirit
                        await db.insert(schema.spirits).values({
                            drinkId: drinkId,
                            spiritTypeId: data.spiritTypeId,
                            agingContainerId: data.agingContainerId,
                            agingTimeMonths: data.agingTimeMonths,
                        })
                    }

                    // Search for existing format
                    const formatExisting = await db
                        .select({ id: schema.drinkFormats.id })
                        .from(schema.drinkFormats)
                        .where(
                            and(
                                eq(schema.drinkFormats.drinkId, drinkId),
                                eq(schema.drinkFormats.packagingId, data.packagingId),
                                eq(schema.drinkFormats.volumeCc, data.volumeCc)
                            )
                        )
                        .limit(1)

                    // Insert format if not exists
                    if (formatExisting.length === 0) {
                        await db.insert(schema.drinkFormats).values({
                            id: uuidv7(),
                            drinkId: drinkId,
                            packagingId: data.packagingId,
                            volumeCc: data.volumeCc,
                        })
                    }
                } catch (error: any) {
                    // Error dont have a cause
                    console.error(`Batch insert error for ${sheetName}:`, error)

                    errors.push({
                        sheet: sheetName,
                        row: 0,
                        error: `Database batch error: ${error instanceof DrizzleQueryError ? String(error.cause) : error.message}`,
                    })
                }
            }
        }

        return c.json({ success: true, errors: errors }, 200)
    } catch (error: any) {
        console.error('Unexpected server error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

route.post('/spirits', async (c) => {
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
        const drinkExisting = await db
            .select({ drinkId: schema.drinks.id })
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
            )
            .limit(1)

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

        return c.json(
            {
                hash: spiritHash,
                data: {
                    drinkId: drinkId,
                    formatId: formatId,
                },
            },
            201
        )
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

route.post('/spirit-types', async (c) => {
    const db = drizzle(c.env.DB, { schema })

    try {
        const body = await c.req.json()

        const validation = spiritTypeSchema.safeParse(body)
        if (!validation.success) {
            return c.json({ error: JSON.parse(validation.error.message) }, 400)
        }

        const [spiritType] = await db
            .insert(schema.spiritTypes)
            .values({
                id: generateSlug(body.name),
                ...validation.data,
            })
            .returning()

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

route.post('/spirit-aging-containers', async (c) => {
    const db = drizzle(c.env.DB, { schema })

    try {
        const body = await c.req.json()

        const validation = spiritAgingContainerSchema.safeParse(body)
        if (!validation.success) {
            return c.json({ error: JSON.parse(validation.error.message) }, 400)
        }

        const [spiritAgingContainer] = await db
            .insert(schema.spiritAgingContainers)
            .values({
                id: generateSlug(body.name),
                ...validation.data,
            })
            .returning()

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
