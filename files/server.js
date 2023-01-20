const express = require('express')
const expressSession = require('express-session')
const keycloakConnect = require('keycloak-connect')
const bodyParser = require('body-parser')
const schedule = require('node-schedule')
const http = require('http')
const fs = require('fs-extra')
const path = require('path')
const uuidv1 = require('uuid/v1')
const deepEqual = require('deep-equal')
const jsonDiff = require('json-diff')

const collectDays = process.env.COLLECT_DAYS
const keycloakAuthServerUrl = process.env.KEYCLOAK_AUTH_SERVER_URL
const keycloakRealm = process.env.KEYCLOAK_REALM
const keycloakResource = process.env.KEYCLOAK_RESOURCE
const keycloakSslRequired = process.env.KEYCLOAK_SSL_REQUIRED

function readApps(apps, req, res) {
  let myApps = {}
  for (let app in apps) {
    let dir = 'volume/server/' + app
    let servers = []
    try {
      servers = fs.readdirSync(dir)
    } catch (error) {
    }
    myApps[app] = servers
  }
  res.json(myApps)
}

function readApp(apps, req, res) {
  key = apps[req.query.appName]
  if (key) {
    res.json({ key: key })
  } else {
    res.sendStatus(404)
  }
}

function addApp(apps, req, res) {
  let key = uuidv1()
  apps[req.query.appName] = key
  fs.writeFileSync('volume/apps.json', JSON.stringify(apps))
  res.json({ key: key })
}

function removeApp(apps, req, res) {
  delete apps[req.query.appName]
  fs.writeFileSync('volume/apps.json', JSON.stringify(apps))
  res.sendStatus(200)
}

function removeServer(apps, req, res) {
  let appName = req.query.appName
  let serverName = req.query.serverName
  if (!appName || !serverName) {
    res.sendStatus(400)
  } else {
    let dir = 'volume/server/' + appName + '/' + serverName
    fs.removeSync(dir)
    res.sendStatus(200)
  }
}

function receiveMessage(apps, req, res) {
  let requestBody = req.body
  let appName = requestBody.appName
  let serverName = requestBody.serverName
  let createdTimestamp = requestBody.createdTimestamp
  if (!requestBody.key) {
    res.sendStatus(401)
  } else if (requestBody.key != apps[appName]) {
    res.sendStatus(403)
  } else {
    let dir = 'volume/server/' + appName + '/' + serverName
    fs.outputFileSync(dir + '/last', JSON.stringify(requestBody))
    fs.outputFileSync(dir + '/' + createdTimestamp, JSON.stringify(requestBody))
    res.sendStatus(200)
  }
}

function getInterval(baseDir, from, to) {
  let result = []
  let files = fs.readdirSync(baseDir)
  files.splice(files.indexOf('last'), 1)
  let filesNumeric = files.map(Number)
  filesNumeric.sort()
  let first = -2
  let last = -2
  for (let i = 0; i < filesNumeric.length; i++) {
    let file = filesNumeric[i]
    if (first == -2 && file > from) {
      first = i - 1
    }
    if (last == -2 && file >= to) {
      last = i
    }
  }
  if (first == -1) {
    first = 0
  }
  if (last == -1) {
    last = 0
  }
  if (first == -2) {
    first = filesNumeric.length - 1
  }
  if (last == -2) {
    last = filesNumeric.length - 1
  }
  for (let i = first; i <= last; i++) {
    let file = baseDir + '/' + filesNumeric[i]
    result.push(JSON.parse(fs.readFileSync(file)))
  }
  return result
}

function readLastMessage(apps, req, res) {
  let appName = req.query.appName
  let serverName = req.query.serverName
  if (!appName || !serverName) {
    res.sendStatus(400)
  } else {
    res.json(JSON.parse(fs.readFileSync('volume/server/' + appName + '/' + serverName + '/last')))
  }
}

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

function readLastStatus(apps, req, res) {
  console.log('readLastStatus')
  res.json(JSON.parse(fs.readFileSync('volume/status/last')))
}

