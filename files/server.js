const express = require('express')
const expressSession = require('express-session')
const keycloakConnect = require('keycloak-connect')
const bodyParser = require('body-parser')
const schedule = require('node-schedule')
const http = require('http')
const fs = require('fs-extra')
const deepEqual = require('fast-deep-equal')
const jsonDiff = require('json-diff')
//const dotenv = require('dotenv')
const cors = require('cors')
const webpush = require('web-push')
const { v1: uuidv1 } = require('uuid');
require('dotenv').config()


const { getIntervalFromCount, getInterval } = require('./helpers/serverStatus')

const collectDays = process.env.COLLECT_DAYS
const keycloakAuthServerUrl = process.env.KEYCLOAK_AUTH_SERVER_URL

const keycloakRealm = process.env.KEYCLOAK_REALM
const keycloakResource = process.env.KEYCLOAK_RESOURCE
const keycloakSslRequired = process.env.KEYCLOAK_SSL_REQUIRED

const emailUser = process.env.EMAIL_USER
const emailPassword = process.env.EMAIL_PASSWORD
const nodemailer = require('nodemailer')





webpush.setVapidDetails(process.env.WEB_PUSH_CONTACT, process.env.WEB_PUSH_PUBLIC_VAPID_KEY, process.env.WEB_PUSH_PRIVATE_VAPID_KEY)


function readApps(apps, req, res) {
  let myApps = {}
  console.log('apps', apps)
  for (let app in apps) {
    console.log('app', app)
    let dir = '/volume/server/' + app
    let servers = []
    try {
      servers = fs.readdirSync(dir)
    } catch (error) {
    }
    myApps[app] = servers
  }
  res.json(myApps)
}

function readRoleApps(apps, roleApps, req, res) {
  let myApps = {}
  for (let app in apps) {
    //check if app is in roleApps
    if (roleApps.indexOf(app) > -1) {
      let dir = '/volume/server/' + app
      let servers = []
      try {
        servers = fs.readdirSync(dir)
      } catch (error) {
      }
      myApps[app] = servers
    }
  }
  res.json(myApps)
}

function getAppsAllowed(req) {
  let roles = req.kauth.grant.access_token.content.realm_access.roles
  roles = roles.filter(role => role.startsWith('_'))
  roles = roles.map(role => role.slice(1))
  return roles
}

/**
 * Function to send email
 * The parameter is an object with the following properties:
 * 
 * - appName    -> Name of the application
 * - serverName -> Name of the server
 * - info       -> Information about the alert
 * - destination-> Email address to send the alert
 * 
 * @param {object} data 
 */
function sendEmail(data) {

  let subject = 'Alerta! dockerMon...'
  let body = ```
                 Caro administrador do sistema.<br><br>
                 Foi despoltado um alerta com origem no container:
                 <b>${data.appName}</b></br></br>
                 No servidor:</br> 
                 <b>${data.serverName}</b></br></br> 
                 Contendo a seguinte informação:</br>
                 <b>${data.info}</b> 
                ```
  const nodemailer = require('nodemailer')

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  })

  const mailOptions = {
    from: emailUser,
    to: data.destination,
    subject: subject,
    html: body
  }

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error)
    } else {
      console.log('Email enviado com sucesso: ' + info.response)
    }
  })
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
  let key = uuidv1();
  apps[req.query.appName] = key
  fs.writeFileSync('/volume/apps.json', JSON.stringify(apps))
  res.json({ key: key })
}

function removeApp(apps, req, res) {
  delete apps[req.query.appName]
  fs.writeFileSync('/volume/apps.json', JSON.stringify(apps))
  res.sendStatus(200)
}

function removeServer(apps, req, res) {
  let appName = req.query.appName
  let serverName = req.query.serverName
  if (!appName || !serverName) {
    res.sendStatus(400)
  } else {
    let dir = '/volume/server/' + appName + '/' + serverName
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
    let dir = '/volume/server/' + appName + '/' + serverName
    fs.outputFileSync(dir + '/last', JSON.stringify(requestBody))
    fs.outputFileSync(dir + '/' + createdTimestamp, JSON.stringify(requestBody))
    res.sendStatus(200)
  }
}

