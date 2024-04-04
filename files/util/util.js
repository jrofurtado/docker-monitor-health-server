const fs = require('fs-extra')

function errorCallback(message, error) {
  let prefix = '' + new Date() + ' ERROR '
  console.log(prefix + message)
  console.log(prefix + error)
  throw error.message
}

function createDirIfNotExistsSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log('Directório criado:', dirPath);
    } catch (err) {
      console.error('Erro ao criar o diretório:', err);
    }
  } else {
    console.log('Directório já existe.');
  }
}

module.exports = { errorCallback, createDirIfNotExistsSync }