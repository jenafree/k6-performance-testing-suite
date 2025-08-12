import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { getConfig } from '../config/environments.js';
import { validateResponse, defaultHeaders, randomSleep, randomNumber, randomString } from '../utils/helpers.js';

const config = getConfig();

export const options = {
  // Teste de Endurance - Sistema funciona por período prolongado?
  stages: [
    { duration: '10m', target: 30 },   // Ramp-up gradual
    { duration: '120m', target: 30 },  // 2 horas de carga constante
    { duration: '10m', target: 0 },    // Ramp-down
  ],
  
  thresholds: {
    // Performance não deve degradar ao longo do tempo
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.02'],
    
    // Detecta vazamentos de memória através de degradação gradual
    'group_duration{group:::Memory Intensive}': ['p(95)<3000'],
    'group_duration{group:::Long Session}': ['p(95)<4000'],
    
    // Sistema deve manter throughput
    http_reqs: ['rate>5'],
  },
  
  // Configurações para teste longo
  setupTimeout: '120s',
  teardownTimeout: '120s',
  noVUConnectionReuse: false, // Permite reutilização de conexões
};

// Variáveis para simular acúmulo de dados e detectar vazamentos
let sessionData = {};
let requestHistory = [];
let iterationCounter = 0;

export function setup() {
  console.log('🚀 Iniciando teste de endurance - 2 horas e 20 minutos de duração');
  return { startTime: Date.now() };
}

export default function (data) {
  iterationCounter++;
  const currentTime = Date.now();
  const elapsedMinutes = Math.floor((currentTime - data.startTime) / 60000);
  
  // Simula acúmulo gradual de dados da sessão
  if (!sessionData[__VU]) {
    sessionData[__VU] = {
      startTime: currentTime,
      actions: [],
      preferences: {},
      cache: {}
    };
  }
  
  // Operações que podem causar vazamentos de memória
  group('Memory Intensive', function () {
    // 1. Simula acúmulo de dados na sessão
    group('Session Management', function () {
      sessionData[__VU].actions.push({
        action: 'page_view',
        timestamp: currentTime,
        iteration: iterationCounter,
        page: `/page/${randomNumber(1, 100)}`
      });
      
      // Simula cache crescente
      sessionData[__VU].cache[`item_${iterationCounter}`] = randomString(100);
      
      // Limpa cache antigo (gestão de memória)
      if (Object.keys(sessionData[__VU].cache).length > 50) {
        const oldItems = Object.keys(sessionData[__VU].cache).slice(0, 25);
        oldItems.forEach(key => delete sessionData[__VU].cache[key]);
      }
      
      // Request de validação de sessão
      const sessionRes = http.get(`${config.baseUrl}/get?session=validate&vu=${__VU}&iteration=${iterationCounter}`, {
        headers: Object.assign({}, defaultHeaders, {
          'X-Session-Duration': Math.floor((currentTime - sessionData[__VU].startTime) / 1000)
        }),
        timeout: config.timeout
      });
      
      validateResponse(sessionRes, 200);
      
      check(sessionRes, {
        'session validation stable': (r) => r.status === 200,
        'session response time consistent': (r) => r.timings.duration < 2000,
      });
    });
    
    sleep(randomSleep(1, 3));
    
    // 2. Operações com dados crescentes
    group('Data Processing', function () {
      // Simula processamento de dados que cresce ao longo do tempo
      const dataSize = Math.min(100 + Math.floor(elapsedMinutes / 5), 1000); // Cresce 100 chars a cada 5 min
      const largePayload = JSON.stringify({
        title: `Endurance Test - ${elapsedMinutes}min`,
        body: 'A'.repeat(dataSize),
        userId: randomNumber(1, 10),
        sessionInfo: {
          vu: __VU,
          iteration: iterationCounter,
          elapsedMinutes: elapsedMinutes,
          sessionDataSize: Object.keys(sessionData[__VU].cache).length
        },
        timestamp: currentTime
      });
      
      const processRes = http.post(`${config.apiUrl}/posts`, largePayload, {
        headers: defaultHeaders,
        timeout: '15s'
      });
      
      check(processRes, {
        'large data processing stable': (r) => r.status === 201,
        'processing time not degrading': (r) => r.timings.duration < 5000,
      });
    });
  });
  
  sleep(randomSleep(2, 5));
  
  // Operações de sessão longa
  group('Long Session', function () {
    // 3. Simula operações de usuário em sessão longa
    group('User Activity', function () {
      const activities = [
        'browse_catalog',
        'view_product',
        'search_items',
        'check_profile',
        'read_content'
      ];
      
      const activity = activities[randomNumber(0, activities.length - 1)];
      sessionData[__VU].actions.push({ activity, timestamp: currentTime });
      
      const activityRes = http.get(`${config.apiUrl}/posts?activity=${activity}&time=${elapsedMinutes}`, {
        headers: Object.assign({}, defaultHeaders, {
          'X-User-Activity': activity,
          'X-Session-Age': Math.floor((currentTime - sessionData[__VU].startTime) / 1000)
        }),
        timeout: config.timeout
      });
      
      validateResponse(activityRes, 200);
      
      check(activityRes, {
        'user activity responds': (r) => r.status === 200,
        'activity performance stable': (r) => r.timings.duration < 3000,
      });
    });
    
    sleep(randomSleep(1, 2));
    
    // 4. Manutenção periódica da sessão
    if (iterationCounter % 20 === 0) { // A cada 20 iterações
      group('Session Maintenance', function () {
        // Cleanup de dados antigos
        if (sessionData[__VU].actions.length > 100) {
          sessionData[__VU].actions = sessionData[__VU].actions.slice(-50);
        }
        
        // Health check da sessão longa
        const healthRes = http.get(`${config.baseUrl}/get?health=session&vu=${__VU}&elapsed=${elapsedMinutes}`, {
          headers: defaultHeaders,
          timeout: config.timeout
        });
        
        check(healthRes, {
          'session health check passes': (r) => r.status === 200,
          'health check time stable': (r) => r.timings.duration < 1000,
        });
        
        console.log(`[VU ${__VU}] Endurance check: ${elapsedMinutes}min, ${iterationCounter} iterations, session data: ${Object.keys(sessionData[__VU].cache).length} items`);
      });
    }
  });
  
  // Mantém histórico para detectar tendências de degradação
  requestHistory.push({
    iteration: iterationCounter,
    vu: __VU,
    timestamp: currentTime,
    elapsedMinutes: elapsedMinutes
  });
  
  // Limita histórico para evitar vazamento de memória no próprio teste
  if (requestHistory.length > 1000) {
    requestHistory = requestHistory.slice(-500);
  }
  
  // Sleep baseado no tempo decorrido - simula fadiga do usuário
  let thinkTime;
  if (elapsedMinutes < 30) {
    thinkTime = randomSleep(3, 8);      // Início - usuários exploram mais
  } else if (elapsedMinutes < 60) {
    thinkTime = randomSleep(4, 10);     // Meio - usuários ficam mais lentos
  } else {
    thinkTime = randomSleep(5, 12);     // Final - usuários ainda mais lentos
  }
  
  sleep(thinkTime);
}

export function teardown(data) {
  const totalDuration = Math.floor((Date.now() - data.startTime) / 60000);
  console.log(`🏁 Teste de endurance concluído após ${totalDuration} minutos`);
  console.log(`📊 Total de iterações registradas: ${requestHistory.length}`);
}
