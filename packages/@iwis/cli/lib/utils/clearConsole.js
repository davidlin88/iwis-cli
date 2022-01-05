const readline = require('readline')
// 清空控制台
// from: https://github.com/vuejs/vue-cli/blob/b0e7bf07d6d7e086985475df713b593cb42ef878/packages/%40vue/cli-shared-utils/lib/logger.js#L60
module.exports = function clearConsole(title) {
  if (process.stdout.isTTY) {
    const blank = '\n'.repeat(process.stdout.rows)
    console.log(blank)
    readline.cursorTo(process.stdout, 0, 0)
    readline.clearScreenDown(process.stdout)
    if (title) {
      console.log(title)
    }
  }
}
