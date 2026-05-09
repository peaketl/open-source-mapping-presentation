-- ─────────────────────────────────────────────────────────────────
--  PostGIS Demo Queries — Open-Source Mapping Presentation
--  Run these against the kenda_cases database while the stack is up.
--
--  Quick connect:
--    psql $DATABASE_URL
--  or:
--    psql -h localhost -p 5432 -U postgres kenda_cases
-- ─────────────────────────────────────────────────────────────────


-- ── 1. Sanity check — row counts ─────────────────────────────────
SELECT  count(*)                                AS total
        ,count(*) FILTER (WHERE solved)          AS solved
        ,count(*) FILTER (WHERE NOT solved)      AS unsolved

FROM    crimes;


-- ── 2. Human-readable geometry (WKT) ─────────────────────────────
--  ST_AsText() converts the binary geometry column back to
--  Well-Known Text so you can read the coordinates.
SELECT  title
        ,victim
        ,"year"
        ,ST_AsText(geom) AS location_wkt

FROM    crimes

LIMIT 5;


-- ── 3. Export a single row as GeoJSON ────────────────────────────
--  ST_AsGeoJSON() produces a GeoJSON Feature geometry object —
--  the same format MapLibre and most web tools consume directly.
SELECT  title
        ,ST_AsGeoJSON(geom) AS geojson

FROM    crimes

WHERE   id = 1;


-- ── 4. Crimes within 1 mile of downtown Colorado Springs ─────────
--  ST_DWithin on the ::geography cast works in meters, so
--  1 mile = 1,609 meters.  No manual projection math needed.
--  Downtown Colo. Springs: lon -104.8214, lat 38.8339
SELECT  title
        ,victim
        ,"year"
        ,solved

FROM    crimes

WHERE ST_DWithin(
    geom::geography,
    ST_MakePoint(-104.8214, 38.8339)::geography,
    1609            -- metres (1 mile)
)
ORDER BY "year";


-- ── 5. Five nearest crimes to a point (KNN) ──────────────────────
--  The <-> operator is a "nearest-neighbour" distance operator.
--  It uses the GiST spatial index, so this is index-accelerated —
--  no full table scan even with hundreds of thousands of rows.
SELECT      title
            ,victim
            ,"year"
            ,round(
                ST_Distance(
                    geom::geography,
                    ST_MakePoint(-104.8214, 38.8339)::geography
                )::numeric
            ) AS dist_metres

FROM        crimes

ORDER BY    geom::geography <-> ST_MakePoint(-104.8214, 38.8339)::geography

LIMIT       5;


-- ── 6. Aggregate: cases and clearance rate by decade ─────────────
SELECT (year / 10 * 10)::text || 's'          AS decade,
       count(*)                               AS cases,
       count(*) FILTER (WHERE solved)         AS solved,
       round(
           100.0 * count(*) FILTER (WHERE solved) / count(*)
       )                                      AS pct_solved
FROM crimes
GROUP BY decade
ORDER BY decade;


-- ── 7. Buffer — crimes inside a 2 km radius ──────────────────────
--  ST_Buffer on a geography returns a geometry circle in the
--  correct projection.  We then use ST_Within to test containment.
--  Useful for "zone of interest" analysis — substitute any address.
WITH zone AS (
    SELECT ST_Buffer(
        ST_MakePoint(-104.8214, 38.8339)::geography,
        2000        -- radius in metres
    )::geometry AS circle
)
SELECT count(*) AS crimes_within_2km
FROM crimes, zone
WHERE ST_Within(geom, zone.circle);


-- ── 8. Geographic centroid of all crimes ─────────────────────────
--  ST_Collect aggregates individual geometries into a collection;
--  ST_Centroid finds the geometric center of that collection.
SELECT ST_AsText(
    ST_Centroid(ST_Collect(geom))
) AS center_of_all_crimes
FROM crimes;
