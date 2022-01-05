const fs = require('fs-extra')
const path = require('path')

function getPackage(context) {
  const packagePath = path.join(context, 'package.json')
  let packageJson
  try {
    packageJson = fs.readFileSync(packagePath, 'utf-8')
  } catch (e) {
    throw new Error(`文件 package.json 不存在!`)
  }

  try {
    packageJson = JSON.parse(packageJson)
  } catch (e) {
    throw new Error(`文件 package.json 格式异常!`)
  }

  return packageJson
}

module.exports = getPackage
