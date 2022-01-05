const execa = require('execa')
const { hasProjectYarn } = require('./utils/env')
const { log } = require('./utils/logger')
const registries = require('./utils/registries')
const shouldUseTaobao = require('./utils/shouldUseTaobao')
const stripAnsi = require('strip-ansi')
const executeCommand = require('./utils/executeCommand')

const PACKAGE_MANAGER_CONFIG = {
  npm: {
    install: ['install'],
  },
  yarn: {
    install: [],
  },
}

class PackageManager {
  constructor(context, packageManager) {
    this.context = context
    this._registries = {}

    if (packageManager) {
      this.bin = packageManager
    } else if (context) {
      if (hasProjectYarn(context)) {
        this.bin = 'yarn'
      } else {
        this.bin = 'npm'
      }
    }
  }
  // 设置源
  async setRegistry() {
    const cacheKey = ''
    // 有缓存则返回
    if (this._registries[cacheKey]) {
      return this._registries[cacheKey]
    }
    let registry
    if (await shouldUseTaobao(this.bin)) {
      // 获取淘宝源
      registry = registries.taobao
    } else {
      try {
        // 获取当前源
        if (!registry || registry === 'undefinded') {
          registry = (await execa(this.bin, ['config', 'get', 'registry'])).stdout
        }
      } catch (e) {
        // yarn@2
        registry = (await execa(this.bin, ['config', 'get', 'npmRegistryServer'])).stdout
      }
    }

    // 设置缓存
    this._registries[cacheKey] = stripAnsi(registry).trim()
    return this._registries[cacheKey]
  }
  async runCommand(command, args) {
    const prevNodeEnv = process.env.NODE_ENV
    // 临时去除环境变量 NODE_ENV ，解决为 production时不安装devDependencies的问题
    delete process.env.NODE_ENV

    // 设置源
    await this.setRegistry()
    // 运行命令
    await executeCommand(this.bin, [...PACKAGE_MANAGER_CONFIG[this.bin][command], ...(args || [])], this.context)
    if (prevNodeEnv) {
      // 还原环境变量
      process.env.NODE_ENV = prevNodeEnv
    }
  }
  install() {
    log('\n正在下载依赖...\n')
    return this.runCommand('install')
  }
}

module.exports = PackageManager
