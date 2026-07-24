// api/pay.js - 支付接口
import { post } from './index'

export function createNativePayment(data) {
  return post('/api/pay/native', data)
}

// 微信Native支付（扫码支付）
export function createWxNativePay(data) {
  return post('/api/pay/wx/native/create', data)
}

// 微信JSAPI支付（小程序内支付）
// data: { skuId, amount(分), code, userId }
export function createWxJsapiPay(data) {
  return post('/api/pay/wx/jsapi/create', data)
}