function readLastMessage(apps, req, res) {
  let appName = req.query.appName
  let serverName = req.query.serverName
  if (!appName || !serverName) {
    res.sendStatus(400)
  } else {
    res.json(JSON.parse(fs.readFileSync('/volume/server/' + appName + '/' + serverName + '/last')))
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
    let result = getInterval('/volume/server/' + appName + '/' + serverName, from, to)
    res.json(result)
  }
}

function readLastStatus(apps, req, res) {
  console.log('rls - apps', apps)
  let lastApps = JSON.parse(fs.readFileSync('/volume/status/last'))
  let userApps = getAppsAllowed(req)
  let appsFiltered = {}
  for (let app in userApps) {
    const appName = userApps[app]
    if (lastApps[appName]) {
      appsFiltered[appName] = lastApps[appName]
    }
  }
  res.json(appsFiltered)
}

function readIntervalStatus(apps, req, res) {
  let from = req.query.from
  let to = req.query.to
  if (!from || !to) {
    res.sendStatus(400)
  } else {
    let result = getInterval('/volume/status', from, to)
    res.json(result)
  }
}

function subscribe(apps, req, res) {
  let appName = req.query.appName
  let serverName = req.query.serverName
  let email = req.query.email
  if (!appName || !serverName || !email) {
    res.sendStatus(400)
  } else {
    let dir = '/volume/server/' + appName + '/' + serverName
    fs.outputFileSync(dir + '/subscribe', email)
    res.sendStatus(200)
  }
}

function readIntervalStatusFixedCount(apps, req, res) {
  let from = req.query.from
  let count = req.query.count
  if (!from || !count) {
    res.sendStatus(400)
  } else {
    let result = getIntervalFromCount('/volume/status', from, count)
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
  expressApp.use(bodyParser.json());
  expressApp.use(cors());

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
  expressApp.get('/api/status/readInterval', keycloak.protect('realm:user'), (req, res) => {
    readIntervalStatus(apps, req, res)
  })
  expressApp.get('/api/status/readIntervalFixedCount', keycloak.protect('realm:user'), (req, res) => {
    readIntervalStatusFixedCount(apps, req, res)
  })


  expressApp.post('/api/notifications/subscribe',keycloak.protect('realm:user'), (req, res) => {
    const subscription = req.body
  
    console.log(subscription)
  
    const payload = JSON.stringify({
      title: 'Hello!',
      body: 'It works.',
    })
  
    webpush.sendNotification(subscription, payload)
      .then(result => console.log(result))
      .catch(e => console.log(e.stack))
  
    res.status(200).json({'success': true})
  });

  expressApp.listen(3000, () => {
    console.log('Started at port 3000')
    console.log('novo build')
  })





  
}

function errorCallback(message, error) {
  let prefix = '' + new Date() + ' ERROR '
  console.log(prefix + message)
  console.log(prefix + error)
}

function removeAllOldFiles() {
  let expired = new Date().getTime() - (collectDays * 24 * 60 * 60 * 1000)
  let baseDir = '/volume/server'
  fs.readdirSync(baseDir, (err, appDirs) => {
    if (appDirs) {
      for (let i = 0; i < appDirs.length; i++) {
        let appDir = baseDir + '/' + appDirs[i]
        fs.readdirSync(appDir, (err, serverDirs) => {
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
  removeOldFiles(expired, '/volume/status')
}

function removeOldFiles(expired, dir) {
  fs.readdirSync(dir, (err, files) => {
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
  let baseDir = '/volume/server'
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
            notHealty[i].push(j)
          }
        }
      })
    })
    let diff = jsonDiff.diffString(appStatus, newAppStatus)
    let now = new Date().getTime()
    let newAppStatusContent = JSON.stringify(newAppStatus)
    fs.writeFileSync('/volume/status/last', newAppStatusContent)
    fs.writeFileSync('/volume/status/' + now, newAppStatusContent)
    console.log('Status of servers has changed:')
    console.log(diff)
    console.log('The following servers have unhealthy containers')
    console.log(notHealty)
  }
  return newAppStatus
}

// read attributes from keycloak role

function main() {
  removeAllOldFiles()
  schedule.scheduleJob('0 0 * * *', removeAllOldFiles)
  let apps = JSON.parse(fs.readFileSync('/volume/apps.json'))
  let appStatus = JSON.parse(fs.readFileSync('/volume/status/last'))
  schedule.scheduleJob('0,10,20,30,40,50 * * * * *', () => {
    appStatus = checkChanges(apps, appStatus)
  })
  createHttpServer(apps)
}

main()