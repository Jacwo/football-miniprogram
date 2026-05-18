// api/order.js - 订单相关接口
const { get } = require('./index')

/**
 * 获取微信订单支付状态
 * @param {string} orderNo 商户订单号
 * @returns {Promise<string>} 支付状态: WAIT_PAY/PAID/CLOSED/REFUNDED
 */
function getOrderStatus(orderNo) {
  return get(`/api/pay/wx/order/${orderNo}/status`, {})
}

/**
 * 获取订单详情
 * @param {string} outTradeNo 商户订单号
 */
function getOrderDetail(outTradeNo) {
  return get('/api/order/detail', { outTradeNo })
}

module.exports = {
  getOrderStatus,
  getOrderDetail
}
