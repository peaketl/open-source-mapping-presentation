# Homicide Hunter Crime Map
### Colorado Springs Open-Source Users Group Demo

This repository is a live demo stack for presenting open-source geospatial tooling to the Colorado Springs open-source community.

It shows how to:

- Store data in PostGIS
- Publish vector tiles with Martin
- Render interactive web maps with MapLibre GL JS
- Serve a static frontend with Nginx
- Load JSON data into Postgres/PostGIS with Python

The map centers on Lt. Joe Kenda case data in Colorado Springs.

## Demo Goals

- Highlight a complete open-source mapping pipeline end-to-end
- Keep deployment simple with Podman container images
- Use readable, hackable config for meetup walkthroughs
- Provide a real dataset that demonstrates filters, popups, and vector tiles

## Current Project Layout

```text
open-source-mapping-presentation/
├── app.js
├── crimes.json
├── index.html
├── style.css
├── load_data.py
├── start.sh
├── .env.sample
├── containers/
│   ├── postgis/
│   │   ├── Containerfile
│   │   └── schema.sql
│   ├── martin/
│   │   ├── Containerfile
│   │   └── martin.yaml
│   └── nginx/
│       ├── Containerfile
│       └── nginx.conf
└── README.md
```

## Architecture

1. `crimes.json` is loaded into PostGIS by `load_data.py`
2. Martin reads from PostGIS and exposes vector tiles for `crimes`
3. `index.html` + `app.js` render the map and interactive UI
4. Nginx serves the frontend static files from the repo root

Default service ports:

- PostGIS: `5432`
- Martin: `3000`
- Web (Nginx): `8088`

## Prerequisites

- Podman
- Python 3.11+
- Python package: `psycopg2-binary`

Optional but useful:

- `psql` for SQL checks
- `curl` for endpoint checks

## Quick Start (Recommended)

### 1. Configure environment

Create `.env` from `.env.sample` and set values:

```env
POSTGRES_DB=kenda_cases
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kenda_cases
```

### 2. Start all services

```bash
set -a
source .env
set +a
./start.sh
```

What `start.sh` does:

- Builds the PostGIS, Martin, and Nginx images
- Starts containers with expected ports and environment variables
- Runs `load_data.py` after PostGIS starts

### 3. Open the map

- http://localhost:8088

## Manual Podman Run (Step-by-Step)

If you want to demo each component separately:

### Build images

```bash
podman build -f containers/postgis/Containerfile -t demo/postgis:latest ./containers/postgis
podman build -f containers/martin/Containerfile -t demo/martin:latest ./containers/martin
podman build -f containers/nginx/Containerfile -t demo/nginx:latest ./containers/nginx
```

### Run PostGIS

```bash
podman run -d --name demo-postgis --env-file .env -p 5432:5432 demo/postgis:latest
```

### Load data

```bash
python3 -m pip install psycopg2-binary
./load_data.py
```

### Run Martin

```bash
podman run -d --name demo-martin --env-file .env --network host -p 3000:3000 demo/martin:latest
```

### Run Nginx frontend

```bash
podman run -d --name demo-nginx -p 8088:80 \
  -v "$PWD":/usr/share/nginx/html:ro \
  demo/nginx:latest
```

## Validate the Demo

### Martin endpoints

```bash
curl http://localhost:3000/health
curl http://localhost:3000/catalog
curl http://localhost:3000/crimes
```

### PostGIS check

```bash
psql -h localhost -U postgres -d kenda_cases -c "
  SELECT id, title, year, ST_AsText(geom)
  FROM crimes
  ORDER BY id
  LIMIT 5;
"
```

## Presentation Talking Points

- Why open-source mapping: no proprietary lock-in, no API-key dependency for core rendering
- Separation of concerns:
  - PostGIS for spatial storage/indexing
  - Martin for fast vector tile delivery
  - MapLibre GL JS for browser rendering and interactivity
- Real-world UX features in a small demo:
  - Sidebar + filters + stats
  - Feature popups
  - Vector tile layer styling and labels

## Troubleshooting

- Martin cannot connect:
  - Confirm `DATABASE_URL` in `.env`
  - Verify PostGIS container is running and listening on `5432`
- Web app loads but no points:
  - Check `http://localhost:3000/health`
  - Confirm `crimes` table contains rows
- Python loader fails:
  - Install dependency: `python3 -m pip install psycopg2-binary`
  - Ensure `.env` has valid DB credentials

## Tech Stack

| Component | Purpose |
| --- | --- |
| PostgreSQL + PostGIS | Spatial data storage and indexing |
| Martin | PostgreSQL/PostGIS to vector tiles |
| MapLibre GL JS | Browser-based map rendering |
| Nginx | Static frontend serving |
| Python + psycopg2 | Dataset ingest pipeline |

## Data and Ethics Notes

- Locations are approximate and intended for educational visualization.
- Case information is presented for technical demonstration purposes.
- This project is a local meetup demo, not a forensic or legal data system.
