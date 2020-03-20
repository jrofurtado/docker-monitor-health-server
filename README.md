# docker-monitor-health-server
Server used to monitor health status of docker containers. Use it with jrofurtado/docker-monitor-health-agent
Check [docker-compose.yml](docker-compose.yml)

# Environment variables
* DEFAULT_APPS: default {}. The default apps when initializing the server. Example {"myApp1":"fab4d210-69db-11ea-8339-811ba1916331", "myApp2":"ebb2d220-86dd-112-8289-123678ab9641"}
* COLLECT_DAYS: default 30. Number of days to keep logs
* KEYCLOAK_AUTH_SERVER_URL: Keycloak auth url
* KEYCLOAK_REALM: default "docker-monitor-health-server"
* KEYCLOAK_RESOURCE: default "server". Keycloak client
* KEYCLOAK_SSL_REQUIRED: default "external". Keycloak attribute ssl-required. Valid values are "all", "external" and "none"