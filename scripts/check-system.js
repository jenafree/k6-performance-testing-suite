import { check } from 'k6';
import exec from 'k6/execution';

// Script para verificar se o sistema pode rodar os testes de performance
export const options = {
  vus: 1,
  duration: '5s',
  thresholds: {
    checks: ['rate>0.8'], // 80% dos checks devem passar
  },
};

export function setup() {
  console.log('🔍 Verificando capacidade do sistema para testes de performance...');
  return {
    startTime: Date.now()
  };
}

export default function(data) {
  const startTime = Date.now();
  
  // Teste básico de CPU
  let iterations = 0;
  const cpuTestStart = Date.now();
  while (Date.now() - cpuTestStart < 100) { // 100ms de teste
    iterations++;
  }
  
  const cpuScore = iterations / 1000; // Score aproximado
  
  // Simulação de carga de memória
  const memoryTest = [];
  for (let i = 0; i < 1000; i++) {
    memoryTest.push(`test_string_${i}_${'x'.repeat(100)}`);
  }
  
  const memoryTestTime = Date.now() - startTime;
  
  // Verificações do sistema
  const systemChecks = check(data, {
    'CPU performance adequate': () => cpuScore > 50, // Threshold básico
    'Memory allocation fast': () => memoryTestTime < 100,
    'System responsive': () => Date.now() - startTime < 1000,
  });
  
  // Recomendações baseadas nos resultados
  if (cpuScore > 200) {
    console.log('💜 MÁQUINA POTENTE: Pode rodar todos os testes, incluindo breaking-point e endurance!');
  } else if (cpuScore > 100) {
    console.log('💙 MÁQUINA INTERMEDIÁRIA: Pode rodar a maioria dos testes. Evite breaking-point com 1000 VUs.');
  } else if (cpuScore > 50) {
    console.log('💚 MÁQUINA BÁSICA: Pode rodar testes leves (smoke, load, auth, api-crud). Cuidado com stress tests.');
  } else {
    console.log('🔴 MÁQUINA LIMITADA: Foque apenas em smoke e load tests com poucos VUs.');
  }
  
  console.log(`📊 CPU Score: ${cpuScore.toFixed(1)}`);
  console.log(`⏱️ Memory Test: ${memoryTestTime}ms`);
  
  // Recomendações específicas
  console.log('\n📋 RECOMENDAÇÕES PARA SUA MÁQUINA:');
  
  if (cpuScore > 100) {
    console.log('✅ smoke, load, auth, api-crud, spike, soak');
    console.log('⚠️ stress, volume, capacity (com monitoramento)');
    if (cpuScore > 200) {
      console.log('🚀 breaking-point, endurance (máquina potente)');
    }
  } else {
    console.log('✅ smoke, load, auth, api-crud');
    console.log('⚠️ spike, soak (com monitoramento de CPU/RAM)');
    console.log('❌ Evite: stress, breaking-point, endurance');
  }
  
  console.log('\n💡 COMANDOS RECOMENDADOS:');
  console.log('# Sequência segura para começar:');
  console.log('.\\run.ps1 smoke');
  console.log('.\\run.ps1 load');
  
  if (cpuScore > 75) {
    console.log('.\\run.ps1 auth');
    console.log('.\\run.ps1 api-crud');
  }
  
  if (cpuScore > 100) {
    console.log('\n# Testes mais avançados (com monitoramento):');
    console.log('.\\run.ps1 stress');
    console.log('.\\run.ps1 volume');
  }
  
  return systemChecks;
}

export function teardown(data) {
  const totalTime = Date.now() - data.startTime;
  console.log(`\n⏱️ Verificação concluída em ${totalTime}ms`);
  console.log('🎯 Execute os testes recomendados baseados na sua máquina!');
}

