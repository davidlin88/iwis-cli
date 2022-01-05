const fs = require('fs-extra')
const cloneDeep = require('lodash.clonedeep')
const { error } = require('./logger')
const { getRcPath } = require('./rcPath')
const exit = require('./exit')

const rcPath = (exports.rcPath = getRcPath('.dvrc'))

exports.defaultPreset = {
  features: ['babel', 'linter'],
  historyMode: false,
  eslintConfig: 'airbnb',
  lintOn: ['save'],
}

exports.defaults = {
  packageManager: undefined,
  useTaobaoRegistry: undefined,
  presets: {
    default: {
      ...exports.defaultPreset,
    },
  },
}

let cachedOptions

exports.loadOptions = () => {
  if (cachedOptions) {
    return cachedOptions
  }
  if (fs.existsSync(rcPath)) {
    try {
      cachedOptions = JSON.parse(fs.readFileSync(rcPath, 'utf-8'))
    } catch (e) {
      error(
        `加载保存配置错误：` +
          `~/.dvrc 可能损坏或有语法错误。` +
          '请修复/删除后，以手动模式重新运行 iwis-cli 。\n' +
          `${e.message}`,
      )
      exit(1)
    }
    return cachedOptions
  }
  return {}
}

exports.saveOptions = toSave => {
  const options = Object.assign(cloneDeep(exports.loadOptions()), toSave)
  for (const key in options) {
    if (!(key in exports.defaults)) {
      delete options[key]
    }
  }
  cachedOptions = options
  try {
    fs.writeFileSync(rcPath, JSON.stringify(options, null, 2))
  } catch (e) {
    error(`保存配置时发生错误：请确保有 ${rcPath} 的写入权限。\n${e.message}`)
  }
}

exports.savePreset = (name, preset) => {
  const newPreset = filter(preset)
  const presets = cloneDeep(exports.loadOptions().presets || {})
  presets[name] = newPreset

  exports.saveOptions({ presets })
}

function filter(preset, keys = ['preset', 'save', 'saveName', 'packageManager']) {
  let _preset = { ...preset }
  keys.forEach(key => {
    delete _preset[key]
  })

  return _preset
}