function readIntervalStatus(apps, req, res) {
  let from = req.query.from
  let to = req.query.to
  if (!from || !to) {
    res.sendStatus(400)
  } else {
    let result = getInterval('volume/status', from, to)
    res.json(result)
  }
}

function createHttpServer(apps) {
  let expressApp = express()
  let memoryStore = new expressSession.MemoryStore()
  expressApp.use(expressSession({
    secret: 'mysecret',
    resave: false,
    saveUninitialized: true,
    store: memoryStore
  }))

  let config = {
    "realm": keycloakRealm,
    "bearer-only": true,
    "auth-server-url": keycloakAuthServerUrl,
    "ssl-required": keycloakSslRequired,
    "resource": keycloakResource
  }

  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0

  // const config = {
  //   "realm": "docker-monitor-health-server",
  //   "bearer-only": true,
  //   "auth-server-url": "https://globaleda-id.duckdns.org/auth/",
  //   "ssl-required": "external",
  //   "resource": "server",
  //   "confidential-port": 0,
  //   "use-resource-role-mappings": true
  // }

  console.log("Keycloak config: " + JSON.stringify(config))
  let keycloak = new keycloakConnect({ store: memoryStore }, config)
  expressApp.use(bodyParser.json())
  expressApp.use(keycloak.middleware({
    logout: '/logout',
    admin: '/'
  }))
  expressApp.get('/api/ping', (req, res) => {
    res.sendStatus(200)
  })
  expressApp.post('/api/message', (req, res) => {
    receiveMessage(apps, req, res)
  })
  expressApp.get('/api/apps', keycloak.protect('realm:user'), (req, res) => {
    readApps(apps, req, res)
  })
  expressApp.get('/api/app', keycloak.protect('realm:admin'), (req, res) => {
    readApp(apps, req, res)
  })
  expressApp.post('/api/app', keycloak.protect('realm:admin'), (req, res) => {
    addApp(apps, req, res)
  })
  expressApp.delete('/api/app', keycloak.protect('realm:admin'), (req, res) => {
    removeApp(apps, req, res)
  })
  expressApp.delete('/api/server', keycloak.protect('realm:admin'), (req, res) => {
    removeServer(apps, req, res)
  })
  expressApp.get('/api/message/readLast', keycloak.protect('realm:user'), (req, res) => {
    readLastMessage(apps, req, res)
  })
  expressApp.get('/api/message/readInterval', keycloak.protect('realm:user'), (req, res) => {
    readIntervalMessage(apps, req, res)
  })
  expressApp.get('/api/status/readLast', keycloak.protect('realm:user'), (req, res) => {
    readLastStatus(apps, req, res)
  })
  // expressApp.get('/api/status/readLast', keycloak.protect(), (req, res) => {
  //   readLastStatus(apps, req, res)
  // })
  expressApp.get('/api/status/readInterval', keycloak.protect('realm:user'), (req, res) => {
    readIntervalStatus(apps, req, res)
  })
  expressApp.get('/api/users', keycloak.protect('realm:admin'), (req, res) => {
    readUsers(req, res)
  })
  expressApp.post('/api/user', keycloak.protect('realm:admin'), (req, res) => {
    addUser(req, res)
  })
  expressApp.delete('/api/user', keycloak.protect('realm:admin'), (req, res) => {
    removeUser(req, res)
  })
  expressApp.listen(3000, () => {
    console.log('Started at port 3000')
  })
}

function errorCallback(message, error) {
  let prefix = '' + new Date() + ' ERROR '
  console.log(prefix + message)
  console.log(prefix + error)
}

function removeAllOldFiles() {
  let expired = new Date().getTime() - (collectDays * 24 * 60 * 60 * 1000)
  let baseDir = 'volume/server'
  fs.readdir(baseDir, (err, appDirs) => {
    if (appDirs) {
      for (let i = 0; i < appDirs.length; i++) {
        let appDir = baseDir + '/' + appDirs[i]
        fs.readdir(appDir, (err, serverDirs) => {
          if (serverDirs) {
            for (let j = 0; j < serverDirs.length; j++) {
              let serverDir = appDir + '/' + serverDirs[j]
              removeOldFiles(expired, serverDir)
            }
          }
        })
      }
    }
  })
  removeOldFiles(expired, 'volume/status')
}

