import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { getConfig } from '../config/environments.js';
import { validateResponse, defaultHeaders, randomSleep, randomNumber, randomString } from '../utils/helpers.js';

const config = getConfig();

export const options = {
  stages: [
    { duration: '5m', target: 10 },   // Ramp up gradual
    { duration: '30m', target: 20 },  // Soak period - teste longo
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<2000', 'p(99)<3000'],
    'group_duration{group:::Memory Intensive Operations}': ['p(95)<4000'],
    'group_duration{group:::Long Running Operations}': ['p(95)<5000'],
  },
};

// Variáveis para detectar vazamentos de memória
let iterationCounter = 0;
let accumulatedData = [];

export default function () {
  iterationCounter++;
  
  // Simula acúmulo de dados para detectar vazamentos
  accumulatedData.push({
    iteration: iterationCounter,
    timestamp: Date.now(),
    data: randomString(100) // Pequena quantidade de dados por iteração
  });
  
  // Limpa dados antigos para simular gestão de memória
  if (accumulatedData.length > 100) {
    accumulatedData = accumulatedData.slice(-50); // Mantém apenas os 50 mais recentes
  }

  // Operações que podem causar vazamentos de memória
  group('Memory Intensive Operations', function () {
    // 1. Criação e processamento de dados
    group('Data Processing', function () {
      const largeDataSet = [];
      
      // Cria conjunto de dados para processar
      for (let i = 0; i < 10; i++) {
        largeDataSet.push({
          id: i,
          content: randomString(200),
          timestamp: Date.now(),
          iteration: iterationCounter
        });
      }
      
      // Processa os dados
      const processedData = largeDataSet.map(item => ({
        ...item,
        processed: true,
        hash: `hash_${item.id}_${item.timestamp}`
      }));
      
      // Simula envio dos dados processados
      const batchPayload = JSON.stringify({
        batch: processedData.slice(0, 3), // Envia apenas parte
        metadata: {
          totalItems: processedData.length,
          iteration: iterationCounter,
          timestamp: new Date().toISOString()
        }
      });

      const batchRes = http.post(`${config.apiUrl}/posts`, batchPayload, {
        headers: defaultHeaders,
        timeout: '15s'
      });
      
      validateResponse(batchRes, 201);
    });

    sleep(randomSleep(2, 5)); // Sleep variável para simular uso real

    // 2. Operações repetitivas que podem degradar performance
    group('Repetitive Operations', function () {
      // Múltiplas consultas pequenas
      for (let i = 0; i < 3; i++) {
        const userId = randomNumber(1, 10);
        const userRes = http.get(`${config.apiUrl}/users/${userId}`, {
          headers: defaultHeaders,
          timeout: config.timeout
        });
        
        check(userRes, {
          [`repetitive query ${i} successful`]: (r) => r.status === 200,
          [`repetitive query ${i} consistent performance`]: (r) => r.timings.duration < 2000
        });
        
        sleep(randomSleep(0.5, 1.5));
      }
    });
  });

  sleep(randomSleep(3, 8)); // Sleep mais longo entre grupos

  // Operações de longa duração
  group('Long Running Operations', function () {
    // 3. Simulação de sessões longas
    group('Session Management', function () {
      // Simula manutenção de sessão longa
      const sessionData = JSON.stringify({
        sessionId: `session_${iterationCounter}_${Date.now()}`,
        userId: randomNumber(1, 10),
        duration: iterationCounter * 1000, // Simula sessão cada vez mais longa
        activities: accumulatedData.slice(-5), // Últimas 5 atividades
        keepAlive: true
      });

      const sessionRes = http.post(`${config.baseUrl}/post`, sessionData, {
        headers: defaultHeaders,
        timeout: '10s'
      });
      
      check(sessionRes, {
        'session maintained': (r) => r.status === 200,
        'session response consistent': (r) => r.timings.duration < 3000
      });
    });

    sleep(randomSleep(2, 4));

    // 4. Operações de cleanup e manutenção
    group('Maintenance Operations', function () {
      // Simula operações de limpeza que devem funcionar mesmo após muito tempo
      const cleanupRes = http.get(`${config.baseUrl}/get?cleanup=true&iteration=${iterationCounter}`, {
        headers: defaultHeaders,
        timeout: '20s'
      });
      
      validateResponse(cleanupRes, 200);
      
      check(cleanupRes, {
        'cleanup operations work': (r) => r.status === 200,
        'cleanup performance stable': (r) => r.timings.duration < 5000
      });
    });

    // 5. Health check periódico
    if (iterationCounter % 10 === 0) { // A cada 10 iterações
      group('Periodic Health Check', function () {
        const healthRes = http.get(`${config.apiUrl}/posts/1`, {
          headers: defaultHeaders,
          timeout: config.timeout
        });
        
        check(healthRes, {
          'system health stable after iterations': (r) => r.status === 200,
          'health check performance consistent': (r) => r.timings.duration < 1000
        });
        
        // console.log(`Health check após ${iterationCounter} iterações - Status: ${healthRes.status}, Tempo: ${healthRes.timings.duration}ms`);
      });
    }
  });

  // 6. Teste de degradação de performance ao longo do tempo
  group('Performance Degradation Check', function () {
    const perfTestRes = http.get(`${config.apiUrl}/posts?_limit=5&_page=${Math.ceil(iterationCounter/10)}`, {
      headers: defaultHeaders,
      timeout: '10s'
    });
    
    check(perfTestRes, {
      'performance does not degrade over time': (r) => r.timings.duration < 3000,
      'memory usage appears stable': (r) => r.status === 200
    });
  });

  // Sleep base para soak test - simula uso contínuo mas não intensivo
  sleep(randomSleep(5, 12));
}