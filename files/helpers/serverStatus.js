const fs = require('fs-extra')
const path = require('path')

function getIntervalFromCount(baseDir, from, count) {
  let files = fs.readdirSync(baseDir)
  files.splice(files.indexOf('last'), 1)

  // sort files descending by filename
  const sortedFiles = files.sort((a, b) => {
    return parseInt(b) - parseInt(a)
  })
  // get first file with timestamp <= from
  let first = -2
  for (let i = 0; i < sortedFiles.length; i++) {
    let file = sortedFiles[i]
    if (first == -2 && file <= from) {
      first = i
    }
  }
  if (first == -2) {
    return [{
      timestamp: 0,
      apps: {}
    }]
  }
  const resultFiles = []
  // push count files to resultFiles
  for (let i = 0; i < count; i++) {
    if (first + i < sortedFiles.length) {
      resultFiles.push({
        timestamp: parseInt(sortedFiles[first + i]),
        apps: JSON.parse(fs.readFileSync(baseDir + '/' + sortedFiles[first + i]))
      })
    }
  }
  return resultFiles
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

module.exports = { getIntervalFromCount, getInterval }