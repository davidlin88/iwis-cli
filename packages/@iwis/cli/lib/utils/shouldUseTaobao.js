const execa = require('execa')
const inquirer = require('inquirer')
const chalk = require('chalk')
const { hasYarn } = require('./env')
const { loadOptions, saveOptions } = require('./options')
const registries = require('./registries')
const request = require('./request.js')

const removeSlash = url => {
  return url.replace(/\/$/, '')
}

const ping = async registry => {
  await request.get(`${registry}/vue-cli-version-marker/latest`)
  return registry
}

let checked
let result
module.exports = async function shouldUseTaobao(command) {
  let newCommand = command
  if (!command) {
    newCommand = hasYarn() ? 'yarn' : 'npm'
  }

  // 确保只调用一次
  if (checked) return result
  checked = true

  // 获取已保存的镜像配置
  const saved = loadOptions().useTaobaoRegistry
  if (typeof saved === 'boolean') {
    result = saved
    return result
  }

  const save = val => {
    result = val
    saveOptions({ useTaobaoRegistry: val })
    return val
  }

  // 当前镜像
  let userCurrent

  try {
    userCurrent = (await execa(newCommand, ['config', 'get', 'registry'])).stdout
  } catch (registryError) {
    try {
      // yarn 2 用 npmRegistryServer 替代了 registry
      userCurrent = (await execa(newCommand, ['config', 'get', 'npmRegistryServer'])).stdout
    } catch (npmRegistryServer) {
      return save(false)
    }
  }

  const defaultRegistry = registries[newCommand]
  if (removeSlash(userCurrent) !== removeSlash(defaultRegistry)) {
    // 用户自定义了镜像源，尊重它
    return save(false)
  }

  // 哪个ping更低选哪个源
  let faster
  try {
    faster = await Promise.race([ping(defaultRegistry), ping(registries.taobao)])
  } catch (e) {
    return save(false)
  }

  if (faster !== registries.taobao) {
    return save(false)
  }

  //  TODO
  if (process.env.DV_CLI_API_MODE) {
    return save(true)
  }

  const { useTaobaoRegistry } = await inquirer.prompt([
    {
      name: 'useTaobapRegistry',
      type: 'confirm',
      message: chalk.yellow(
        `您连接 ${newCommand} 的默认源看起来较慢。\n` +
          `是否切换为更快的源用于安装依赖？（ ${chalk.cyan(registries.taobao)} ）`,
      ),
    },
  ])

  if (useTaobaoRegistry) {
    await execa(newCommand, ['config', 'set', 'registry', registries.taobao])
  }

  return save(useTaobaoRegistry)
}
