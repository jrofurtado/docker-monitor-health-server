#!/bin/sh
set -e
docker run -d --rm --name=keycloak-dev -p 8080:8080 -v `pwd`/docker-monitor-health-server.json:/tmp/docker-monitor-health-server.json -e KEYCLOAK_IMPORT=/tmp/docker-monitor-health-server.json -e KEYCLOAK_USER=admin -e KEYCLOAK_PASSWORD=password jrofurtado/keycloak-with-healthcheck:8.0.1 || true
export COLLECT_DAYS=30
export KEYCLOAK_AUTH_SERVER_URL="http://localhost:8080/auth"
export KEYCLOAK_REALM="docker-monitor-health-server"
export KEYCLOAK_RESOURCE="server"
export KEYCLOAK_SSL_REQUIRED="none"

rm -rf volume/* && mkdir -p volume/status && echo "{\"app1\": \"key1\"}" > volume/apps.json && echo "{}" > volume/status/last

node server.js
