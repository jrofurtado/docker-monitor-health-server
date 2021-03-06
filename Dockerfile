FROM node:8.17.0-alpine3.10

CMD /entrypoint.sh
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD node /healthcheck.js
RUN mkdir /volume

ENV DEFAULT_APPS={}
ENV COLLECT_DAYS=30
ENV KEYCLOAK_AUTH_SERVER_URL="https://mykeycloakserver.com/auth"
ENV KEYCLOAK_REALM="docker-monitor-health-server"
ENV KEYCLOAK_RESOURCE="server"
ENV KEYCLOAK_SSL_REQUIRED="external"

COPY files/ /
RUN npm install
