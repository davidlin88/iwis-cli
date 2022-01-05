// TODO 这两个变量在哪里定义的？
exports.exitProcess = !process.env.DV_CLI_API_MODE && !process.env.DV_CLI_TEST

module.exports = function exit(code) {
  if (exports.exitProcess) {
    process.exit(code)
  } else if (code > 0) {
    throw new Error(`process 以 code ${code}退出。`)
  }
}
