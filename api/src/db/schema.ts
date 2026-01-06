import { relations, sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// ==================== COUNTRIES ====================
export const countries = sqliteTable('countries', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    isoCode: text('iso_code').notNull(),
})

// ==================== ORIGINS ====================
export const origins = sqliteTable('origins', {
    id: text('id').primaryKey(),
    countryId: text('country_id').notNull().references(() => countries.id),
    region: text('region'),
})

// ==================== BRANDS ====================
export const brands = sqliteTable('brands', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    originId: text('origin_id').notNull().references(() => origins.id),
    website: text('website').notNull(),
})

// ==================== CATEGORIES ====================
export const categories = sqliteTable('categories', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
})

// ==================== PACKAGING ====================
export const packaging = sqliteTable('packaging', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
})

// ==================== DRINKS ====================
export const drinks = sqliteTable('drinks', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    brandId: text('brand_id').notNull().references(() => brands.id),
    alcoholByVolume: real('alcohol_by_volume').notNull(),
    categoryId: text('category_id').notNull().references(() => categories.id),
    originId: text('origin_id').references(() => origins.id),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

// ==================== DRINK FORMATS ====================
export const drinkFormats = sqliteTable('drink_formats', {
    id: text('id').primaryKey(),
    drinkId: text('drink_id').notNull().references(() => drinks.id),
    packagingId: text('packaging_id').notNull().references(() => packaging.id),
    volumeCc: integer('volume_cc').notNull(),
})

// ==================== BEER STYLES ====================
export const beerStyles = sqliteTable('beer_styles', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    originId: text('origin_id').notNull().references(() => origins.id),
    parentStyleId: text('parent_style_id').references((): any => beerStyles.id),
})

// ==================== BEERS ====================
export const beers = sqliteTable('beers', {
    drinkId: text('drink_id').primaryKey().references(() => drinks.id),
    beerStyleId: text('beer_style_id').notNull().references(() => beerStyles.id),
    ibu: integer('ibu'),
    servingTempMinC: integer('serving_temp_min_c'),
    servingTempMaxC: integer('serving_temp_max_c'),
})

// ==================== BEER HASH ====================
export const uniqueBeerIdentities = sqliteTable('unique_beer_identities', {
    hash: text('hash').primaryKey()
})

// ==================== WINE TYPES ====================
export const wineTypes = sqliteTable('wine_types', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
})

// ==================== WINES ====================
export const wines = sqliteTable('wines', {
    drinkId: text('drink_id').primaryKey().references(() => drinks.id),
    wineTypeId: text('wine_type_id').notNull().references(() => wineTypes.id),
    vintageYear: integer('vintage_year'),
})

// ==================== WINE STRAINS ====================
export const wineStrains = sqliteTable('wine_strains', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
})

// ==================== WINE <-> STRAINS ====================
export const wineWineStrains = sqliteTable('wine_wine_strains', {
    wineId: text('wine_id').notNull().references(() => wines.drinkId),
    strainId: text('strain_id').notNull().references(() => wineStrains.id),
    percentage: integer('percentage'),
})

// ==================== WINE VINEYARDS ====================
export const wineVineyards = sqliteTable('wine_vineyards', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    foundedYear: integer('founded_year'),
    originId: text('origin_id').references(() => origins.id),
})

// ==================== WINE <-> VINEYARDS ====================
export const wineWineVineyards = sqliteTable('wine_wine_vineyards', {
    wineId: text('wine_id').notNull().references(() => wines.drinkId),
    vineyardId: text('vineyard_id').notNull().references(() => wineVineyards.id),
})

// ==================== SPIRIT TYPES ====================
export const spiritTypes = sqliteTable('spirit_types', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
})

// ==================== SPIRIT AGING CONTAINERS ====================
export const spiritAgingContainers = sqliteTable('spirit_aging_containers', {
    id: text('id').primaryKey(),
    name: text('name'),
})

// ==================== SPIRITS ====================
export const spirits = sqliteTable('spirits', {
    drinkId: text('drink_id').primaryKey().references(() => drinks.id),
    spiritTypeId: text('spirit_type_id').notNull().references(() => spiritTypes.id),
    agingContainerId: text('aging_container_id').references(() => spiritAgingContainers.id),
    agingTimeMonths: integer('aging_time_months'),
})

// ==================== SPIRIT HASH ====================
export const uniqueSpiritIdentities = sqliteTable('unique_spirit_identities', {
    hash: text('hash').primaryKey()
})

// ==================== RELATIONS ====================

export const countriesRelations = relations(countries, ({ many }) => ({
    origins: many(origins),
}))

export const originsRelations = relations(origins, ({ one, many }) => ({
    country: one(countries, {
        fields: [origins.countryId],
        references: [countries.id],
    }),
    brands: many(brands),
    drinks: many(drinks),
}))

export const brandsRelations = relations(brands, ({ one, many }) => ({
    origin: one(origins, {
        fields: [brands.originId],
        references: [origins.id],
    }),
    drinks: many(drinks),
}))

export const drinksRelations = relations(drinks, ({ one, many }) => ({
    brand: one(brands, {
        fields: [drinks.brandId],
        references: [brands.id],
    }),
    category: one(categories, {
        fields: [drinks.categoryId],
        references: [categories.id],
    }),
    origin: one(origins, {
        fields: [drinks.originId],
        references: [origins.id],
    }),
    formats: many(drinkFormats),
    beer: one(beers, {
        fields: [drinks.id],
        references: [beers.drinkId],
    }),
    wine: one(wines, {
        fields: [drinks.id],
        references: [wines.drinkId],
    }),
    spirit: one(spirits, {
        fields: [drinks.id],
        references: [spirits.drinkId],
    }),
}))

export const beersRelations = relations(beers, ({ one }) => ({
    drink: one(drinks, {
        fields: [beers.drinkId],
        references: [drinks.id],
    }),
    style: one(beerStyles, {
        fields: [beers.beerStyleId],
        references: [beerStyles.id],
    }),
}))

export const beerStylesRelations = relations(beerStyles, ({ one, many }) => ({
    origin: one(origins, {
        fields: [beerStyles.originId],
        references: [origins.id],
    }),
    parentStyle: one(beerStyles, {
        fields: [beerStyles.parentStyleId],
        references: [beerStyles.id],
    }),
    beers: many(beers),
}))

export const winesRelations = relations(wines, ({ one, many }) => ({
    drink: one(drinks, {
        fields: [wines.drinkId],
        references: [drinks.id],
    }),
    wineType: one(wineTypes, {
        fields: [wines.wineTypeId],
        references: [wineTypes.id],
    }),
    strains: many(wineWineStrains),
    vineyards: many(wineWineVineyards),
}))

export const wineWineStrainsRelations = relations(wineWineStrains, ({ one }) => ({
    wine: one(wines, {
        fields: [wineWineStrains.wineId],
        references: [wines.drinkId],
    }),
    strain: one(wineStrains, {
        fields: [wineWineStrains.strainId],
        references: [wineStrains.id],
    }),
}))

export const spiritsRelations = relations(spirits, ({ one }) => ({
    drink: one(drinks, {
        fields: [spirits.drinkId],
        references: [drinks.id],
    }),
    spiritType: one(spiritTypes, {
        fields: [spirits.spiritTypeId],
        references: [spiritTypes.id],
    }),
    agingContainer: one(spiritAgingContainers, {
        fields: [spirits.agingContainerId],
        references: [spiritAgingContainers.id],
    }),
}))
