const stringifyJS = require('./stringifyJS')
const merge = require('deepmerge')
const mergeArrayWithDedupe = (a, b) => Array.from(new Set([...a, ...b]))
const mergeOptions = {
  arrayMerge: mergeArrayWithDedupe,
}

const transformJS = {
  read: ({ filename, context }) => {
    try {
      return require(`./${filename}`, context, true)
    } catch (e) {
      return null
    }
  },
  write: ({ value }) => `module.exports = ${stringifyJS(value, null, 4)}`,
}

const transformJSON = {
  read: ({ source }) => JSON.parse(source),
  write: ({ value, existing }) => JSON.stringify(merge(existing, value, mergeOptions), null, 4),
}

const transformYAML = {
  read: ({ source }) => require('js-yaml').load(source),
  write: ({ value, existing }) =>
    require('js-yaml').dump(merge(existing, value, mergeOptions), {
      skipInvalid: true,
    }),
}

const transformLines = {
  read: ({ source }) => source.split('\n'),
  write: ({ value, existing }) => {
    let newValue
    if (existing) {
      newValue = existing.concat(value)
      // 去重
      newValue = value.filter((item, index) => value.indexOf(item) === index)
    }
    return newValue.join('\n')
  },
}

module.exports = {
  js: transformJS,
  json: transformJSON,
  yaml: transformYAML,
  lines: transformLines,
}
