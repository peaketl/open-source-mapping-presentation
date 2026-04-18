#!/bin/bash

set -e

# Stop and remove existing containers if they exist
echo "Stopping existing PostGIS container..."
podman stop open-source-mapping-presentation-postgis || true # Ignore error if container doesn't exist
podman rm -f open-source-mapping-presentation-postgis:latest

echo "Stopping existing Martin container..."
podman stop open-source-mapping-presentation-martin || true # Ignore error if container doesn't exist
podman rm -f open-source-mapping-presentation-martin:latest

echo "Stopping existing Nginx container..."
podman stop open-source-mapping-presentation-nginx || true # Ignore error if container doesn't exist
podman rm -f open-source-mapping-presentation-nginx:latest

# Build and run PostGIS container
echo "Starting PostGIS podman container..."
podman build --no-cache --pull -f containers/postgis/Containerfile -t open-source-mapping-presentation/postgis:latest ./containers/postgis
podman run -d --replace --name open-source-mapping-presentation-postgis --env-file ".env" -p 5432:5432 open-source-mapping-presentation/postgis:latest

echo "Waiting for PostGIS to be ready..."
sleep 5

# Load data into PostGIS
echo "Running load_data.py script..."
./load_data.py # Assumes load_data.py is in the same directory as start.sh and is executable

# Build and run Martin container
echo "Starting Martin podman container..."
podman build --no-cache --pull -f containers/martin/Containerfile -t open-source-mapping-presentation/martin:latest ./containers/martin
podman run -d --replace --name open-source-mapping-presentation-martin --env-file ".env" --network host -p 3000:3000 open-source-mapping-presentation/martin:latest

# Build and run the Nginx container
echo "Starting Nginx podman container..."
podman build --no-cache --pull -f containers/nginx/Containerfile -t open-source-mapping-presentation/nginx:latest ./containers/nginx
podman run -d --replace --name open-source-mapping-presentation-nginx -p 8088:80 -v /home/jason/src/peak-etl/open-source-mapping-presentation:/usr/share/nginx/html open-source-mapping-presentation/nginx:latest

echo "All services started successfully!"