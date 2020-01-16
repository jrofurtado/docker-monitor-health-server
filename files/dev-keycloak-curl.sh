#!/bin/bash
set -e

if [ $# -ne 2 ]; then
  echo 1>&2 "Usage: . $0 username password"
  return 1
fi

HOSTNAME=localhost:8080
REALM_NAME=docker-monitor-health-server
CLIENT_ID=app
USERNAME=$1
PASSWORD=$2

KEYCLOAK_URL=http://$HOSTNAME/auth/realms/$REALM_NAME/protocol/openid-connect/token

CURL="curl -X POST $KEYCLOAK_URL -H \"Content-Type: application/x-www-form-urlencoded\" -d \"username=$USERNAME\" -d \"password=$PASSWORD\" -d 'grant_type=password' -d \"client_id=$CLIENT_ID\""
TOKEN=$(eval $CURL | jq -r '.access_token')

if [ $TOKEN = null ]; then
  return 1
else
  echo $TOKEN
fi
