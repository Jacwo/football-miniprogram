// api/order.js - 订单接口
import { get, post } from './index'

export function getOrderStatus(orderId) {
  return get(`/api/order/status/${orderId}`)
}

export function getOrderDetail(orderId) {
  return get(`/api/order/${orderId}`)
}
