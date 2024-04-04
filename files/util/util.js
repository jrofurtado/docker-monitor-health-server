function errorCallback(message, error) {
  let prefix = '' + new Date() + ' ERROR '
  console.log(prefix + message)
  console.log(prefix + error)
  throw error.message
}

module.exports = { errorCallback }