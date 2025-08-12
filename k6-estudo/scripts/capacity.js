import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { getConfig } from '../config/environments.js';
import { validateResponse, defaultHeaders, randomSleep, randomNumber } from '../utils/helpers.js';

const config = getConfig();

export const options = {
  // Teste de Capacidade - Determina quantos usuários o sistema suporta
  stages: [
    // Fase 1: Baseline
    { duration: '2m', target: 10 },
    { duration: '3m', target: 10 },
    
    // Fase 2: Crescimento Linear
    { duration: '2m', target: 25 },
    { duration: '3m', target: 25 },
    
    { duration: '2m', target: 50 },
    { duration: '3m', target: 50 },
    
    { duration: '2m', target: 75 },
    { duration: '3m', target: 75 },
    
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    
    // Fase 3: Teste de Limites
    { duration: '2m', target: 150 },
    { duration: '5m', target: 150 },
    
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    
    { duration: '2m', target: 300 },
    { duration: '5m', target: 300 },
    
    // Fase 4: Recovery
    { duration: '3m', target: 0 },
  ],
  
  thresholds: {
    // Capacidade máxima quando performance degrada
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.02'],
    
    // SLA requirements
    'group_duration{group:::User Journey}': ['p(95)<3000'],
    'group_duration{group:::API Performance}': ['p(95)<1500'],
    
    // Capacity indicators
    http_reqs: ['rate>10'], // Mínimo de throughput
  },
};

export default function () {
  // Simula jornada típica de usuário para medir capacidade real
  group('User Journey', function () {
    // 1. Landing page
    group('Page Load', function () {
      const pageRes = http.get(`${config.baseUrl}/get?page=home&user=${__VU}`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      validateResponse(pageRes, 200);
      
      check(pageRes, {
        'page loads in acceptable time': (r) => r.timings.duration < 3000,
        'page content is complete': (r) => r.body && r.body.length > 100,
      });
    });
    
    // Simula tempo de leitura da página
    sleep(randomSleep(2, 5));
    
    // 2. Navigation
    group('Browse Content', function () {
      const browseRes = http.get(`${config.apiUrl}/posts?_limit=20`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      validateResponse(browseRes, 200);
      
      check(browseRes, {
        'content loads quickly': (r) => r.timings.duration < 2000,
        'content list available': (r) => {
          if (!r.body) return false;
          try {
            const posts = JSON.parse(r.body);
            return Array.isArray(posts) && posts.length > 0;
          } catch (e) {
            return false;
          }
        },
      });
    });
    
    sleep(randomSleep(1, 3));
    
    // 3. Detail view
    group('View Details', function () {
      const postId = randomNumber(1, 100);
      const detailRes = http.get(`${config.apiUrl}/posts/${postId}`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      validateResponse(detailRes, 200);
      
      check(detailRes, {
        'details load fast': (r) => r.timings.duration < 1500,
        'detail content complete': (r) => {
          if (!r.body) return false;
          try {
            const post = JSON.parse(r.body);
            return post.id && post.title;
          } catch (e) {
            return false;
          }
        },
      });
    });
    
    sleep(randomSleep(2, 4));
  });
  
  // Teste de capacidade da API
  group('API Performance', function () {
    // Batch de operações como um usuário real faria
    const requests = [
      ['GET', `${config.apiUrl}/posts?_limit=10`, null, { headers: defaultHeaders }],
      ['GET', `${config.apiUrl}/users?_limit=5`, null, { headers: defaultHeaders }],
    ];
    
    const batchRes = http.batch(requests);
    
    if (Array.isArray(batchRes)) {
      batchRes.forEach((res, index) => {
        check(res, {
          [`api batch ${index} responds`]: (r) => r.status === 200,
          [`api batch ${index} performs`]: (r) => r.timings.duration < 2000,
        });
      });
    }
    
    sleep(randomSleep(1, 2));
    
    // Write operation (mais pesada para teste de capacidade)
    const writeData = JSON.stringify({
      title: `Capacity Test Post VU-${__VU}`,
      body: `Post criado durante teste de capacidade`,
      userId: randomNumber(1, 10),
      metadata: {
        testType: 'capacity',
        virtualUser: __VU,
        timestamp: Date.now()
      }
    });
    
    const writeRes = http.post(`${config.apiUrl}/posts`, writeData, {
      headers: defaultHeaders,
      timeout: '10s'
    });
    
    check(writeRes, {
      'write operation succeeds under load': (r) => r.status === 201,
      'write performance acceptable': (r) => r.timings.duration < 3000,
    });
  });
  
  // Sleep baseado na carga atual para simular uso real
  const currentLoad = __VU; // Aproximação da carga atual
  let thinkTime;
  
  if (currentLoad <= 50) {
    thinkTime = randomSleep(3, 8);      // Usuários casuais - mais tempo entre ações
  } else if (currentLoad <= 100) {
    thinkTime = randomSleep(2, 5);      // Usuários moderados
  } else if (currentLoad <= 200) {
    thinkTime = randomSleep(1, 3);      // Usuários ativos
  } else {
    thinkTime = randomSleep(0.5, 2);    // Usuários muito ativos
  }
  
  sleep(thinkTime);
}
