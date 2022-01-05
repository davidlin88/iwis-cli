const transforms = require('./utils/configTransforms')

class ConfigTransform {
  constructor(options) {
    this.fileDescriptor = options.file
  }

  // TODO 没有files?
  transform(value, context) {
    let file
    if (!file) {
      file = this.getDefaultFile()
    }
    const { type, filename } = file
    // 根据文件类型调用不同的转换器
    const transform = transforms[type]

    let source

    // 将json格式的配置转化为对应文件的格式
    // TODO 没有existing?
    // TODO source,filename,context,作用何在？
    const content = transform.write({
      source,
      filename,
      context,
      value,
    })

    return { filename, content }
  }

  getDefaultFile() {
    // 仅取第一个类型
    const [type] = Object.keys(this.fileDescriptor)
    // 仅取第一个文件名
    const [filename] = this.fileDescriptor[type]
    return { type, filename }
  }
}

module.exports = ConfigTransform
