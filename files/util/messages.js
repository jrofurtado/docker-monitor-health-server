const fs = require('fs-extra')
const { getInterval } = require('../helpers/serverStatus')

function readIntervalMessage(apps, req, res) {
  let appName = req.query.appName
  let serverName = req.query.serverName
  let from = req.query.from
  let to = req.query.to
  if (!appName || !serverName || !from || !to) {
    res.sendStatus(400)
  } else {
    let result = getInterval('volume/server/' + appName + '/' + serverName, from, to)
    res.json(result)
  }
}

function readIntervalMessageFromApp(appName,from,to) {
  // const baseDir = `volume/server/${appName}`
  // const serversList = fs.readdirSync(baseDir)
  let result = getInterval('volume/server/' + appName, from, to)
  return result
}

module.exports = { readIntervalMessage, readIntervalMessageFromApp }