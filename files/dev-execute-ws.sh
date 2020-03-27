#!/bin/sh
set -e

if [ $# -ne 6 ]; then
  echo 1>&2 "Usage: . $0 host username password flags method path"
  return 1
fi
TOKEN=$(sh dev-keycloak-curl.sh $1:8080 $2 $3)
CURL="curl $4 -X$5 \"http://$1:3000$6\" -H \"Authorization: Bearer $TOKEN\""
eval $CURL
