/**
 * 给对象的 keys 排序
 * @param {object} obj 需排序 key 的对象
 * @param {array} keyOrder 优先排序的 keys
 * @param {boolean} sortByUnicode 其他 key 是否要按 unicode 排序，默认：是
 * @returns
 */
module.exports = function sortObject(obj, keyOrder, sortByUnicode = true) {
  if (!obj) return
  const res = {}

  if (keyOrder) {
    keyOrder.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        res[key] = obj[key]
        delete obj[key]
      }
    })
  }

  const keys = Object.keys(obj)
  // 因为 Object.keys/for...in 无法保证返回的keys的顺序
  // 具体需看浏览器实现
  // 因此为了一致性可以手动排序
  sortByUnicode && keys.sort()
  keys.forEach(key => {
    res[key] = obj[key]
  })
  return res
}
