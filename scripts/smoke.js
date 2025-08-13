import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { getConfig } from '../config/environments.js';
import { validateResponse, defaultHeaders, randomSleep } from '../utils/helpers.js';

const config = getConfig();

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
    'group_duration{group:::API Health Check}': ['p(95)<500'],
    'group_duration{group:::Web Pages}': ['p(95)<1000'],
  },
};

export default function () {
  // Teste de saúde da API
  group('API Health Check', function () {
    const healthRes = http.get(`${config.apiUrl}/posts/1`, {
      headers: defaultHeaders,
      timeout: config.timeout
    });
    
    validateResponse(healthRes, 200);
    
    check(healthRes, {
      'API health check passed': (r) => r.status === 200,
      'response contains expected data': (r) => {
        if (!r.body) return false;
        try {
          const body = JSON.parse(r.body);
          return body.id && body.title && body.body;
        } catch (e) {
          return false;
        }
      }
    });
  });

  sleep(randomSleep(0.5, 1.5));

  // Teste de páginas web básicas
  group('Web Pages', function () {
    const webRes = http.get(`${config.baseUrl}/get`, {
      headers: defaultHeaders,
      timeout: config.timeout
    });
    
    validateResponse(webRes, 200);
    
    check(webRes, {
      'web page loads successfully': (r) => r.status === 200,
      'response contains origin': (r) => {
        if (!r.body) return false;
        try {
          const body = JSON.parse(r.body);
          return body.origin !== undefined;
        } catch (e) {
          return false;
        }
      }
    });
  });

  sleep(randomSleep(0.5, 2));

  // Teste de endpoint com parâmetros
  group('API with Parameters', function () {
    const paramsRes = http.get(`${config.baseUrl}/get?test=smoke&timestamp=${Date.now()}`, {
      headers: defaultHeaders,
      timeout: config.timeout
    });
    
    validateResponse(paramsRes, 200);
    
    check(paramsRes, {
      'parameters are handled correctly': (r) => {
        if (!r.body) return false;
        try {
          const body = JSON.parse(r.body);
          return body.args && body.args.test === 'smoke';
        } catch (e) {
          return false;
        }
      }
    });
  });

  sleep(1);
}