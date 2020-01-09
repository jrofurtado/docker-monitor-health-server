# docker-monitor-health-server
Agent used to monitor health status of docker containers

# Environment variables
* ADMIN_PASS default "admin": The admins password
* COLLECT_DAYS default 30: Number of days to keep logs
* SEND_EMAIL default true: send email if containers status changed healthy/not healthy
* SMTP_FROM
* SMTP_TO
* SMTP_PORT
* SMTP_HOST
* SMTP_USER
* SMTP_PASS
* SMTP_SECURE default true: Use tls
* SMTP_IGNORE_TLS
* SMTP REQUIRE_TLS
