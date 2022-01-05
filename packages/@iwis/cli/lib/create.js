const path = require('path')
const inquirer = require('inquirer')
const PromptModuleAPI = require('./PromptModuleAPI')
const Creator = require('./Creator')
const Generator = require('./Generator')
const clearConsole = require('./utils/clearConsole')
const fs = require('fs-extra')
const chalk = require('chalk')
const { saveOptions, savePreset, rcPath } = require('./utils/options')
const { log } = require('./utils/logger')
const PackageManager = require('./PackageManager')
const writeFileTree = require('./utils/writeFileTree')

async function create(name) {
  const targetDir = path.join(process.cwd(), name)
  if (fs.existsSync(targetDir)) {
    clearConsole()

    // TODO 发现中文提示语在terminal有无法清空message的问题
    const { action } = await inquirer.prompt([
      {
        name: 'action',
        type: 'list',
        message: `Target directory ${chalk.cyan(targetDir)} already exist. Pick an action:`,
        choices: [
          {
            name: 'Overwrite',
            value: 'overwrite',
          },
          { name: 'Merge', value: 'merge' },
        ],
      },
    ])
    if (action === 'overwrite') {
      console.log(`\n Removing ${chalk.cyan(targetDir)}...`)
      await fs.remove(targetDir)
    }
  }
  // creator实例，用于存储：「备选插件」主提示 + 插件配置提示
  const creator = new Creator()
  // 「备选插件」的相关提示注入模块，接受注入api
  const promptModules = getPromptModules()
  // 暴露注入提示的api
  const promptAPI = new PromptModuleAPI(creator)
  // 注入『备选插件』的相关提示
  promptModules.forEach(m => m(promptAPI))

  // 清空控制台
  clearConsole()

  // 弹窗交互提示语并获取用户选择
  const answers = await inquirer.prompt(creator.getFinalPrompts())

  if (answers.preset !== '__manual__') {
    const preset = creator.getPresets()[answers.preset]
    Object.keys(preset).forEach(key => {
      answers[key] = preset[key]
    })
  }

  if (answers.packageManager) {
    saveOptions({
      packageManager: answers.packageManager,
    })
  }

  if (answers.save && answers.saveName) {
    savePreset(answers.saveName, answers)
    log()
    log(`配置 ${chalk.yellow(answers.saveName)} 保存在了 ${chalk.yellow(rcPath)}`)
  }

  const pm = new PackageManager(targetDir, answers.packageManager)

  // package.json 文件内容
  const pkg = {
    name,
    version: '1.0.0',
    dependencies: {},
    devDependencies: {},
  }

  const generator = new Generator(pkg, targetDir)
  // 插入 cli-service 必选项
  answers.features.unshift('service')

  // 遍历选中特性，调用生成器、
  // pkg注入配置、依赖；main.js注入import；生成模板文件
  answers.features.forEach(feature => {
    if (feature !== 'service') {
      // pkg.devDependencies[`@iwis/cli-plugin-${feature}`] = '~1.0.0'
    } else {
      pkg.devDependencies['@iwis/cli-service'] = '^1.0.0'
    }
  })

  await writeFileTree(targetDir, {
    'package.json': JSON.stringify(pkg, null, 2),
  })

  await pm.install()

  // 将选中模块的依赖加入 package.json
  // 并将对应 template 渲染
  answers.features.forEach(feature => {
    if (feature !== 'service') {
      require(`@iwis/cli-plugin-${feature}/generator`)(generator, answers)
    } else {
      require(`@iwis/cli-service/generator`)(generator, answers)
    }
  })
  await generator.generate()
  await pm.install()

  console.log(`\n依赖下载完成! 执行下列命令开始开发: \n`)
  console.log(`cd ${name}`)
  console.log(`${pm.bin === 'npm' ? 'npm run' : 'yarn'} serve`)
}

function getPromptModules() {
  return ['babel', 'router', 'vuex', 'linter'].map(file => require(`./promptModules/${file}`))
}

module.exports = create
