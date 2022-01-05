const fs = require('fs-extra')
const path = require('path')
const ejs = require('ejs')
const normalizeFilePaths = require('./utils/normalizeFilePaths.js')
const sortObject = require('./utils/sortObject')
const writeFileTree = require('./utils/writeFileTree')
const isObject = val => val && typeof val === 'object'
const { isBinaryFileSync } = require('isbinaryfile')
const { runTransformation } = require('vue-codemod')
const ConfigTransform = require('./ConfigTransform')
const yaml = require('yaml-front-matter')
const resolve = require('resolve')
const { log } = require('./utils/logger.js')

const defaultConfigTransforms = {
  babel: new ConfigTransform({
    file: {
      js: ['babel.config.js'],
    },
  }),
  postcss: new ConfigTransform({
    file: {
      js: ['postcss.config.js'],
      json: ['.postcssrc.json', '.postcssrc'],
      yaml: ['.postcssrc.yaml', '.postcssrc.yml'],
    },
  }),
  jest: new ConfigTransform({
    file: {
      js: ['jest.config.js'],
    },
  }),
  browserslist: new ConfigTransform({
    file: {
      lines: ['.browserslistrc'],
    },
  }),
}

const reservedConfigTransforms = {
  vue: new ConfigTransform({
    file: {
      js: ['vue.config.js'],
    },
  }),
}

