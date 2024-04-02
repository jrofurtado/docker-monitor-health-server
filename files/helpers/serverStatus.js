const fs = require('fs-extra')
const path = require('path')

function getIntervalFromCount(baseDir, from, count) {
  try {
    let files = fs.readdirSync(baseDir)
  } catch (error) {
    return []
  }
  try {
    files.splice(files.indexOf('last'), 1)
  } catch (error) {
    return []
  }

  try {
    // sort files descending by filename
    const sortedFiles = files.sort((a, b) => {
      return parseInt(b) - parseInt(a)
    })
  } catch (error) {
    return []
  }
  // get first file with timestamp <= from
  let first = -2
  try {
    for (let i = 0; i < sortedFiles.length; i++) {
      let file = sortedFiles[i]
      if (first == -2 && file <= from) {
        first = i
      }
    }
  } catch (error) {
    return []
  }
  if (first == -2) {
    return [{
      timestamp: 0,
      apps: {}
    }]
  }
  const resultFiles = []
  // push count files to resultFiles
  try {
    for (let i = 0; i < count; i++) {
      if (first + i < sortedFiles.length) {
        resultFiles.push({
          timestamp: parseInt(sortedFiles[first + i]),
          apps: JSON.parse(fs.readFileSync(baseDir + '/' + sortedFiles[first + i]))
        })
      }
    }
  } catch (error) {
    return []
  }
  return resultFiles
}

function getInterval(baseDir, from, to) {
  let result = []
  try {
    let files = fs.readdirSync(baseDir)
  } catch (error) {
    return []
  }
  try {
    files.splice(files.indexOf('last'), 1)
  } catch (error) {
    return []
  }

  try {
    let filesNumeric = files.map(Number)
    filesNumeric.sort()
  } catch (error) {
    return []
  }
  let first = -2
  let last = -2
  try {
    for (let i = 0; i < filesNumeric.length; i++) {
      let file = filesNumeric[i]
      if (first == -2 && file > from) {
        first = i - 1
      }
      if (last == -2 && file >= to) {
        last = i
      }
    }
  } catch (error) {
    return []
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
  try {
    for (let i = first; i <= last; i++) {
      let file = baseDir + '/' + filesNumeric[i]
      result.push(JSON.parse(fs.readFileSync(file)))
    }
  } catch (error) {
    return []
  }
  return result
}

module.exports = { getIntervalFromCount, getInterval }