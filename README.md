# Homicide Hunter Crime Map
### Colorado Springs Open-Source Users Group — May 13, 2026

A full-stack mapping application built with **PostGIS + Martin + MapLibre GL JS + Python**.
Dataset: Lt. Joe Kenda's cases from *Homicide Hunter* (Investigation Discovery, 2011–2020).

---

## 📁 Project Structure

```
homicide-hunter-map/
├── presentation.html    ← Open this for the slide deck
├── crimes.json          ← 27 documented Kenda cases (JSON dataset)
├── docker-compose.yml   ← PostGIS + Martin + Nginx
├── martin.yaml          ← Martin tile server config
├── schema.sql           ← PostGIS table + indexes (auto-runs in Docker)
├── load_data.py         ← Python loader: JSON → PostGIS
└── map/
    ├── index.html       ← The map app
    ├── app.js           ← MapLibre GL JS + Martin integration
    ├── style.css        ← Dark theme styles
    └── crimes.json      ← Copy for local fetch fallback
```

---

## 🚀 Quick Start

### 1. Start the stack
```bash
docker compose up -d
```
- **PostGIS** → `localhost:5432`
- **Martin** → `localhost:3000`
- **Map app** → `localhost:8080`

### 2. Load the dataset
```bash
pip install psycopg2-binary
python load_data.py
```

### 3. Open the map
```
http://localhost:8080
```

---

## 🔍 Verify Martin is working

```bash
# TileJSON for the crimes table
curl http://localhost:3000/crimes | jq .

# Catalog of all served tables
curl http://localhost:3000/catalog | jq .

# Health check
curl http://localhost:3000/health
```

---

## 🐘 Verify PostGIS data

```bash
psql -h localhost -U postgres -d kenda_cases -c "
  SELECT id, title, year, ST_AsText(geom)
  FROM crimes LIMIT 5;
"
```

---

## 📚 Stack

| Component | Role | Version |
|-----------|------|---------|
| PostgreSQL + PostGIS | Spatial database | 16 + 3.4 |
| Martin | Vector tile server | latest |
| MapLibre GL JS | Browser map rendering | 4.7.1 |
| Python + psycopg2 | Data loader | 3.11+ |
| OpenFreeMap | Free basemap tiles | — |
| Nginx | Static file server | alpine |

---

## ⚠️ Notes

- Crime locations are **approximate** — assigned to general Colorado Springs areas based on episode descriptions, not official records.
- Victim surnames are shown as broadcast on Investigation Discovery.
- This dataset is for **educational / demonstration purposes only**.
