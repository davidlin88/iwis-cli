/**
 * 
  Unix    => foo/bar
  Windows => foo\\bar

  slash(string);
  Unix    => foo/bar
  Windows => foo/bar
 */
// const slash = require('./slash.mjs')
const path = require('path')

module.exports = function normalizeFilePaths(files) {
  Object.keys(files).forEach(file => {
    // TODO file是路径？
    const normalized = path.normalize(file)
    if (file !== normalized) {
      files[normalized] = files[file]
      delete files[file]
    }
  })
  return files
}
