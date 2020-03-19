#!/bin/sh
set -e
if [ -z "$DEFAULT_APPS" ]
then
    MY_DEFAULT_APPS={}
else 
    MY_DEFAULT_APPS=$DEFAULT_APPS
fi
if [ -e /volume/apps.json ]
then
    echo "/volume/apps.json already exists"
else
    echo "$MY_DEFAULT_APPS" > /volume/apps.json && mkdir volume/status && echo "{}" > volume/status/last
    echo "Default Apps have been saved in /volume/apps.json"
fi
node server.js
