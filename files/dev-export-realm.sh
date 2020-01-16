#!/bin/sh
set -e
docker exec -it keycloak-dev /opt/jboss/keycloak/bin/standalone.sh \
-Djboss.socket.binding.port-offset=100 \
-Dkeycloak.migration.action=export \
-Dkeycloak.migration.provider=singleFile \
-Dkeycloak.migration.realmName=docker-monitor-health-server \
-Dkeycloak.migration.usersExportStrategy=REALM_FILE \
-Dkeycloak.migration.file=/tmp/docker-monitor-health-server.json
docker cp keycloak-dev:/tmp/docker-monitor-health-server.json docker-monitor-health-server.json
