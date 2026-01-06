-- PRAGMA foreign_keys = OFF;

-- DROP TABLE IF EXISTS spirits;
-- DROP TABLE IF EXISTS spirit_aging_containers;
-- DROP TABLE IF EXISTS spirit_types;

-- DROP TABLE IF EXISTS wine_wine_vineyards;
-- DROP TABLE IF EXISTS wine_vineyards;
-- DROP TABLE IF EXISTS wine_wine_strains;
-- DROP TABLE IF EXISTS wine_strains;
-- DROP TABLE IF EXISTS wines;
-- DROP TABLE IF EXISTS wine_types;

-- DROP TABLE IF EXISTS beers;
-- DROP TABLE IF EXISTS beer_styles;
-- DROP TABLE IF EXISTS unique_beer_identities;

-- DROP TABLE IF EXISTS drink_formats;
-- DROP TABLE IF EXISTS drinks;

-- DROP TABLE IF EXISTS packaging;
-- DROP TABLE IF EXISTS categories;
-- DROP TABLE IF EXISTS brands;
-- DROP TABLE IF EXISTS origins;
-- DROP TABLE IF EXISTS countries;

PRAGMA foreign_keys = ON;

-- COUNTRIES
CREATE TABLE IF NOT EXISTS countries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    iso_code TEXT NOT NULL
);

-- ORIGINS
CREATE TABLE IF NOT EXISTS origins (
    id TEXT PRIMARY KEY,
    country_id TEXT NOT NULL,
    region TEXT,

    FOREIGN KEY (country_id) REFERENCES countries(id)
    UNIQUE (country_id, region)
);

-- BRANDS
CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    origin_id TEXT NOT NULL,
    website TEXT NOT NULL,

    FOREIGN KEY (origin_id) REFERENCES origins(id)
    UNIQUE (website)
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- PACKAGING
CREATE TABLE IF NOT EXISTS packaging (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- DRINKS
CREATE TABLE IF NOT EXISTS drinks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand_id TEXT NOT NULL,
    alcohol_by_volume REAL NOT NULL,
    category_id TEXT NOT NULL,
    origin_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (alcohol_by_volume >= 0 AND alcohol_by_volume <= 100),
    FOREIGN KEY (brand_id) REFERENCES brands(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (origin_id) REFERENCES origins(id)
);

-- DRINK <-> DRINK FORMATS
CREATE TABLE IF NOT EXISTS drink_formats (
    id TEXT PRIMARY KEY,
    drink_id TEXT NOT NULL,
    packaging_id TEXT NOT NULL,
    volume_cc INTEGER NOT NULL,

    FOREIGN KEY (drink_id) REFERENCES drinks(id),
    FOREIGN KEY (packaging_id) REFERENCES packaging(id),
    UNIQUE (drink_id, packaging_id, volume_cc)
);

-- BEER STYLES
CREATE TABLE IF NOT EXISTS beer_styles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    origin_id TEXT NOT NULL,
    parent_style_id TEXT,

    FOREIGN KEY (origin_id) REFERENCES origins(id),
    FOREIGN KEY (parent_style_id) REFERENCES beer_styles(id)
);

-- BEERS
CREATE TABLE IF NOT EXISTS beers (
    drink_id TEXT PRIMARY KEY,
    beer_style_id TEXT NOT NULL,
    ibu INTEGER,
    serving_temp_min_c INTEGER,
    serving_temp_max_c INTEGER,

    CHECK (ibu >= 0 AND ibu <= 100),
    FOREIGN KEY (drink_id) REFERENCES drinks(id),
    FOREIGN KEY (beer_style_id) REFERENCES beer_styles(id)
);

-- BEER HASH
CREATE TABLE IF NOT EXISTS unique_beer_identities (
    hash TEXT PRIMARY KEY
);

-- WINE TYPES
CREATE TABLE IF NOT EXISTS wine_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- WINES
CREATE TABLE IF NOT EXISTS wines (
    drink_id TEXT PRIMARY KEY,
    wine_type_id TEXT NOT NULL,
    vintage_year INTEGER,

    FOREIGN KEY (drink_id) REFERENCES drinks(id),
    FOREIGN KEY (wine_type_id) REFERENCES wine_types(id)
);

-- WINE STRAINS
CREATE TABLE IF NOT EXISTS wine_strains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

-- WINE <-> STRAINS
CREATE TABLE IF NOT EXISTS wine_wine_strains (
    wine_id TEXT NOT NULL,
    strain_id TEXT NOT NULL,
    percentage INTEGER,

    CHECK (percentage >= 0 AND percentage <= 100),
    PRIMARY KEY (wine_id, strain_id),
    FOREIGN KEY (wine_id) REFERENCES wines(drink_id),
    FOREIGN KEY (strain_id) REFERENCES wine_strains(id)
);

-- WINE VINEYARDS
CREATE TABLE IF NOT EXISTS wine_vineyards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    founded_year INTEGER,
    origin_id TEXT,

    FOREIGN KEY (origin_id) REFERENCES origins(id)
);

-- WINE <-> VINEYARDS
CREATE TABLE IF NOT EXISTS wine_wine_vineyards (
    wine_id TEXT NOT NULL,
    vineyard_id TEXT NOT NULL,

    PRIMARY KEY (wine_id, vineyard_id),
    FOREIGN KEY (wine_id) REFERENCES wines(drink_id),
    FOREIGN KEY (vineyard_id) REFERENCES wine_vineyards(id)
);

-- SPIRIT TYPES
CREATE TABLE IF NOT EXISTS spirit_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

-- SPIRIT AGING CONTAINERS
CREATE TABLE IF NOT EXISTS spirit_aging_containers (
    id TEXT PRIMARY KEY,
    name TEXT
);

-- SPIRITS
CREATE TABLE IF NOT EXISTS spirits (
    drink_id TEXT PRIMARY KEY,
    spirit_type_id TEXT NOT NULL,
    aging_container_id TEXT,
    aging_time_months INTEGER,

    CHECK (aging_time_months >= 0),
    FOREIGN KEY (drink_id) REFERENCES drinks(id),
    FOREIGN KEY (spirit_type_id) REFERENCES spirit_types(id),
    FOREIGN KEY (aging_container_id) REFERENCES spirit_aging_containers(id)
);

-- SPIRIT HASH
CREATE TABLE IF NOT EXISTS unique_spirit_identities (
    hash TEXT PRIMARY KEY
);
