# Homicide Hunter Crime Map

Open-source geospatial demo that visualizes Colorado Springs homicide case data from Homicide Hunter episodes.

This project demonstrates an end-to-end stack:

- PostgreSQL + PostGIS for spatial storage
- Martin for vector tile publishing
- MapLibre GL JS for browser rendering
- Nginx for static hosting
- Python for dataset ingest

## What This Repository Contains

```text
open-source-mapping-presentation/
├── app.js
├── crimes.json
├── index.html
├── style.css
├── load_data.py
├── start.sh
├── .env.sample
├── requirements.txt
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
└── presentation/
    └── icons/
```

## How It Works

1. load_data.py reads crimes.json and bulk inserts cases into the crimes table.
2. PostGIS schema is initialized from containers/postgis/schema.sql.
3. Martin auto-publishes Postgres tables from the public schema and serves vector tiles.
4. Frontend behavior in app.js:
   - map points and labels are rendered from Martin vector tiles
   - sidebar/statistics/filter list are populated from local crimes.json
5. Nginx serves index.html, style.css, app.js, and crimes.json on port 8088.

Default ports:

- PostGIS: 5432
- Martin: 3000
- Web (Nginx): 8088

## Prerequisites

- Podman
- Python 3.10+
- pip

Optional:

- psql (for DB verification)
- curl (for endpoint checks)

## Quick Start

### 1. Configure environment

Create .env from .env.sample:

```bash
cp .env.sample .env
```

Example .env values:

```env
POSTGRES_DB=kenda_cases
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kenda_cases
```

### 2. Install Python dependency

```bash
python3 -m pip install -r requirements.txt
```

### 3. Start the full stack

```bash
./start.sh
```

What start.sh does:

- builds PostGIS, Martin, and Nginx images
- starts containers and maps service ports
- runs load_data.py to populate the crimes table

### 4. Open the demo

http://localhost:8088

## Verify Services

Check Martin:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/catalog
curl http://localhost:3000/crimes
```

Check table row count:

```bash
psql -h localhost -U postgres -d kenda_cases -c "SELECT COUNT(*) FROM crimes;"
```

## Manual Run (Without start.sh)

Build images:

```bash
podman build -f containers/postgis/Containerfile -t open-source-mapping-presentation/postgis:latest ./containers/postgis
podman build -f containers/martin/Containerfile -t open-source-mapping-presentation/martin:latest ./containers/martin
podman build -f containers/nginx/Containerfile -t open-source-mapping-presentation/nginx:latest ./containers/nginx
```

Run PostGIS:

```bash
podman run -d --replace --name open-source-mapping-presentation-postgis \
  --env-file .env \
  -p 5432:5432 \
  open-source-mapping-presentation/postgis:latest
```

Load data:

```bash
./load_data.py
```

Run Martin:

```bash
podman run -d --replace --name open-source-mapping-presentation-martin \
  --env-file .env \
  --network host \
  -p 3000:3000 \
  open-source-mapping-presentation/martin:latest
```

Run Nginx:

```bash
podman run -d --replace --name open-source-mapping-presentation-nginx \
  -p 8088:80 \
  -v "$PWD":/usr/share/nginx/html \
  open-source-mapping-presentation/nginx:latest
```

## Known Operational Notes

- start.sh currently uses an absolute host path for the Nginx volume mount. If your checkout path differs, edit that line or use the manual Nginx command above with $PWD.
- start.sh removes prior containers using names that include :latest in the rm commands. Startup still works because each podman run uses --replace, but those rm lines can be cleaned up later.
- The frontend references the OpenFreeMap dark style URL, so internet access is required for the base map style/tiles.

## Troubleshooting

- Martin cannot connect to Postgres:
  - verify DATABASE_URL in .env
  - ensure PostGIS is running on 5432
- Map loads, but no case points:
  - verify Martin /health endpoint returns OK
  - verify crimes table has rows
- Sidebar appears, but map markers do not:
  - the sidebar uses local crimes.json; the map still requires Martin tiles
- load_data.py fails:
  - install requirements: python3 -m pip install -r requirements.txt
  - verify .env credentials and database name

## Tech Stack

| Component | Purpose |
| --- | --- |
| PostgreSQL + PostGIS | Spatial data storage and indexing |
| Martin | PostGIS to vector tiles |
| MapLibre GL JS | Browser map rendering and interaction |
| Nginx | Static frontend serving |
| Python + psycopg2 | Dataset ingest |

## Data Notes

- Locations are approximate and intended for educational visualization.
- Case details are included for technical demonstration only.
- This is a local demo project, not a forensic or legal data system.
