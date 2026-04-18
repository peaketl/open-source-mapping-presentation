#!/usr/bin/env python3
"""
load_data.py — Load Homicide Hunter JSON dataset into PostGIS

Usage:
    pip install psycopg2-binary
    python load_data.py

Or with a custom DB URL:
    DATABASE_URL=postgresql://user:pass@host/db python load_data.py
"""

import json
import os
import sys
import psycopg2
from psycopg2.extras import execute_values

# ── Connection ────────────────────────────────────────────────────
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/postgres"
)

# ── Load the JSON dataset ─────────────────────────────────────────
def load_cases(json_path: str = "crimes.json") -> list[dict]:
    with open(json_path) as f:
        data = json.load(f)
    return data["cases"]


# ── Insert rows into PostGIS ──────────────────────────────────────
INSERT_SQL = """
    INSERT INTO crimes (
        episode, title, season,
        victim, year, crime_type, weapon, solved, description,
        location_name, neighborhood,
        lat, lon,
        geom
    )
    VALUES %s
    ON CONFLICT DO NOTHING
"""

def case_to_row(c: dict) -> tuple:
    """Convert a JSON case dict to a DB row tuple."""
    return (
        c.get("episode"),
        c["title"],
        c.get("season"),
        c.get("victim"),
        c.get("year"),
        c.get("crime_type"),
        c.get("weapon"),
        c.get("solved", True),
        c.get("description"),
        c.get("location_name"),
        c.get("neighborhood"),
        c["lat"],
        c["lon"],
        # ST_MakePoint(lon, lat) — note: longitude first (x), latitude second (y)
        f"SRID=4326;POINT({c['lon']} {c['lat']})",
    )


def main():
    cases = load_cases()
    rows  = [case_to_row(c) for c in cases]

    print(f"Connecting to {DATABASE_URL.split('@')[-1]} ...")  # hide credentials

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur  = conn.cursor()

        # Use execute_values for efficient bulk insert
        execute_values(
            cur,
            INSERT_SQL,
            rows,
            template="""(
                %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, %s,
                %s, %s,
                ST_GeomFromEWKT(%s)
            )"""
        )

        conn.commit()
        print(f"✅  Inserted {len(rows)} cases into the crimes table.")

        # Quick sanity check
        cur.execute("SELECT COUNT(*) FROM crimes;")
        total = cur.fetchone()[0]
        print(f"    Total rows in table: {total}")

        cur.close()
        conn.close()

    except psycopg2.OperationalError as e:
        print(f"❌  Connection failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
