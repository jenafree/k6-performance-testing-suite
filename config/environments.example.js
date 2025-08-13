// Arquivo de exemplo para configuração de ambientes
// Copie este arquivo para environments.js e personalize as URLs

export const environments = {
  dev: {
    baseUrl: 'https://sua-api-dev.com',
    apiUrl: 'https://sua-api-dev.com/api/v1',
    timeout: '30s',
    description: 'Ambiente de desenvolvimento'
  },
  staging: {
    baseUrl: 'https://sua-api-staging.com',
    apiUrl: 'https://sua-api-staging.com/api/v1',
    timeout: '10s',
    description: 'Ambiente de homologação'
  },
  prod: {
    baseUrl: 'https://sua-api-prod.com',
    apiUrl: 'https://sua-api-prod.com/api/v1',
    timeout: '5s',
    description: 'Ambiente de produção'
  }
};

// Função para obter configuração do ambiente
export function getConfig() {
  const env = __ENV.ENVIRONMENT || 'dev';
  const config = environments[env] || environments.dev;
  
  console.log(`🌍 Executando testes no ambiente: ${env} (${config.description})`);
  console.log(`🔗 URL base: ${config.baseUrl}`);
  console.log(`⏱️ Timeout: ${config.timeout}`);
  
  return config;
}

// Dados de teste que podem ser personalizados por ambiente
export const testData = {
  users: [
    { email: 'admin@suaempresa.com', password: 'admin123', role: 'admin' },
    { email: 'user1@suaempresa.com', password: 'user123', role: 'user' },
    { email: 'tester@suaempresa.com', password: 'test123', role: 'tester' }
  ],
  products: [
    { name: 'Produto Premium', price: 99.99, category: 'premium' },
    { name: 'Produto Standard', price: 49.99, category: 'standard' },
    { name: 'Produto Básico', price: 19.99, category: 'basic' }
  ],
  // Configurações específicas por ambiente
  settings: {
    dev: {
      maxRetries: 3,
      retryDelay: 1000,
      debugMode: true
    },
    staging: {
      maxRetries: 2,
      retryDelay: 500,
      debugMode: false
    },
    prod: {
      maxRetries: 1,
      retryDelay: 100,
      debugMode: false
    }
  }
};

