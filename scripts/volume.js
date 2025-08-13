import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { getConfig } from '../config/environments.js';
import { validateResponse, defaultHeaders, randomSleep, randomNumber, randomString } from '../utils/helpers.js';

const config = getConfig();

export const options = {
  // Teste de Volume - Processa grandes quantidades de dados
  vus: 20,
  duration: '15m',
  
  thresholds: {
    // Sistema deve processar volume sem degradar muito
    http_req_duration: ['p(95)<5000', 'p(99)<10000'],
    http_req_failed: ['rate<0.05'],
    
    // Operações específicas de volume
    'group_duration{group:::Large Data Processing}': ['p(95)<8000'],
    'group_duration{group:::Bulk Operations}': ['p(95)<15000'],
    'group_duration{group:::File Upload Simulation}': ['p(95)<20000'],
  },
  
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 },
      },
    },
  },
};

export default function () {
  // Teste de processamento de grandes volumes de dados
  group('Large Data Processing', function () {
    // 1. Upload de arquivo grande simulado
    group('File Upload Simulation', function () {
      // Simula upload de arquivo de 1MB-5MB
      const fileSize = randomNumber(1000, 5000); // KB
      const fileContent = 'A'.repeat(fileSize * 1024); // Converte para bytes
      
      const uploadPayload = JSON.stringify({
        fileName: `large_file_${Date.now()}_${randomString(8)}.txt`,
        fileSize: fileSize,
        content: fileContent.substring(0, 10000), // Só envia parte por limitação da API
        metadata: {
          originalSize: fileSize,
          uploadTime: new Date().toISOString(),
          userAgent: 'k6-volume-test'
        }
      });
      
      const uploadRes = http.post(`${config.baseUrl}/post`, uploadPayload, {
        headers: Object.assign({}, defaultHeaders, {
          'Content-Type': 'application/json',
          'X-File-Size': fileSize.toString(),
          'X-Test-Type': 'volume'
        }),
        timeout: '30s'
      });
      
      check(uploadRes, {
        'large file upload succeeds': (r) => r.status === 200,
        'upload completes in time': (r) => r.timings.duration < 25000,
        'server handles large payload': (r) => r.body && r.body.length > 0,
      });
    });
    
    sleep(randomSleep(1, 3));
    
    // 2. Processamento de dados em batch
    group('Batch Data Processing', function () {
      const batchSize = randomNumber(50, 200);
      const batchData = [];
      
      // Cria lote de dados para processar
      for (let i = 0; i < batchSize; i++) {
        batchData.push({
          id: i,
          title: `Batch Item ${i} - ${randomString(20)}`,
          content: randomString(500),
          timestamp: Date.now(),
          index: i
        });
      }
      
      const batchPayload = JSON.stringify({
        batchId: `batch_${Date.now()}_${randomString(8)}`,
        totalItems: batchSize,
        data: batchData.slice(0, 10), // Envia só uma amostra
        metadata: {
          fullBatchSize: batchSize,
          testType: 'volume-batch',
          processingMode: 'bulk'
        }
      });
      
      const batchRes = http.post(`${config.apiUrl}/posts`, batchPayload, {
        headers: Object.assign({}, defaultHeaders, {
          'X-Batch-Size': batchSize.toString(),
          'X-Processing-Type': 'bulk'
        }),
        timeout: '20s'
      });
      
      check(batchRes, {
        'batch processing succeeds': (r) => r.status === 201,
        'batch processed in time': (r) => r.timings.duration < 15000,
        'batch response valid': (r) => {
          if (!r.body) return false;
          try {
            const result = JSON.parse(r.body);
            return result.id !== undefined;
          } catch (e) {
            return false;
          }
        },
      });
    });
  });
  
  sleep(randomSleep(2, 5));
  
  // Operações de volume com múltiplas requisições
  group('Bulk Operations', function () {
    // 3. Múltiplas requisições simultâneas por usuário
    group('Concurrent Volume Requests', function () {
      const concurrentRequests = [];
      const requestCount = randomNumber(5, 15);
      
      // Cria múltiplas requisições para simular volume
      for (let i = 0; i < requestCount; i++) {
        const payload = JSON.stringify({
          title: `Volume Request ${i}`,
          body: `Requisição ${i} de ${requestCount} no teste de volume`,
          userId: randomNumber(1, 10),
          batchIndex: i,
          totalInBatch: requestCount
        });
        
        concurrentRequests.push([
          'POST',
          `${config.apiUrl}/posts`,
          payload,
          { headers: defaultHeaders }
        ]);
      }
      
      // Executa todas as requisições em paralelo
      const concurrentRes = http.batch(concurrentRequests);
      
      if (Array.isArray(concurrentRes)) {
        let successCount = 0;
        let totalTime = 0;
        
        concurrentRes.forEach((res, index) => {
          const success = check(res, {
            [`concurrent request ${index} succeeds`]: (r) => r.status === 201,
            [`concurrent request ${index} completes`]: (r) => r.timings.duration < 10000,
          });
          
          if (success) successCount++;
          totalTime += res.timings.duration;
        });
        
        const avgTime = totalTime / concurrentRes.length;
        check({ avgTime, successCount, total: concurrentRes.length }, {
          'most concurrent requests succeed': (data) => data.successCount / data.total > 0.8,
          'average time acceptable': (data) => data.avgTime < 8000,
        });
      }
    });
    
    sleep(randomSleep(1, 3));
    
    // 4. Busca com grandes resultados
    group('Large Result Sets', function () {
      // Busca que pode retornar muitos resultados
      const largeLimitRes = http.get(`${config.apiUrl}/posts?_limit=100`, {
        headers: Object.assign({}, defaultHeaders, {
          'Accept-Encoding': 'gzip, deflate',
          'X-Expected-Size': 'large'
        }),
        timeout: '15s'
      });
      
      check(largeLimitRes, {
        'large result set returns': (r) => r.status === 200,
        'large result loads in time': (r) => r.timings.duration < 10000,
        'large result has data': (r) => {
          if (!r.body) return false;
          try {
            const posts = JSON.parse(r.body);
            return Array.isArray(posts) && posts.length > 0;
          } catch (e) {
            return false;
          }
        },
      });
      
      // Teste com paginação para simular navegação em grande volume
      const pageSize = 20;
      const totalPages = 5;
      
      for (let page = 1; page <= totalPages; page++) {
        const pageRes = http.get(`${config.apiUrl}/posts?_page=${page}&_limit=${pageSize}`, {
          headers: defaultHeaders,
          timeout: '8s'
        });
        
        check(pageRes, {
          [`page ${page} loads successfully`]: (r) => r.status === 200,
          [`page ${page} loads quickly`]: (r) => r.timings.duration < 5000,
        });
        
        sleep(randomSleep(0.2, 0.5)); // Pequena pausa entre páginas
      }
    });
  });
  
  sleep(randomSleep(1, 3));
  
  // Teste de volume com dados complexos
  group('Complex Volume Operations', function () {
    // 5. Estrutura de dados aninhada e complexa
    group('Complex Data Structures', function () {
      const complexData = {
        mainEntity: {
          id: randomString(10),
          name: `Complex Entity ${Date.now()}`,
          description: randomString(1000),
          metadata: {
            created: new Date().toISOString(),
            version: '2.0',
            tags: Array.from({length: 50}, () => randomString(10)),
            categories: Array.from({length: 20}, (_, i) => ({
              id: i,
              name: `Category ${i}`,
              items: Array.from({length: 10}, (_, j) => ({
                id: j,
                value: randomString(100),
                properties: {
                  type: 'volume-test',
                  priority: randomNumber(1, 10),
                  data: randomString(200)
                }
              }))
            }))
          }
        },
        relations: Array.from({length: 30}, (_, i) => ({
          id: i,
          type: 'related-entity',
          data: randomString(300)
        })),
        attachments: Array.from({length: 5}, (_, i) => ({
          name: `attachment_${i}.txt`,
          size: randomNumber(1000, 10000),
          content: randomString(500)
        }))
      };
      
      // Envia apenas uma parte dos dados complexos (limitação da API)
      const simplifiedPayload = JSON.stringify({
        title: `Complex Volume Data ${Date.now()}`,
        body: JSON.stringify(complexData.mainEntity.metadata.categories.slice(0, 3)),
        userId: randomNumber(1, 10),
        metadata: {
          testType: 'complex-volume',
          originalSize: JSON.stringify(complexData).length,
          timestamp: Date.now()
        }
      });
      
      const complexRes = http.post(`${config.apiUrl}/posts`, simplifiedPayload, {
        headers: Object.assign({}, defaultHeaders, {
          'X-Data-Complexity': 'high',
          'X-Original-Size': JSON.stringify(complexData).length.toString()
        }),
        timeout: '25s'
      });
      
      check(complexRes, {
        'complex data processed': (r) => r.status === 201,
        'complex processing time ok': (r) => r.timings.duration < 20000,
      });
    });
  });
  
  // Sleep baseado no volume processado
  const volumeProcessed = randomNumber(1, 100);
  let restTime;
  
  if (volumeProcessed < 30) {
    restTime = randomSleep(2, 5);       // Volume baixo
  } else if (volumeProcessed < 70) {
    restTime = randomSleep(3, 7);       // Volume médio
  } else {
    restTime = randomSleep(4, 8);       // Volume alto
  }
  
  sleep(restTime);
}
