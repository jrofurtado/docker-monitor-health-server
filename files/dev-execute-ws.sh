#!/bin/sh
set -e

if [ $# -ne 6 ]; then
  echo 1>&2 "Usage: . $0 username password flags method path"
  return 1
fi

TOKEN=$(sh dev-keycloak-curl.sh $1 $2)
CURL="curl $3 -X$4 \"http://localhost:3000$5\" -H \"Authorization: Bearer $TOKEN\""
eval $CURL