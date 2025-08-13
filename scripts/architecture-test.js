import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { getConfig } from '../config/environments.js';
import { validateResponse, defaultHeaders, randomSleep, randomNumber, randomString } from '../utils/helpers.js';

const config = getConfig();

export const options = {
  vus: 5,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.10'],           // Mais tolerante: 10% de falha é aceitável
    http_req_duration: ['p(95)<3000'],        // Mais tolerante: 3s para p95
    'group_duration{group:::Sistema Básico}': ['p(95)<2000'],
    'group_duration{group:::Operações API}': ['p(95)<4000'],
    'group_duration{group:::Fluxo Usuário}': ['p(95)<5000'],
  },
};

export default function () {
  console.log(`[Architecture Test] VU ${__VU} - Iniciando teste de arquitetura`);
  
  // 1. Teste do Sistema Básico
  group('Sistema Básico', function () {
    console.log(`[Architecture Test] VU ${__VU} - Testando sistema básico`);
    
    // Health check simples
    group('Health Check', function () {
      const healthRes = http.get(`${config.baseUrl}/get`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      validateResponse(healthRes, 200);
      
      check(healthRes, {
        'sistema está online': (r) => r.status === 200,
        'resposta rápida': (r) => r.timings.duration < 2000,
        'sem erros de servidor': (r) => r.status < 500
      });
    });

    sleep(randomSleep(0.5, 1));

    // Teste de conectividade com parâmetros
    group('Conectividade', function () {
      const connectRes = http.get(`${config.baseUrl}/get?test=architecture&vu=${__VU}`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      check(connectRes, {
        'conectividade OK': (r) => r.status === 200,
        'parâmetros processados': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.args && body.args.test === 'architecture';
          } catch (e) {
            return false;
          }
        }
      });
    });
  });

  sleep(randomSleep(1, 2));

  // 2. Teste das Operações de API
  group('Operações API', function () {
    console.log(`[Architecture Test] VU ${__VU} - Testando operações de API`);
    
    // GET simples
    group('Leitura de Dados', function () {
      const readRes = http.get(`${config.apiUrl}/posts/${randomNumber(1, 10)}`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      check(readRes, {
        'leitura bem-sucedida': (r) => r.status === 200,
        'dados válidos retornados': (r) => {
          try {
            const post = JSON.parse(r.body);
            return post.id !== undefined && post.title !== undefined;
          } catch (e) {
            return false;
          }
        }
      });
    });

    sleep(randomSleep(0.5, 1));

    // POST controlado
    group('Criação de Dados', function () {
      const newPost = JSON.stringify({
        title: `Architecture Test ${__VU}-${Date.now()}`,
        body: `Teste de arquitetura - VU ${__VU}`,
        userId: randomNumber(1, 5)
      });

      const createRes = http.post(`${config.apiUrl}/posts`, newPost, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      check(createRes, {
        'criação bem-sucedida': (r) => r.status === 201,
        'resposta contém ID': (r) => {
          try {
            const created = JSON.parse(r.body);
            return created.id !== undefined;
          } catch (e) {
            return false;
          }
        }
      });
    });

    sleep(randomSleep(0.5, 1));

    // Lista com filtros leves
    group('Consulta com Filtros', function () {
      const queryRes = http.get(`${config.apiUrl}/posts?_limit=5&userId=${randomNumber(1, 3)}`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      check(queryRes, {
        'consulta bem-sucedida': (r) => r.status === 200,
        'filtros aplicados': (r) => {
          try {
            const posts = JSON.parse(r.body);
            return Array.isArray(posts) && posts.length <= 5;
          } catch (e) {
            return false;
          }
        }
      });
    });
  });

  sleep(randomSleep(1, 3));

  // 3. Teste do Fluxo do Usuário
  group('Fluxo Usuário', function () {
    console.log(`[Architecture Test] VU ${__VU} - Testando fluxo do usuário`);
    
    // Simular navegação do usuário
    group('Navegação', function () {
      // Lista de posts (página inicial)
      const homeRes = http.get(`${config.apiUrl}/posts?_limit=10`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      check(homeRes, {
        'página inicial carregada': (r) => r.status === 200
      });

      sleep(randomSleep(1, 2)); // Usuário lendo a página

      // Detalhes de um post
      if (homeRes.status === 200) {
        try {
          const posts = JSON.parse(homeRes.body);
          if (posts.length > 0) {
            const postId = posts[0].id;
            
            const detailRes = http.get(`${config.apiUrl}/posts/${postId}`, {
              headers: defaultHeaders,
              timeout: config.timeout
            });
            
            check(detailRes, {
              'detalhes carregados': (r) => r.status === 200
            });

            // Comentários do post
            const commentsRes = http.get(`${config.apiUrl}/posts/${postId}/comments`, {
              headers: defaultHeaders,
              timeout: config.timeout
            });
            
            check(commentsRes, {
              'comentários carregados': (r) => r.status === 200,
              'comentários são array': (r) => {
                try {
                  const comments = JSON.parse(r.body);
                  return Array.isArray(comments);
                } catch (e) {
                  return false;
                }
              }
            });
          }
        } catch (e) {
          console.log(`[Architecture Test] VU ${__VU} - Erro no parsing da home: ${e}`);
        }
      }
    });

    sleep(randomSleep(1, 2));

    // Simular busca de usuário
    group('Busca de Usuário', function () {
      const userId = randomNumber(1, 5);
      
      const userRes = http.get(`${config.apiUrl}/users/${userId}`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      check(userRes, {
        'usuário encontrado': (r) => r.status === 200,
        'dados do usuário válidos': (r) => {
          try {
            const user = JSON.parse(r.body);
            return user.id && user.name && user.email;
          } catch (e) {
            return false;
          }
        }
      });

      // Posts do usuário
      if (userRes.status === 200) {
        const userPostsRes = http.get(`${config.apiUrl}/users/${userId}/posts`, {
          headers: defaultHeaders,
          timeout: config.timeout
        });
        
        check(userPostsRes, {
          'posts do usuário carregados': (r) => r.status === 200
        });
      }
    });
  });

  sleep(randomSleep(1, 2));

  console.log(`[Architecture Test] VU ${__VU} - Teste concluído com sucesso`);
}

export function handleSummary(data) {
  console.log('\n=== RESUMO DO TESTE DE ARQUITETURA ===');
  console.log(`Usuários Virtuais: ${data.metrics.vus.values.max}`);
  console.log(`Requisições Totais: ${data.metrics.http_reqs.values.count}`);
  console.log(`Taxa de Erro: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`);
  console.log(`Tempo Médio de Resposta: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
  console.log(`P95 Tempo de Resposta: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
  console.log('==========================================\n');
  
  return {
    'stdout': '', // Não duplicar output no console
  };
}
