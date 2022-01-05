const { execSync } = require('child_process')
const fs = require('fs-extra')
const path = require('path')

let _hasYarn
exports.hasYarn = () => {
  if (_hasYarn !== undefined) {
    return _hasYarn
  }
  // 尝试执行 yarn 命令，报错就是没有 yarn
  try {
    execSync('yarn --version', { stdio: 'ignore' })
    _hasYarn = true
    return _hasYarn
  } catch (error) {
    _hasYarn = false
    return _hasYarn
  }
}

exports.hasProjectYarn = cwd => {
  const lockFile = path.join(cwd, 'yarn.lock')
  const result = fs.existsSync(lockFile)
  return checkYarn(result)
}

function checkYarn(result) {
  if (result && !exports.hasYarn()) throw new Error('看起来项目引用了 yarn ，但是并没有安装')
  return result
}
