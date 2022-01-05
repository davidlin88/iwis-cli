module.exports = function stringifyJS(value) {
  const { stringify } = require('javascript-stringify')
  return stringify(
    value,
    (val, indent, next) => {
      // '__expression' 是为了兼容 `webpackchain`
      if (val && val.__expression) {
        return val.__expression
      }
      return next(val)
    },
    4,
  )
}
