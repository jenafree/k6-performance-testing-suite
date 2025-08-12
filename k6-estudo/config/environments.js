// Configurações de ambiente para os testes
export const environments = {
  dev: {
    baseUrl: 'https://httpbin.org',
    apiUrl: 'https://jsonplaceholder.typicode.com',
    timeout: '30s'
  },
  staging: {
    baseUrl: 'https://httpbin.org',
    apiUrl: 'https://jsonplaceholder.typicode.com', 
    timeout: '10s'
  },
  prod: {
    baseUrl: 'https://httpbin.org',
    apiUrl: 'https://jsonplaceholder.typicode.com',
    timeout: '5s'
  }
};

// Função para obter configuração do ambiente
export function getConfig() {
  const env = __ENV.ENVIRONMENT || 'dev';
  return environments[env] || environments.dev;
}

// Dados de teste compartilhados
export const testData = {
  users: [
    { email: 'user1@test.com', password: 'password123' },
    { email: 'user2@test.com', password: 'password456' },
    { email: 'admin@test.com', password: 'admin123' }
  ],
  products: [
    { name: 'Produto 1', price: 29.99 },
    { name: 'Produto 2', price: 49.99 },
    { name: 'Produto 3', price: 19.99 }
  ]
};
