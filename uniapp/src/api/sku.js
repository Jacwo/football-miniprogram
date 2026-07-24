// api/sku.js - SKU接口
import { get } from './index'

export function getSkuList(params = {}) {
  return get('/api/sku/list', params, { showLoading: false })
}