function removeOldFiles(expired, dir) {
  fs.readdir(dir, (err, files) => {
    if (files) {
      for (let k = 0; k < files.length; k++) {
        let file = files[k]
        if ('last' != file && file < expired) {
          let oldFile = dir + '/' + file
          console.log('Removing old file: ' + oldFile)
          fs.removeSync(oldFile)
        }
      }
    }
  })
}

function checkChanges(apps, appStatus) {
  let newAppStatus = {}
  let baseDir = 'volume/server'
  Object.keys(apps).forEach(appName => {
    appDir = baseDir + '/' + appName
    let serverDirs = null
    if (fs.existsSync(appDir)) {
      serverDirs = fs.readdirSync(appDir)
    }
    if (serverDirs) {
      for (let j = 0; j < serverDirs.length; j++) {
        let serverName = serverDirs[j]
        let serverDir = appDir + '/' + serverDirs[j]
        let last = JSON.parse(fs.readFileSync(serverDir + '/last'))
        let myAppStatus = newAppStatus[appName]
        if (!myAppStatus) {
          myAppStatus = {}
        }
        let healthy = true
        last.containers.forEach(container => {
          if (!container._Healthy) {
            healthy = false
          }
        })
        if (!myAppStatus[serverName]) {
          myAppStatus[serverName] = {}
        }
        myAppStatus[serverName].healthy = healthy
        myAppStatus[serverName].containers = last.containers.length
        newAppStatus[appName] = myAppStatus
      }
    }
  })
  if (!deepEqual(appStatus, newAppStatus)) {
    let notHealty = {}
    Object.keys(newAppStatus).forEach(i => {
      Object.keys(newAppStatus[i]).forEach(j => {
        if (!newAppStatus[i][j].healthy) {
          if (!notHealty[i]) {
            notHealty[i] = [j]
          } else {
            notHealty.i.push(j)
          }
        }
      })
    })
    let diff = jsonDiff.diffString(appStatus, newAppStatus)
    let now = new Date().getTime()
    let newAppStatusContent = JSON.stringify(newAppStatus)
    fs.writeFileSync('volume/status/last', newAppStatusContent)
    fs.writeFileSync('volume/status/' + now, newAppStatusContent)
    console.log('Status of servers has changed:')
    console.log(diff)
    console.log('The following servers have unhealthy containers')
    console.log(notHealty)
  }
  return newAppStatus
}

function readUsers(req, res) {
  try {
    let users = JSON.parse(fs.readFileSync('volume/users.json'))
    res.json(users)
  } catch (error) {
    res.json({})
  }
}

function addUser(req, res) {
  let key = uuidv1()
  let myUsers = {}
  try {
    myUsers = JSON.parse(fs.readFileSync('volume/users.json'))
  } catch (error) {
    myUsers = {}
  }
  myUsers[req.query.username] = key
  fs.writeFileSync('volume/users.json', JSON.stringify(myUsers))
  res.json({ key: key })
}

function removeUser(req, res) {
  let myUsers = {}
  try {
    myUsers = JSON.parse(fs.readFileSync('volume/users.json'))
  } catch (error) {
    myUsers = {}
  }
  delete myUsers[req.query.username]
  fs.writeFileSync('volume/users.json', JSON.stringify(myUsers))
  res.sendStatus(200)
}

function main() {
  removeAllOldFiles()
  schedule.scheduleJob('0 0 * * *', removeAllOldFiles)
  let apps = JSON.parse(fs.readFileSync('volume/apps.json'))
  let appStatus = JSON.parse(fs.readFileSync('volume/status/last'))
  schedule.scheduleJob('0,10,20,30,40,50 * * * * *', () => {
    appStatus = checkChanges(apps, appStatus)
  })
  createHttpServer(apps)
}

main()