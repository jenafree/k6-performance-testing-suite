import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { getConfig } from '../config/environments.js';
import { validateResponse, defaultHeaders, randomSleep, randomNumber } from '../utils/helpers.js';

const config = getConfig();

export const options = {
  // Teste de Breaking Point - Encontra o ponto de quebra do sistema
  stages: [
    { duration: '1m', target: 10 },    // Warm-up suave
    { duration: '2m', target: 50 },    // Carga inicial
    { duration: '5m', target: 100 },   // Carga normal
    { duration: '5m', target: 200 },   // Primeira pressão
    { duration: '5m', target: 400 },   // Segunda pressão
    { duration: '5m', target: 600 },   // Terceira pressão
    { duration: '5m', target: 800 },   // Quarta pressão
    { duration: '5m', target: 1000 },  // Pressão máxima
    { duration: '10m', target: 1000 }, // Sustenta pressão máxima
    { duration: '3m', target: 0 },     // Recovery
  ],
  
  // Thresholds para identificar ponto de quebra
  thresholds: {
    // Sistema começa a degradar
    http_req_duration: [
      'p(50)<1000',  // 50% das requisições < 1s (WARNING se falhar)
      'p(95)<5000',  // 95% das requisições < 5s (CRITICAL se falhar)
      'p(99)<10000', // 99% das requisições < 10s (SYSTEM FAILURE se falhar)
    ],
    
    // Taxa de erro indica sobrecarga
    http_req_failed: [
      'rate<0.05',   // Menos de 5% de erro (WARNING se falhar)
      'rate<0.10',   // Menos de 10% de erro (CRITICAL se falhar)
      'rate<0.25',   // Menos de 25% de erro (SYSTEM FAILURE se falhar)
    ],
    
    // Grupos específicos para análise detalhada
    'group_duration{group:::Critical Operations}': ['p(95)<3000'],
    'group_duration{group:::Secondary Operations}': ['p(95)<8000'],
    'group_duration{group:::Fallback Operations}': ['p(95)<15000'],
  },
  
  // Para de adicionar VUs se sistema já está quebrado
  setupTimeout: '60s',
  teardownTimeout: '60s',
};

// Contadores para análise
let iterationCount = 0;
let errorCount = 0;
let slowRequestCount = 0;

export default function () {
  iterationCount++;
  
  // Operações críticas que DEVEM funcionar sempre
  group('Critical Operations', function () {
    // Health check básico
    group('System Health', function () {
      const healthRes = http.get(`${config.baseUrl}/get?check=health&iteration=${iterationCount}`, {
        headers: defaultHeaders,
        timeout: '30s' // Timeout generoso durante breaking point
      });
      
      const isHealthy = check(healthRes, {
        'system health check passes': (r) => r.status === 200,
        'health response under 3s': (r) => r.timings.duration < 3000,
      });
      
      if (!isHealthy) {
        errorCount++;
      }
      
      if (healthRes.timings.duration > 5000) {
        slowRequestCount++;
      }
    });
    
    sleep(randomSleep(0.1, 0.5));
    
    // Operação de leitura crítica
    group('Critical Read', function () {
      const readRes = http.get(`${config.apiUrl}/posts/1`, {
        headers: defaultHeaders,
        timeout: '20s'
      });
      
      check(readRes, {
        'critical read succeeds': (r) => r.status === 200,
        'critical read fast enough': (r) => r.timings.duration < 2000,
      });
    });
  });
  
  sleep(randomSleep(0.2, 0.8));
  
  // Operações secundárias que podem degradar
  group('Secondary Operations', function () {
    // Lista com paginação
    group('List Operations', function () {
      const listRes = http.get(`${config.apiUrl}/posts?_limit=10&_page=${randomNumber(1, 10)}`, {
        headers: defaultHeaders,
        timeout: '15s'
      });
      
      check(listRes, {
        'list operation completes': (r) => r.status === 200,
        'list response acceptable': (r) => r.timings.duration < 5000,
      });
    });
    
    sleep(randomSleep(0.1, 0.3));
    
    // Busca com filtros
    group('Search Operations', function () {
      const searchRes = http.get(`${config.apiUrl}/posts?userId=${randomNumber(1, 10)}`, {
        headers: defaultHeaders,
        timeout: '10s'
      });
      
      check(searchRes, {
        'search operation works': (r) => r.status === 200,
        'search not too slow': (r) => r.timings.duration < 8000,
      });
    });
  });
  
  sleep(randomSleep(0.3, 1.0));
  
  // Operações que podem falhar sob alta carga
  group('Fallback Operations', function () {
    // Operação de escrita (mais pesada)
    group('Write Operations', function () {
      const writePayload = JSON.stringify({
        title: `Breaking Point Test ${iterationCount}`,
        body: `Teste de carga máxima - Iteração ${iterationCount} - VU ${__VU}`,
        userId: randomNumber(1, 10),
        timestamp: Date.now(),
        metadata: {
          testType: 'breaking-point',
          iteration: iterationCount,
          currentVU: __VU,
          totalVUs: __ENV.K6_VUS || 'unknown'
        }
      });
      
      const writeRes = http.post(`${config.apiUrl}/posts`, writePayload, {
        headers: defaultHeaders,
        timeout: '25s' // Timeout mais generoso para writes
      });
      
      check(writeRes, {
        'write operation attempts': (r) => r.status !== 0, // Pelo menos tentou
        'write not completely broken': (r) => r.status < 500 || r.status === 503, // 503 é aceitável (rate limiting)
        'write completes eventually': (r) => r.timings.duration < 20000,
      });
    });
    
    sleep(randomSleep(0.2, 0.6));
    
    // Operação complexa (join de dados)
    group('Complex Operations', function () {
      const userId = randomNumber(1, 10);
      
      // Busca usuário E seus posts (simula JOIN)
      const userRes = http.get(`${config.apiUrl}/users/${userId}`, {
        headers: defaultHeaders,
        timeout: '8s'
      });
      
      if (userRes.status === 200) {
        const postsRes = http.get(`${config.apiUrl}/users/${userId}/posts`, {
          headers: defaultHeaders,
          timeout: '8s'
        });
        
        check(postsRes, {
          'complex operation survives': (r) => r.status === 200 || r.status === 503,
          'complex operation eventual': (r) => r.timings.duration < 15000,
        });
      }
    });
  });
  
  // Log de progresso para monitoramento
  if (iterationCount % 50 === 0) {
    console.log(`[Breaking Point] Iteração ${iterationCount} - VU ${__VU} - Erros: ${errorCount} - Lentas: ${slowRequestCount}`);
  }
  
  // Sleep adaptativo baseado na carga atual
  const currentVUs = __ENV.K6_VUS || __VU;
  let adaptiveSleep;
  
  if (currentVUs < 100) {
    adaptiveSleep = randomSleep(1, 3);    // Carga leve - sleep normal
  } else if (currentVUs < 500) {
    adaptiveSleep = randomSleep(0.5, 2);  // Carga média - sleep reduzido
  } else {
    adaptiveSleep = randomSleep(0.1, 1);  // Carga alta - sleep mínimo
  }
  
  sleep(adaptiveSleep);
}
