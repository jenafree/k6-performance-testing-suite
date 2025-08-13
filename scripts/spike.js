import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { getConfig } from '../config/environments.js';
import { validateResponse, defaultHeaders, randomSleep, randomNumber } from '../utils/helpers.js';

const config = getConfig();

export const options = {
  stages: [
    { duration: '10s', target: 2 },    // Baseline normal
    { duration: '5s', target: 100 },   // Pico súbito!
    { duration: '30s', target: 100 },  // Sustenta o pico
    { duration: '5s', target: 2 },     // Volta ao normal rapidamente
    { duration: '10s', target: 0 },    // Recovery
  ],
  thresholds: {
    http_req_failed: ['rate<0.15'],    // Permite mais falhas no spike
    http_req_duration: ['p(95)<4000', 'p(99)<8000'],
    'group_duration{group:::Spike Critical Operations}': ['p(95)<6000'],
  },
};

export default function () {
  // Operações críticas que devem sobreviver a picos
  group('Spike Critical Operations', function () {
    // 1. Operações essenciais do sistema
    group('Essential System Operations', function () {
      // Health check básico
      const healthRes = http.get(`${config.baseUrl}/get`, {
        headers: defaultHeaders,
        timeout: '15s' // Timeout generoso para picos
      });
      
      validateResponse(healthRes, 200);
      
      // Cache e CDN simulation
      const staticRes = http.get(`${config.baseUrl}/cache/60`, {
        headers: Object.assign({}, defaultHeaders, {
          'Cache-Control': 'max-age=3600'
        }),
        timeout: '10s'
      });
      
      check(staticRes, {
        'static content loads during spike': (r) => r.status === 200
      });
    });

    sleep(randomSleep(0.1, 0.2)); // Sleep muito pequeno durante spike

    // 2. Database-heavy operations
    group('Database Operations', function () {
      // Simula consultas que podem ser pesadas durante picos
      const queries = [
        `${config.apiUrl}/posts?_limit=5`,  // Lista reduzida
        `${config.apiUrl}/users/${randomNumber(1, 10)}`, // Usuário específico
        `${config.apiUrl}/posts/${randomNumber(1, 20)}`, // Post específico
      ];
      
      queries.forEach((query, index) => {
        const res = http.get(query, {
          headers: defaultHeaders,
          timeout: '20s'
        });
        
        check(res, {
          [`db query ${index} survives spike`]: (r) => r.status === 200,
          [`db query ${index} responds in time`]: (r) => r.timings.duration < 10000
        });
      });
    });

    sleep(randomSleep(0.1, 0.3));

    // 3. Write operations durante pico (mais críticas)
    group('Critical Write Operations', function () {
      // Operações de escrita que NÃO podem falhar
      const criticalData = JSON.stringify({
        title: `Critical Spike Operation ${Date.now()}`,
        body: 'Operação crítica executada durante pico de tráfego',
        userId: randomNumber(1, 10),
        priority: 'high',
        timestamp: new Date().toISOString()
      });

      const writeRes = http.post(`${config.apiUrl}/posts`, criticalData, {
        headers: defaultHeaders,
        timeout: '30s' // Timeout muito generoso
      });
      
      check(writeRes, {
        'critical write survives spike': (r) => r.status === 201,
        'critical write completes': (r) => {
          if (!r.body) return false;
          try {
            const result = JSON.parse(r.body);
            return result.id !== undefined;
          } catch (e) {
            return false;
          }
        }
      });
    });

    // 4. Fallback and graceful degradation
    group('Fallback Operations', function () {
      // Testa mecanismos de fallback
      const fallbackRes = http.get(`${config.baseUrl}/status/503`, {
        headers: defaultHeaders,
        timeout: '5s'
      });
      
      check(fallbackRes, {
        'fallback mechanism triggered': (r) => r.status === 503,
        'fallback responds quickly': (r) => r.timings.duration < 2000
      });
      
      // Retry logic simulation
      if (fallbackRes.status !== 200) {
        sleep(0.1); // Brief wait before retry
        
        const retryRes = http.get(`${config.baseUrl}/get`, {
          headers: defaultHeaders,
          timeout: '10s'
        });
        
        check(retryRes, {
          'retry after failure works': (r) => r.status === 200
        });
      }
    });
  });

  // Sleep muito reduzido para maximizar o impacto do spike
  sleep(randomSleep(0.05, 0.2));
}