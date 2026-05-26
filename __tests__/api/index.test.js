// __tests__/api/index.test.js - 请求封装工具方法测试

// Mock global objects BEFORE requiring the module
global.getApp = jest.fn(() => ({
  globalData: {
    baseUrl: 'https://test.ai-football.cn/foot',
    token: ''
  },
  clearLoginState: jest.fn()
}));

global.wx = {
  request: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showToast: jest.fn(),
  navigateTo: jest.fn()
};

global.getCurrentPages = jest.fn(() => []);

const { get, post, put } = require('../../api/index');

describe('API request helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    test('should call request with GET method', () => {
      // Arrange: simulate wx.request success
      wx.request.mockImplementation((opts) => {
        opts.success({
          statusCode: 200,
          data: { code: 0, data: { result: 'ok' } }
        });
      });

      return get('/api/test').then((data) => {
        expect(data).toEqual({ result: 'ok' });
        expect(wx.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            url: 'https://test.ai-football.cn/foot/api/test'
          })
        );
      });
    });

    test('should append query params to URL', () => {
      wx.request.mockImplementation((opts) => {
        opts.success({ statusCode: 200, data: { code: 0, data: null } });
      });

      return get('/api/test', { page: 1, size: 10 }).then(() => {
        const callArg = wx.request.mock.calls[0][0];
        const url = callArg.url;
        expect(url).toContain('/api/test?');
        expect(url).toContain('page=1');
        expect(url).toContain('size=10');
      });
    });

    test('should encode special characters in query params', () => {
      wx.request.mockImplementation((opts) => {
        opts.success({ statusCode: 200, data: { code: 0, data: null } });
      });

      return get('/api/test', { name: 'hello world' }).then(() => {
        const callArg = wx.request.mock.calls[0][0];
        expect(callArg.url).toContain(encodeURIComponent('hello world'));
      });
    });

    test('should filter out undefined and null params', () => {
      wx.request.mockImplementation((opts) => {
        opts.success({ statusCode: 200, data: { code: 0, data: null } });
      });

      return get('/api/test', { a: 1, b: undefined, c: null, d: 'hello' }).then(() => {
        const callArg = wx.request.mock.calls[0][0];
        expect(callArg.url).toContain('a=1');
        expect(callArg.url).not.toContain('b=');
        expect(callArg.url).not.toContain('c=');
        expect(callArg.url).toContain('d=hello');
      });
    });

    test('should not append ? if no params', () => {
      wx.request.mockImplementation((opts) => {
        opts.success({ statusCode: 200, data: { code: 0, data: null } });
      });

      return get('/api/test').then(() => {
        const callArg = wx.request.mock.calls[0][0];
        expect(callArg.url).toBe('https://test.ai-football.cn/foot/api/test');
      });
    });

    test('should not append ? if all params are filtered', () => {
      wx.request.mockImplementation((opts) => {
        opts.success({ statusCode: 200, data: { code: 0, data: null } });
      });

      return get('/api/test', { a: undefined, b: null }).then(() => {
        const callArg = wx.request.mock.calls[0][0];
        expect(callArg.url).toBe('https://test.ai-football.cn/foot/api/test');
      });
    });

    test('should merge config overrides', () => {
      wx.request.mockImplementation((opts) => {
        opts.success({ statusCode: 200, data: { code: 0, data: null } });
      });

      return get('/api/test', {}, { showLoading: false }).then(() => {
        const callArg = wx.request.mock.calls[0][0];
        // showLoading is handled inside request(), not directly on wx.request
        // We verify config flows through the get function
        expect(callArg.method).toBe('GET');
      });
    });
  });

  describe('post', () => {
    test('should call request with POST method and data', () => {
      wx.request.mockImplementation((opts) => {
        opts.success({ statusCode: 200, data: { code: 0, data: { id: 1 } } });
      });

      return post('/api/create', { name: 'test' }).then((data) => {
        expect(data).toEqual({ id: 1 });
        expect(wx.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            url: 'https://test.ai-football.cn/foot/api/create',
            data: { name: 'test' }
          })
        );
      });
    });

    test('should handle empty data', () => {
      wx.request.mockImplementation((opts) => {
        opts.success({ statusCode: 200, data: { code: 0, data: 'ok' } });
      });

      return post('/api/empty').then((data) => {
        expect(data).toBe('ok');
      });
    });
  });

  describe('put', () => {
    test('should call request with PUT method', () => {
      wx.request.mockImplementation((opts) => {
        opts.success({ statusCode: 200, data: { code: 0, data: { updated: true } } });
      });

      return put('/api/update', { name: 'new' }).then((data) => {
        expect(data).toEqual({ updated: true });
        expect(wx.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'PUT',
            url: 'https://test.ai-football.cn/foot/api/update',
            data: { name: 'new' }
          })
        );
      });
    });
  });
});
