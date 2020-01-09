FROM node:8.17.0-alpine3.10

CMD /entrypoint.sh
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD node /healthcheck.js
RUN mkdir /volume && echo "{}" > /volume/apps.json && mkdir volume/status && echo "{}" > volume/status/last

ENV COLLECT_DAYS=30
ENV ADMIN_PASS="admin"
ENV KEYCLOAK_AUTH_SERVER_URL="https://mykeycloakserver.com/auth"
ENV KEYCLOAK_REALM="docker-monitor-health-server"
ENV KEYCLOAK_RESOURCE="docker-monitor-health-server"

ENV SEND_EMAIL="true"
ENV SMTP_FROM=""
ENV SMTP_TO=""
ENV SMTP_PORT=""
ENV SMTP_HOST=""
ENV SMTP_AUTH_TYPE="login"
ENV SMTP_USER=""
ENV SMTP_PASS=""
ENV SMTP_AUTH_METHOD="PLAIN"
ENV SMTP_SECURE=true
ENV SMTP_IGNORE_TLS=false
ENV SMTP REQUIRE_TLS=false

COPY files/ /
RUN npm install
