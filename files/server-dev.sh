#!/bin/sh
export COLLECT_DAYS=30
export ADMIN_PASS="admin"
export KEYCLOAK_AUTH_SERVER_URL="http://localhost:8000/auth"
export KEYCLOAK_REALM="docker-monitor-health-server"
export KEYCLOAK_RESOURCE="docker-monitor-health-server"

export SEND_EMAIL="false"
export SMTP_FROM=""
export SMTP_TO=""
export SMTP_PORT=""
export SMTP_HOST=""
export SMTP_AUTH_TYPE="login"
export SMTP_USER=""
export SMTP_PASS=""
export SMTP_AUTH_METHOD="PLAIN"
export SMTP_SECURE=true
export SMTP_IGNORE_TLS=false
export SMTP REQUIRE_TLS=false

rm -rf volume/* && mkdir -p volume/status && echo "{}" > volume/apps.json && echo "{}" > volume/status/last
node server.js
