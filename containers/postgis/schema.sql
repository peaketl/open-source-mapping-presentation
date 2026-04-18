-- ─────────────────────────────────────────────────────────────────
--  Homicide Hunter Map — Database Schema
--  Run by Docker on first launch via /docker-entrypoint-initdb.d/
-- ─────────────────────────────────────────────────────────────────

-- Enable the PostGIS spatial extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── Crimes table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crimes (
    id            SERIAL PRIMARY KEY,

    -- Episode metadata
    episode       TEXT,
    title         TEXT NOT NULL,
    season        INTEGER,

    -- Case details
    victim        TEXT,
    year          INTEGER,
    crime_type    TEXT,
    weapon        TEXT,
    solved        BOOLEAN DEFAULT true,
    description   TEXT,

    -- Location (human-readable)
    location_name TEXT,
    neighborhood  TEXT,

    -- Raw coordinates (kept for reference / export)
    lat           DOUBLE PRECISION,
    lon           DOUBLE PRECISION,

    -- PostGIS geometry point — WGS 84 (SRID 4326)
    geom          GEOMETRY(Point, 4326)
);

-- Spatial index — required for tile serving performance
CREATE INDEX IF NOT EXISTS crimes_geom_idx
    ON crimes USING GIST (geom);

-- Optional: regular indexes for common filter columns
CREATE INDEX IF NOT EXISTS crimes_year_idx    ON crimes (year);
CREATE INDEX IF NOT EXISTS crimes_season_idx  ON crimes (season);
CREATE INDEX IF NOT EXISTS crimes_solved_idx  ON crimes (solved);
