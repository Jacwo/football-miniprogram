// api/sku.js - SKU商品相关接口
const { get, post } = require('./index')

/**
 * 获取SKU列表
 * @param {Object} params 查询参数
 * @param {number} params.category 商品分类 1-VIP会员
 * @param {number} params.status 商品状态 1-上架
 */
function getSkuList(params) {
  return get('/api/sku/list', params)
}

module.exports = {
  getSkuList
}
