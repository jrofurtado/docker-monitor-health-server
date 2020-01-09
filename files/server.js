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
const adminPass = process.env.ADMIN_PASS
const keycloakAuthServerUrl = process.env.KEYCLOAK_AUTH_SERVER_URL
const keycloakRealm = process.env.KEYCLOAK_REALM
const keycloakResource = process.env.KEYCLOAK_RESOURCE

const sendEmail = process.env.SEND_EMAIL
const smtpFrom = process.env.SMTP_FROM
const smtpTo = process.env.SMTP_TO
const smtpPort = process.env.SMTP_PORT
const smtpHost = process.env.SMTP_HOST
const smtpAuthType = process.env.SMTP_AUTH_TYPE
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const amtpAuthMethod = process.env.SMTP_AUTH_METHOD
const smtpSecure = process.env.SMTP_SECURE
const smtpIgnoreTls = process.env.SMTP_IGNORE_TLS
const requireTls = process.env.REQUIRE_TLS

function checkApp(requestBody, responseBody, response) {
  if (adminPass != requestBody.adminPass) {
    response.statusCode = 403
    return false
  } else if (!requestBody.appName) {
    response.statusCode = 400
    return false
  } else {
    return true
  }
}

function readApps(apps, requestBody, responseBody, response) {
  let myApps = []
  for (let app in apps) {
    myApps.push(app)
  }
  response.write(JSON.stringify(myApps))
}

function readApp(apps, requestBody, responseBody, response) {
  if (checkApp(requestBody, responseBody, response)) {
    key = apps[requestBody.appName]
    if (key) {
      response.write(JSON.stringify({ key: key }))
    } else {
      response.statusCode = 404
    }
  }
}

function addApp(apps, requestBody, responseBody, response) {
  if (checkApp(requestBody, responseBody, response)) {
    let key = uuidv1()
    apps[requestBody.appName] = key
    fs.writeFileSync('volume/apps.json', JSON.stringify(apps))
    response.write(JSON.stringify({ key: key }))
  }
}

function removeApp(apps, requestBody, responseBody, response) {
  if (checkApp(requestBody, responseBody, response)) {
    delete apps[requestBody.appName]
    fs.writeFileSync('volume/apps.json', JSON.stringify(apps))
  }
}

function removeServer(apps, requestBody, responseBody, response) {
  if (checkApp(requestBody, responseBody, response)) {
    let appName = requestBody.appName
    let serverName = requestBody.serverName
    if (!serverName) {
      response.statusCode = 400
    } else {
      let dir = 'volume/server/' + appName + '/' + serverName
      fs.removeSync(dir)
    }
  }
}

function receiveMessage(apps, requestBody, responseBody, response) {
  let appName = requestBody.appName
  let serverName = requestBody.serverName
  let createdTimestamp = requestBody.createdTimestamp
  if (!requestBody.key) {
    response.statusCode = 401
  } else if (requestBody.key != apps[appName]) {
    response.statusCode = 403
  } else {
    let dir = 'volume/server/' + appName + '/' + serverName
    fs.outputFileSync(dir + '/last', JSON.stringify(requestBody))
    fs.outputFileSync(dir + '/' + createdTimestamp, JSON.stringify(requestBody))
    response.statusCode = 200
  }
}

function readMessageLast(apps, requestBody, responseBody, response) {
}

function readMessageInterval(apps, requestBody, responseBody, response) {
}

function readStatusLast(apps, requestBody, responseBody, response) {
}

function readStatusInterval(apps, requestBody, responseBody, response) {
}

function createServer(apps) {
  let expressApp = express()
  let memoryStore = new expressSession.MemoryStore()
  let session = {
    secret: 'mysecret',
    resave: false,
    saveUninitialized: true,
    store: memoryStore
  }
  let keycloak = new keycloakConnect({
    store: memoryStore
  }, {
    "realm": keycloakRealm,
    "bearer-only": true,
    "auth-server-url": keycloakAuthServerUrl,
    "ssl-required": "external",
    "resource": keycloakResource
  })
  expressApp.use(bodyParser.json())
  expressApp.use(keycloak.middleware({
    logout: '/logout',
    admin: '/'
  }))
  expressApp.get('/api/ping', (req, res) => {
    res.json({ status: 'ok' })
  })
  expressApp.listen(3000, () => {
    console.log('Started at port 3000')
  })




  http.createServer((request, response) => {
    const { headers, method, url } = request
    let body = []
    request.on('error', (err) => {
      errorCallback('Error receiving request', err)
    }).on('data', (chunk) => {
      body.push(chunk)
    }).on('end', () => {
      try {
        requestBody = JSON.parse(Buffer.concat(body).toString())
        responseBody = null;
        response.setHeader('Content-Type', 'application/json');
        if (request.method === 'POST' && request.url === '/api/message') {
          receiveMessage(apps, requestBody, responseBody, response)
        } else if (request.method === 'POST' && request.url === '/api/apps') {
          readApps(apps, requestBody, responseBody, response)
        } else if (request.method === 'POST' && request.url === '/api/message/readLast') {
          readMessageLast(apps, requestBody, responseBody, response)
        } else if (request.method === 'POST' && request.url === '/api/message/readInterval') {
          readMessageInterval(apps, requestBody, responseBody, response)
        } else if (request.method === 'POST' && request.url === '/api/status/readLast') {
          readStatusLast(apps, requestBody, responseBody, response)
        } else if (request.method === 'POST' && request.url === '/api/status/readInterval') {
          readStatusInterval(apps, requestBody, responseBody, response)
        } else if (request.method === 'POST' && request.url === '/api/app/read') {
          readApp(apps, requestBody, responseBody, response)
        } else if (request.method === 'POST' && request.url === '/api/app/add') {
          addApp(apps, requestBody, responseBody, response)
        } else if (request.method === 'POST' && request.url === '/api/app/delete') {
          removeApp(apps, requestBody, responseBody, response)
        } else if (request.method === 'POST' && request.url === '/api/app/server/delete') {
          removeServer(apps, requestBody, responseBody, response)
        } else if (request.method === 'GET' && request.url === '/api/ping1') {
        } else {
          response.statusCode = 404
        }
      } catch (error) {
        errorCallback('Error receiving ' + request.method + ' ' + request.url, error)
        response.statusCode = 500
      }
      response.end(responseBody)
    })
  }).listen(8080)
}

function errorCallback(message, error) {
  console.log(message)
  console.log(error)
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
    let serverDirs = fs.readdirSync(appDir)
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
    fs.writeFileSync('volume/status/last', JSON.stringify(appStatus))
    fs.writeFileSync('volume/status/' + now, JSON.stringify(appStatus))
    console.log('Status of servers has changed:')
    console.log(diff)
    console.log('The following servers have unhealthy containers')
    console.log(notHealty)
  }
  return newAppStatus
}

function main() {
  removeAllOldFiles()
  schedule.scheduleJob('0 0 * * *', removeAllOldFiles)
  let apps = JSON.parse(fs.readFileSync('volume/apps.json'))
  let appStatus = JSON.parse(fs.readFileSync('volume/status/last'))
  schedule.scheduleJob('0,10,20,30,40,50 * * * * *', () => {
    appStatus = checkChanges(apps, appStatus)
  })
  createServer(apps)
}

main()