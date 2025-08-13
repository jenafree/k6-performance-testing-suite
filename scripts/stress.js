import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { getConfig } from '../config/environments.js';
import { validateResponse, defaultHeaders, randomSleep, randomNumber } from '../utils/helpers.js';

const config = getConfig();

export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp up normal
    { duration: '3m', target: 100 },  // Stress level
    { duration: '3m', target: 200 },  // High stress
    { duration: '2m', target: 100 },  // Scale back
    { duration: '1m', target: 0 },    // Recovery
  ],
  thresholds: {
    http_req_failed: ['rate<0.1'],    // Permite mais falhas no stress
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    'group_duration{group:::Heavy Operations}': ['p(95)<5000'],
    'group_duration{group:::Concurrent Requests}': ['p(95)<4000'],
  },
};

export default function () {
  // Operações pesadas que consomem mais recursos
  group('Heavy Operations', function () {
    // 1. Múltiplas requisições simultâneas por usuário
    group('Concurrent Requests', function () {
      const requests = [];
      
      // Simula usuário fazendo várias ações ao mesmo tempo
      for (let i = 0; i < 3; i++) {
        const postId = randomNumber(1, 100);
        requests.push(['GET', `${config.apiUrl}/posts/${postId}`, null, { headers: defaultHeaders }]);
      }
      
      // Busca comentários em paralelo
      const commentsId = randomNumber(1, 100);
      requests.push(['GET', `${config.apiUrl}/posts/${commentsId}/comments`, null, { headers: defaultHeaders }]);
      
      // Lista de usuários
      requests.push(['GET', `${config.apiUrl}/users?_limit=20`, null, { headers: defaultHeaders }]);
      
      const responses = http.batch(requests);
      
      // Valida todas as respostas
      if (Array.isArray(responses)) {
        responses.forEach((res, index) => {
          check(res, {
            [`batch request ${index} successful`]: (r) => r.status === 200,
            [`batch request ${index} fast enough`]: (r) => r.timings.duration < 3000,
          });
        });
      }
    });

    sleep(randomSleep(0.1, 0.5)); // Sleep menor no stress test

    // 2. Operações de escrita intensivas
    group('Write Heavy Operations', function () {
      const bulkData = [];
      
      // Cria múltiplos posts
      for (let i = 0; i < 5; i++) {
        bulkData.push({
          title: `Stress Test Post ${i} - ${Date.now()}`,
          body: `Conteúdo do post ${i} gerado durante teste de stress. `.repeat(10),
          userId: randomNumber(1, 10)
        });
      }
      
      // Simula criação em lote
      bulkData.forEach((post, index) => {
        const createRes = http.post(`${config.apiUrl}/posts`, JSON.stringify(post), {
          headers: defaultHeaders,
          timeout: '10s' // Timeout maior para stress
        });
        
        check(createRes, {
          [`bulk post ${index} created`]: (r) => r.status === 201,
          [`bulk post ${index} has valid response`]: (r) => {
            if (!r.body) return false;
            try {
              const created = JSON.parse(r.body);
              return created.id !== undefined;
            } catch (e) {
              return false;
            }
          }
        });
      });
    });

    sleep(randomSleep(0.1, 0.3));

    // 3. Consultas complexas
    group('Complex Queries', function () {
      // Busca com múltiplos filtros
      const complexQuery = `${config.apiUrl}/posts?_limit=50&userId=${randomNumber(1, 10)}&_sort=id&_order=desc`;
      
      const queryRes = http.get(complexQuery, {
        headers: defaultHeaders,
        timeout: '15s'
      });
      
      validateResponse(queryRes, 200);
      
      check(queryRes, {
        'complex query executed': (r) => r.status === 200,
        'query returned data': (r) => {
          if (!r.body) return false;
          try {
            const data = JSON.parse(r.body);
            return Array.isArray(data) && data.length >= 0;
          } catch (e) {
            return false;
          }
        }
      });
    });
  });

  // 4. Testa limites de payload
  group('Large Payload Operations', function () {
    const largeContent = 'A'.repeat(1000); // Payload maior
    
    const largePostPayload = JSON.stringify({
      title: `Large Post - ${Date.now()}`,
      body: largeContent,
      userId: randomNumber(1, 10),
      metadata: {
        testType: 'stress',
        timestamp: new Date().toISOString(),
        size: largeContent.length,
        randomData: Array.from({length: 100}, () => randomNumber(1, 1000))
      }
    });

    const largeRes = http.post(`${config.apiUrl}/posts`, largePostPayload, {
      headers: defaultHeaders,
      timeout: '20s'
    });
    
    check(largeRes, {
      'large payload handled': (r) => r.status === 201,
      'large payload response valid': (r) => {
        if (!r.body) return false;
        try {
          const created = JSON.parse(r.body);
          return created.id !== undefined;
        } catch {
          return false;
        }
      }
    });
  });

  // Sleep muito reduzido para intensificar o stress
  sleep(randomSleep(0.1, 0.5));
}