module.exports = class Generator {
  constructor(pkg, context, files = {}) {
    this.pkg = pkg
    this.context = context
    this.configTransforms = {}
    this.files = files
    this.fileMiddlewares = []
    this.imports = {}
    this.rootOptions = {}
    this.entryFile = 'src/main.js'
  }

  async generate() {
    // 从 package.json 中提取文件
    this.extractConfigFiles()
    // 处理得到 this.files
    await this.resolveFiles()
    // 给 pkg 排序
    this.sortPkg()
    // 将 pkg 也插入 this.files
    this.files['package.json'] = JSON.stringify(this.pkg, null, 2) + '\n'
    // 将所有文件写入用户要创建的目录
    await writeFileTree(this.context, this.files)
  }
  sortPkg() {
    // 确保 package.json 的 keys 有可读的顺序
    this.pkg.dependencies = sortObject(this.pkg.dependencies)
    this.pkg.devDependencies = sortObject(this.pkg.devDependencies)
    this.pkg.scripts = sortObject(this.pkg.scripts, ['dev', 'build', 'test:unit', 'test:e2e', 'lint', 'deploy'])

    this.pkg = sortObject(this.pkg, [
      'name',
      'version',
      'private',
      'description',
      'author',
      'scripts',
      'husky',
      'lint-staged',
      'main',
      'module',
      'browser',
      'jsDelivr',
      'unpkg',
      'files',
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'vue',
      'babel',
      'eslintConfig',
      'prettier',
      'postcss',
      'browserslist',
      'jest',
    ])
  }

  async resolveFiles() {
    const files = this.files
    for (const middleware of this.fileMiddlewares) {
      // TODO 没接受参数 ejs.render
      await middleware(files, ejs.render)
    }

    // 将文件路径的反斜杠 \ 转为正斜杠 /
    normalizeFilePaths(files)

    // 遍历所有 files 查找 imports/rootOptions 是否有对应项
    // 有则解析原 file 得到 AST，再将 import 语句和 rootOptions 注入
    Object.keys(files).forEach(file => {
      let imports = this.imports[file]
      imports = imports instanceof Set ? Array.from(imports) : imports
      if (imports && imports.length > 0) {
        files[file] = runTransformation(
          { path: file, source: files[file] },
          require('./utils/codemods/injectImports'),
          { imports },
        )
      }

      let injections = this.rootOptions[file]
      injections = injections instanceof Set ? Array.from(injections) : injections
      if (injections && injections.length > 0) {
        files[file] = runTransformation(
          { path: file, source: files[file] },
          require('./utils/codemods/injectOptions'),
          { injections },
        )
      }
    })
  }
  // 提取 pakage.json 中的配置，生成单独的文件
  extractConfigFiles() {
    const configTransforms = {
      ...defaultConfigTransforms,
      ...this.configTransforms,
      ...reservedConfigTransforms,
    }

    const extract = key => {
      if (configTransforms[key] && this.pkg[key]) {
        const value = this.pkg[key]
        const configTransform = configTransforms[key]
        // TODO .transform 没用到 files ？
        const res = configTransform.transform(value, this.files, this.context)
        const { content, filename } = res
        // 如果文件不是 /n 结尾，则补上
        // TODO why
        this.files[filename] = ensureEOL(content)
        delete this.pkg[key]
      }
    }

    // 提取vue、babel的配置为单独的文件配置格式到 this.files 中
    extract('vue')
    extract('babel')
  }
  // 扩展包、合并配置
  extendPackage(fields) {
    const pkg = this.pkg
    for (const key in fields) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        const value = fields[key]
        const existing = pkg[key]
        if (isObject(value) && (key === 'dependencies' || key === 'devDependencies' || key === 'scripts')) {
          pkg[key] = Object.assign(existing || {}, value)
        } else {
          pkg[key] = value
        }
      }
    }
  }

  render(source, additionalData = {}, ejsOptions = {}) {
    // 获取调用 generator.render() 函数的文件的路径
    const baseDir = extractCallDir()
    const newSource = path.resolve(baseDir, source)
    this._injectFileMiddleware(async files => {
      const data = this._resolveData(additionalData)
      // TODO 为什么不放文件开头声明
      const globby = require('globby')

      const _files = await globby(['**/*'], { cwd: newSource, dot: true })
      for (const rawPath of _files) {
        const sourcePath = path.resolve(newSource, rawPath)

        const content = this.renderFile(sourcePath, data, ejsOptions)
        // 当内容是二进制流或非空时，设置文件内容
        if (Buffer.isBuffer(content) || /[^\s]/.test(content)) {
          files[rawPath] = content
        }
      }
    })
  }

  renderFile(name, data, ejsOptions) {
    // 如果是二进制文件，直接读取返回
    // 如 favicon.ico
    if (isBinaryFileSync(name)) {
      return fs.readFileSync(name)
    }

    const template = fs.readFileSync(name, 'utf-8')

    // 以 yaml 格式读取文件参数和主题内容
    const parsed = yaml.loadFront(template)
    const content = parsed.__content
    let finalTemplate = content.trim() + `\n`
    // TODO
    // // 文件头声明条件渲染时，加入 if 语句
    // if (parsed.when) {
    //   finalTemplate = `<%_ if (${parsed.when}) { _%>` + finalTemplate + `<%_ } _%}`

    //   const result = ejs.render(finalTemplate, data, ejsOptions)
    //   if (!result) {
    //     return ''
    //   }
    // }

    const replaceBlockRE = /<%# REPLACE %>([^]*?)<%# END_REPLACE %>/g
    // 配置文件读取路径
    if (parsed.extend) {
      let extendPath
      if (parsed.extend.startsWith(':')) {
        // 设置路径为相当于项目根目录，如 webpack 配置
        extendPath = path.join(process.cwd(), parsed.extend.slice(1))
      } else {
        extendPath = path.isAbsolute(parsed.extend)
          ? // 设置路径为绝对路径，如系统级配置
            parsed.extend
          : // TODO ?
            resolve.sync(parsed.extend, { baseDir: path.dirname(name) })
        log('extendPath => ')
        log(extendPath)
      }

      finalTemplate = fs.readFileSync(extendPath, 'utf-8')
      if (parsed.replace) {
        // 如果需要替换
        if (Array.isArray(parsed.replace)) {
          // 如果有多处需要替换
          const replaceMatch = content.match(replaceBlockRE)
          if (replaceMatch) {
            // 处理成需要替换的内容
            const replaces = replaceMatch.map(m => {
              if (parsed.keepSpace) {
                return m.replace(replaceBlockRE, '$1')
              }
              return m.replace(replaceBlockRE, '$1').trim()
            })

            parsed.replace.forEach((r, i) => {
              // 将源文件内容以正则规则替换成 __content 中对应的内容
              finalTemplate = finalTemplate.replace(r, replaces[i])
            })
          }
        } else if (parsed.keepSpace) {
          finalTemplate = finalTemplate.replace(parsed.replace, content)
        } else {
          finalTemplate = finalTemplate.replace(parsed.replace, content.trim())
        }
      }
    }

    return ejs.render(finalTemplate, data, ejsOptions)
  }

  // 向 file 注入 import 语句
  injectImports(file, imports) {
    const _imports = this.imports[file] || (this.imports[file] = new Set())
    ;(Array.isArray(imports) ? imports : [imports]).forEach(imp => {
      _imports.add(imp)
    })
  }

  injectRootOptions(file, options) {
    const _options = this.rootOptions[file] || (this.rootOptions[file] = new Set())
    ;(Array.isArray(options) ? options : [options]).forEach(opt => {
      _options.add(opt)
    })
  }

  _injectFileMiddleware(middle) {
    this.fileMiddlewares.push(middle)
  }

  _resolveData(additionalData) {
    return {
      // TODO 哪来的options?
      // options: this.options,
      rootOptions: this.rootOptions,
      ...additionalData,
    }
  }
}

function ensureEOL(str) {
  if (str.charAt(str.length - 1) !== '\n') {
    return str + '\n'
  }
  return str
}

// 提取调用栈的目录
function extractCallDir() {
  const obj = {}
  Error.captureStackTrace(obj)

  // 在 lib\generator\xx 等各个模块中 调用 generator.render()
  // 将会排在调用栈中的第四个，也就是 obj.stack.split('\n')[3]
  const callSite = obj.stack.split('\n')[3]

  // 堆栈在命名函数中被调用时的正则
  // 格式：空格(任意字符:数字:数字)
  // 如：at f (<anonymous>:3:13)
  const namedStackRegExp = /\s\((.*):\d+:\d+\)$/

  // 堆栈被匿名调用时的正则
  // 格式： at 任意字符:数字:数字
  // 如：at <anonymous>:1:1
  const anonymousStackRegExp = /at (.*):\d+:\d+$/

  let matchResult = callSite.match(namedStackRegExp)
  if (!matchResult) {
    matchResult = callSite.match(anonymousStackRegExp)
  }

  const fileName = matchResult[1]
  return path.dirname(fileName)
}
