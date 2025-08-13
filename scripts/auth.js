import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { getConfig, testData } from '../config/environments.js';
import { validateResponse, defaultHeaders, randomSleep, createLoginPayload, randomString } from '../utils/helpers.js';

const config = getConfig();

export const options = {
  vus: 5,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
    'group_duration{group:::Authentication Flow}': ['p(95)<3000'],
    'group_duration{group:::Authenticated Operations}': ['p(95)<1500'],
  },
};

export default function () {
  let authToken = null;
  
  // Fluxo de autenticação completo
  group('Authentication Flow', function () {
    // 1. Simular login
    group('Login Process', function () {
      const user = testData.users[Math.floor(Math.random() * testData.users.length)];
      const loginPayload = createLoginPayload(user.email, user.password);
      
      const loginRes = http.post(`${config.baseUrl}/post`, loginPayload, {
        headers: defaultHeaders,
        timeout: config.timeout
      });
      
      validateResponse(loginRes, 200);
      
      check(loginRes, {
        'login successful': (r) => r.status === 200,
        'response contains data': (r) => {
          const body = JSON.parse(r.body);
          return body.data !== undefined;
        }
      });
      
      // Simular token JWT (na vida real viria da resposta)
      authToken = `Bearer jwt_token_${randomString(32)}`;
    });

    sleep(randomSleep(1, 2));

    // 2. Validar sessão
    group('Session Validation', function () {
      const sessionRes = http.get(`${config.baseUrl}/bearer`, {
        headers: Object.assign({}, defaultHeaders, {
          'Authorization': authToken
        }),
        timeout: config.timeout
      });
      
      validateResponse(sessionRes, 200);
      
      check(sessionRes, {
        'session is valid': (r) => r.status === 200,
        'token is recognized': (r) => {
          const body = JSON.parse(r.body);
          return body.authenticated === true || body.token !== undefined;
        }
      });
    });
  });

  sleep(randomSleep(2, 4));

  // Operações que requerem autenticação
  group('Authenticated Operations', function () {
    // 3. Buscar dados do perfil
    group('Profile Operations', function () {
      const profileRes = http.get(`${config.apiUrl}/users/1`, {
        headers: Object.assign({}, defaultHeaders, {
          'Authorization': authToken
        }),
        timeout: config.timeout
      });
      
      validateResponse(profileRes, 200);
      
      check(profileRes, {
        'profile data loaded': (r) => {
          const profile = JSON.parse(r.body);
          return profile.id && profile.name && profile.email;
        }
      });
    });

    sleep(randomSleep(1, 2));

    // 4. Atualizar dados do usuário
    group('Update Profile', function () {
      const updatePayload = JSON.stringify({
        name: `Updated User ${randomString(5)}`,
        email: `updated${randomString(8)}@test.com`,
        phone: `11999${randomString(6, '0123456789')}`
      });

      const updateRes = http.put(`${config.apiUrl}/users/1`, updatePayload, {
        headers: Object.assign({}, defaultHeaders, {
          'Authorization': authToken
        }),
        timeout: config.timeout
      });
      
      validateResponse(updateRes, 200);
      
      check(updateRes, {
        'profile updated successfully': (r) => r.status === 200,
        'response contains updated data': (r) => {
          const updated = JSON.parse(r.body);
          return updated.id !== undefined;
        }
      });
    });

    sleep(randomSleep(1, 2));

    // 5. Criar conteúdo privado
    group('Create Private Content', function () {
      const privatePostPayload = JSON.stringify({
        title: `Post Privado ${Date.now()}`,
        body: `Conteúdo criado por usuário autenticado - ${randomString(20)}`,
        userId: 1,
        private: true
      });

      const createRes = http.post(`${config.apiUrl}/posts`, privatePostPayload, {
        headers: Object.assign({}, defaultHeaders, {
          'Authorization': authToken
        }),
        timeout: config.timeout
      });
      
      validateResponse(createRes, 201);
      
      check(createRes, {
        'private content created': (r) => {
          const created = JSON.parse(r.body);
          return created.id !== undefined;
        }
      });
    });

    sleep(randomSleep(1, 2));

    // 6. Listar conteúdo do usuário
    group('List User Content', function () {
      const userContentRes = http.get(`${config.apiUrl}/users/1/posts`, {
        headers: Object.assign({}, defaultHeaders, {
          'Authorization': authToken
        }),
        timeout: config.timeout
      });
      
      validateResponse(userContentRes, 200);
      
      check(userContentRes, {
        'user content listed': (r) => {
          const posts = JSON.parse(r.body);
          return Array.isArray(posts);
        }
      });
    });
  });

  sleep(randomSleep(1, 2));

  // 7. Logout (opcional)
  group('Logout', function () {
    const logoutRes = http.post(`${config.baseUrl}/post`, JSON.stringify({
      action: 'logout',
      token: authToken
    }), {
      headers: defaultHeaders,
      timeout: config.timeout
    });
    
    check(logoutRes, {
      'logout successful': (r) => r.status === 200
    });
  });

  sleep(randomSleep(0.5, 1));
}
