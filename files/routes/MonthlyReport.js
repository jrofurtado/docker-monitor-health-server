// declare dependencies
const express = require('express')
const fs = require('fs')
const path = require('path')
const bodyParser = require('body-parser')

// const router = express.Router()

const expressApp = express()
expressApp.use(bodyParser.json())

// expressApp.get('/', (req, res) => {
//   res.json({ message: 'Hello World!' })
// })

expressApp.get('/', (req, res) => {
  const from = parseInt(req.query.from)
  const to = parseInt(req.query.to)
  const appName = req.query.appName

  const baseDir = `volume/server/${appName}`
  const result = {
    apps: {},
    timestamp: 0
  }
  res.json(result)
})

module.exports = expressApp