# docker-monitor-health-server
Server used to monitor health status of docker containers. Use it with jrofurtado/docker-monitor-health-agent
Check [docker-compose.yml](docker-compose.yml)

# Environment variables
* COLLECT_DAYS: default 30. Number of days to keep logs
* KEYCLOAK_AUTH_SERVER_URL: Keycloak auth url
* KEYCLOAK_REALM: default "docker-monitor-health-server"
* KEYCLOAK_RESOURCE: default "server". Keycloak client