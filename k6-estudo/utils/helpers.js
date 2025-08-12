import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas customizadas
export const errorRate = new Rate('errors');
export const apiResponseTime = new Trend('api_response_time');

// Headers padrão para APIs
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'k6-performance-test/1.0'
};

// Função para validações comuns de resposta
export function validateResponse(response, expectedStatus = 200) {
  const result = check(response, {
    [`status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
    'response has body': (r) => r.body && r.body.length > 0,
    'no server errors': (r) => r.status < 500
  });
  
  errorRate.add(!result);
  apiResponseTime.add(response.timings.duration);
  
  return result;
}

// Função para gerar dados aleatórios
export function randomString(length = 10, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function randomEmail() {
  return `user${randomString(5)}@test.com`;
}

export function randomNumber(min = 1, max = 100) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Função para simular pensamento do usuário
export function randomSleep(min = 1, max = 3) {
  const sleepTime = Math.random() * (max - min) + min;
  return sleepTime;
}

// Função para criar payload de login
export function createLoginPayload(email, password) {
  return JSON.stringify({
    email: email,
    password: password,
    timestamp: new Date().toISOString()
  });
}

// Função para criar payload de usuário
export function createUserPayload() {
  return JSON.stringify({
    name: `User ${randomString(8)}`,
    email: randomEmail(),
    age: randomNumber(18, 65),
    city: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador'][Math.floor(Math.random() * 4)]
  });
}
