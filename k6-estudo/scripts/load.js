import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { getConfig, testData } from '../config/environments.js';
import { validateResponse, defaultHeaders, randomSleep, createUserPayload, randomNumber } from '../utils/helpers.js';

const config = getConfig();

export const options = {
  stages: [
    { duration: '30s', target: 10 },    // Ramp up
    { duration: '1m', target: 30 },     // Load testing
    { duration: '2m', target: 30 },     // Sustain load
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500', 'p(99)<2000'],
    'group_duration{group:::User Journey}': ['p(95)<3000'],
    'group_duration{group:::API Operations}': ['p(95)<1000'],
    'group_duration{group:::Data Creation}': ['p(95)<2000'],
  },
};

export default function () {
  // Simula jornada completa do usuário
  group('User Journey', function () {
    // 1. Página inicial / Health check
    group('Homepage', function () {
      const homeRes = http.get(`${config.baseUrl}/get`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      validateResponse(homeRes, 200);
    });

    sleep(randomSleep(1, 3));

    // 2. Buscar lista de posts
    group('Browse Content', function () {
      const postsRes = http.get(`${config.apiUrl}/posts?_limit=10`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      validateResponse(postsRes, 200);
      
      check(postsRes, {
        'posts list contains items': (r) => {
          if (!r.body) return false;
          try {
            const posts = JSON.parse(r.body);
            return Array.isArray(posts) && posts.length > 0;
          } catch (e) {
            return false;
          }
        }
      });
    });

    sleep(randomSleep(2, 4));

    // 3. Ver detalhes de um post específico
    group('View Details', function () {
      const postId = randomNumber(1, 100);
      const detailRes = http.get(`${config.apiUrl}/posts/${postId}`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      validateResponse(detailRes, 200);
      
      check(detailRes, {
        'post details loaded': (r) => {
          if (!r.body) return false;
          try {
            const post = JSON.parse(r.body);
            return post.id && post.title && post.body;
          } catch (e) {
            return false;
          }
        }
      });
    });

    sleep(randomSleep(1, 2));
  });

  // Operações de API mais pesadas
  group('API Operations', function () {
    // Busca com filtros
    group('Search with Filters', function () {
      const userId = randomNumber(1, 10);
      const userPostsRes = http.get(`${config.apiUrl}/posts?userId=${userId}`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      validateResponse(userPostsRes, 200);
    });

    sleep(randomSleep(0.5, 1.5));

    // Buscar comentários
    group('Load Comments', function () {
      const postId = randomNumber(1, 100);
      const commentsRes = http.get(`${config.apiUrl}/posts/${postId}/comments`, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      validateResponse(commentsRes, 200);
      
      check(commentsRes, {
        'comments loaded': (r) => {
          if (!r.body) return false;
          try {
            const comments = JSON.parse(r.body);
            return Array.isArray(comments);
          } catch (e) {
            return false;
          }
        }
      });
    });
  });

  // Simula criação de dados (mesmo que seja mock)
  group('Data Creation', function () {
    const newPost = JSON.stringify({
      title: `Post de teste ${Date.now()}`,
      body: 'Este é um post criado durante o teste de carga',
      userId: randomNumber(1, 10)
    });

    const createRes = http.post(`${config.apiUrl}/posts`, newPost, {
      headers: defaultHeaders,
      timeout: config.timeout
    });
    
    validateResponse(createRes, 201);
    
    check(createRes, {
      'post created successfully': (r) => {
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

  sleep(randomSleep(1, 3));
}