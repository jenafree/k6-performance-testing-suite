import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { getConfig } from '../config/environments.js';
import { validateResponse, defaultHeaders, randomSleep, randomNumber, randomString, randomEmail } from '../utils/helpers.js';

const config = getConfig();

export const options = {
  vus: 3,
  duration: '3m',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
    'group_duration{group:::CRUD Operations}': ['p(95)<3000'],
    'group_duration{group:::Bulk Operations}': ['p(95)<5000'],
    'group_duration{group:::Error Handling}': ['p(95)<2000'],
  },
};

export default function () {
  // Teste completo de CRUD (Create, Read, Update, Delete)
  group('CRUD Operations', function () {
    let createdResourceId = null;
    
    // 1. CREATE - Criar novo recurso
    group('Create Resource', function () {
      const newResource = JSON.stringify({
        title: `API Test Resource ${randomString(8)}`,
        body: `Conteúdo criado via API REST - ${Date.now()}`,
        userId: randomNumber(1, 10),
        tags: ['api-test', 'crud', 'k6'],
        metadata: {
          createdBy: 'k6-test',
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      });

      const createRes = http.post(`${config.apiUrl}/posts`, newResource, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      validateResponse(createRes, 201);
      
      const createCheck = check(createRes, {
        'resource created successfully': (r) => r.status === 201,
        'create response has id': (r) => {
          try {
            const created = JSON.parse(r.body);
            createdResourceId = created.id;
            return created.id !== undefined;
          } catch (e) {
            return false;
          }
        },
        'create response time acceptable': (r) => r.timings.duration < 2000
      });
      
      if (!createCheck || !createdResourceId) {
        createdResourceId = randomNumber(1, 100); // Fallback para continuar teste
      }
    });

    sleep(randomSleep(1, 2));

    // 2. READ - Ler o recurso criado
    group('Read Resource', function () {
      const readRes = http.get(`${config.apiUrl}/posts/${createdResourceId}`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      validateResponse(readRes, 200);
      
      check(readRes, {
        'resource read successfully': (r) => r.status === 200,
        'read response contains data': (r) => {
          try {
            const resource = JSON.parse(r.body);
            return resource.id && resource.title && resource.body;
          } catch (e) {
            return false;
          }
        },
        'read response time fast': (r) => r.timings.duration < 1000
      });
    });

    sleep(randomSleep(0.5, 1.5));

    // 3. UPDATE - Atualizar o recurso
    group('Update Resource', function () {
      const updateData = JSON.stringify({
        title: `Updated Resource ${randomString(6)}`,
        body: `Conteúdo atualizado em ${new Date().toISOString()}`,
        userId: randomNumber(1, 10),
        updated: true,
        updateCount: randomNumber(1, 5)
      });

      const updateRes = http.put(`${config.apiUrl}/posts/${createdResourceId}`, updateData, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      validateResponse(updateRes, 200);
      
      check(updateRes, {
        'resource updated successfully': (r) => r.status === 200,
        'update response has id': (r) => {
          try {
            const updated = JSON.parse(r.body);
            return updated.id !== undefined;
          } catch (e) {
            return false;
          }
        }
      });
    });

    sleep(randomSleep(1, 2));

    // 4. PATCH - Atualização parcial
    group('Partial Update (PATCH)', function () {
      const patchData = JSON.stringify({
        title: `Patched Title ${Date.now()}`,
        lastModified: new Date().toISOString()
      });

      const patchRes = http.patch(`${config.apiUrl}/posts/${createdResourceId}`, patchData, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      // PATCH pode retornar 200 ou 204
      check(patchRes, {
        'partial update successful': (r) => r.status === 200 || r.status === 204,
        'patch response time acceptable': (r) => r.timings.duration < 1500
      });
    });

    sleep(randomSleep(0.5, 1));

    // 5. DELETE - Deletar o recurso
    group('Delete Resource', function () {
      const deleteRes = http.del(`${config.apiUrl}/posts/${createdResourceId}`, null, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      check(deleteRes, {
        'resource deleted successfully': (r) => r.status === 200 || r.status === 204,
        'delete response time fast': (r) => r.timings.duration < 1000
      });
    });
  });

  sleep(randomSleep(2, 4));

  // Operações em lote
  group('Bulk Operations', function () {
    // 6. Criar múltiplos recursos
    group('Bulk Create', function () {
      const bulkCreatePromises = [];
      
      for (let i = 0; i < 3; i++) {
        const bulkResource = JSON.stringify({
          title: `Bulk Resource ${i} - ${randomString(6)}`,
          body: `Bulk content ${i} created at ${Date.now()}`,
          userId: randomNumber(1, 10),
          bulk: true,
          batchId: `batch_${Date.now()}`
        });

        bulkCreatePromises.push(['POST', `${config.apiUrl}/posts`, bulkResource, { headers: defaultHeaders }]);
      }
      
      const bulkResponses = http.batch(bulkCreatePromises);
      
      bulkResponses.forEach((res, index) => {
        check(res, {
          [`bulk create ${index} successful`]: (r) => r.status === 201,
          [`bulk create ${index} has valid response`]: (r) => {
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

    sleep(randomSleep(1, 3));

    // 7. Busca com filtros e paginação
    group('Filtered Search with Pagination', function () {
      const searchQueries = [
        `${config.apiUrl}/posts?_limit=10&_page=1&userId=${randomNumber(1, 5)}`,
        `${config.apiUrl}/posts?_limit=5&_sort=id&_order=desc`,
        `${config.apiUrl}/posts?_start=0&_limit=15`,
        `${config.apiUrl}/users?_limit=10`
      ];
      
      searchQueries.forEach((query, index) => {
        const searchRes = http.get(query, {
          headers: defaultHeaders,
          timeout: config.timeout
        });
        
        validateResponse(searchRes, 200);
        
        check(searchRes, {
          [`search query ${index} successful`]: (r) => r.status === 200,
          [`search query ${index} returns array`]: (r) => {
            try {
              const results = JSON.parse(r.body);
              return Array.isArray(results);
            } catch (e) {
              return false;
            }
          }
        });
        
        sleep(randomSleep(0.3, 0.8));
      });
    });
  });

  sleep(randomSleep(2, 3));

  // Testes de tratamento de erros
  group('Error Handling', function () {
    // 8. Teste de recursos não encontrados (404)
    group('Not Found Handling', function () {
      const notFoundRes = http.get(`${config.apiUrl}/posts/99999`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      check(notFoundRes, {
        'not found returns 404': (r) => r.status === 404,
        'not found response time fast': (r) => r.timings.duration < 1000
      });
    });

    sleep(randomSleep(0.5, 1));

    // 9. Teste de dados inválidos (400)
    group('Bad Request Handling', function () {
      const invalidData = 'invalid json data';
      
      const badReqRes = http.post(`${config.apiUrl}/posts`, invalidData, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      check(badReqRes, {
        'bad request handled properly': (r) => r.status >= 400 && r.status < 500,
        'bad request response time acceptable': (r) => r.timings.duration < 2000
      });
    });

    sleep(randomSleep(0.5, 1));

    // 10. Teste de métodos não permitidos
    group('Method Not Allowed', function () {
      const methodRes = http.patch(`${config.apiUrl}/posts`, JSON.stringify({test: 'data'}), {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      check(methodRes, {
        'method not allowed handled': (r) => r.status === 404 || r.status === 405 || r.status === 200 // Alguns APIs podem aceitar
      });
    });
  });

  sleep(randomSleep(1, 3));

  // Testes de relacionamentos e dados complexos
  group('Complex Data Operations', function () {
    // 11. Trabalhar com relacionamentos
    group('Related Data', function () {
      const userId = randomNumber(1, 10);
      
      // Buscar usuário e seus posts
      const userRes = http.get(`${config.apiUrl}/users/${userId}`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      validateResponse(userRes, 200);
      
      if (userRes.status === 200) {
        const userPostsRes = http.get(`${config.apiUrl}/users/${userId}/posts`, {
          headers: defaultHeaders,
          timeout: config.timeout
        });
        
        check(userPostsRes, {
          'user posts retrieved': (r) => r.status === 200,
          'user posts is array': (r) => {
            try {
              const posts = JSON.parse(r.body);
              return Array.isArray(posts);
            } catch (e) {
              return false;
            }
          }
        });
      }
    });

    sleep(randomSleep(1, 2));

    // 12. Dados com estrutura complexa
    group('Complex Structure Data', function () {
      const complexData = JSON.stringify({
        title: `Complex Structure ${randomString(8)}`,
        body: 'Complex data structure test',
        userId: randomNumber(1, 10),
        metadata: {
          tags: ['complex', 'test', 'api'],
          settings: {
            visible: true,
            priority: randomNumber(1, 5),
            categories: ['tech', 'testing']
          },
          analytics: {
            views: randomNumber(1, 1000),
            likes: randomNumber(1, 100),
            shares: randomNumber(1, 50)
          }
        },
        created: new Date().toISOString(),
        attributes: Array.from({length: 5}, (_, i) => ({
          key: `attr_${i}`,
          value: randomString(10),
          type: ['string', 'number', 'boolean'][randomNumber(0, 2)]
        }))
      });

      const complexRes = http.post(`${config.apiUrl}/posts`, complexData, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      validateResponse(complexRes, 201);
      
      check(complexRes, {
        'complex data structure handled': (r) => r.status === 201,
        'complex data response valid': (r) => {
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

  sleep(randomSleep(2, 5));
}
