#!/bin/bash
set -e

if [ $# -ne 2 ]; then
  echo 1>&2 "Usage: . $0 appName key"
  return 1
fi

docker rm -f agent-dev || true
DOCKER_HOST=$(ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+')
docker run -d --rm --name=agent-dev -e KEY=$2 -e APP_NAME=$1 -e MONITORING_URL=http://$DOCKER_HOST:3000/api/message -v /var/run/docker.sock:/var/run/docker.sock jrofurtado/docker-monitor-health-agent:latest