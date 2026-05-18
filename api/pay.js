// api/pay.js - 支付相关接口
const { post } = require('./index')

/**
 * 创建微信Native支付订单
 * @param {Object} data 支付参数
 * @param {number} data.skuId 商品SKU ID
 * @param {number} data.amount 订单金额（单位：分）
 * @param {string} data.attach 附加数据
 * @param {string} data.clientIp 用户终端IP
 * @param {number} data.userId 用户ID
 * @returns {Promise<{outTradeNo: string, codeUrl: string, amount: number, qrcodeImage?: string}>}
 */
function createWxNativePay(data) {
  return post('/api/pay/wx/native/create', data)
}

module.exports = {
  createWxNativePay
}
