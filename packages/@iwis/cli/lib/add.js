const getPackage = require('./utils/getPackage')
const clearConsole = require('./utils/clearConsole')
const inquirer = require('inquirer')
const Generator = require('./Generator')
const readFiles = require('./utils/readFiles')
const PackageManager = require('./PackageManager')

async function add(name) {
  const targetDir = process.cwd()
  const pkg = getPackage(targetDir)

  clearConsole()

  let answers = {}

  try {
    const pluginPrompts = require(`@iwis/cli-plugin-${name}/prompts`)
    answers = await inquirer.prompt(pluginPrompts)
  } catch (e) {
    console.log(e)
  }

  const generator = new Generator(pkg, targetDir, await readFiles(targetDir))
  const pm = new PackageManager(targetDir, answers.packageManager)
  require(`@iwis/cli-plugin-${name}/generator`)(generator, answers)

  await generator.generate()

  await pm.install()
}

module.exports = add
