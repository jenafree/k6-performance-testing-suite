# 📊 Guia Completo de Testes de Performance com k6

## 🎯 O que são Testes de Performance?

Os testes de performance avaliam como um sistema se comporta sob diferentes condições de carga, identificando gargalos, limites e pontos de falha antes que afetem usuários reais.

### 🔍 Por que Testar Performance?

- **Experiência do Usuário**: Sites lentos perdem 40% dos usuários em 3 segundos
- **Receita**: 1 segundo de atraso pode reduzir conversões em 7%
- **Confiabilidade**: Detectar falhas antes da produção
- **Capacidade**: Dimensionar infraestrutura adequadamente
- **SLA**: Garantir acordos de nível de serviço

## 👥 Conceitos Fundamentais

### 🧑‍💻 Virtual Users (VUs) - Usuários Virtuais

**VUs** simulam usuários reais interagindo com seu sistema:

- **1 VU** = 1 usuário simultâneo executando o script
- **10 VUs** = 10 usuários acessando ao mesmo tempo
- **100 VUs** = 100 sessões concorrentes

```javascript
export const options = {
  vus: 50,        // 50 usuários simultâneos
  duration: '5m', // Por 5 minutos
};
```

### 📈 Rampas (Ramp-up/Ramp-down)

**Rampas** controlam como os usuários entram e saem do teste:

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp-up: 0→100 usuários em 2min
    { duration: '5m', target: 100 },  // Sustenta: 100 usuários por 5min  
    { duration: '2m', target: 0 },    // Ramp-down: 100→0 usuários em 2min
  ],
};
```

**Por que usar rampas?**
- Simula crescimento orgânico de usuários
- Evita "efeito thundering herd" (todos chegam juntos)
- Permite análise gradual do comportamento do sistema
- Identifica em que ponto exato o sistema degrada

### 📊 Métricas Principais

- **RPS**: Requisições por segundo
- **Response Time**: Tempo de resposta (p50, p95, p99)
- **Error Rate**: Taxa de erros (%)
- **Throughput**: Volume de dados processados
- **Concurrent Users**: Usuários simultâneos ativos

## 🎭 Tipos de Testes de Performance Implementados

### 🔍 1. **Smoke Test** - Verificação Básica de Saúde
**Arquivo**: `scripts/smoke.js`  
**Objetivo**: Verificar se o sistema funciona com carga mínima  
**Usuários**: 1 VU  
**Duração**: 30 segundos  

**Quando usar**: Sempre antes de outros testes  
**O que detecta**: Erros básicos, problemas de conectividade, falhas críticas  

```bash
k6 run scripts/smoke.js
```

**Cenário implementado**:
- Health check da API
- Validação de endpoints críticos  
- Teste de parâmetros básicos
- Verificação de respostas estruturadas

---

### ⚡ 2. **Load Test** - Carga Normal Esperada
**Arquivo**: `scripts/load.js`  
**Objetivo**: Simular carga normal de usuários em produção  
**Usuários**: 10-30 VUs com rampas  
**Duração**: 4 minutos  

**Quando usar**: Para validar performance sob uso normal  
**O que detecta**: Gargalos sob carga esperada, problemas de escalabilidade  

```bash
k6 run scripts/load.js
```

**Cenário implementado**:
- Jornada completa do usuário (Home → Browse → Details)
- Operações de API (GET, POST, filtros)
- Criação de dados realística
- Sleep variável simulando comportamento humano

---

### 🔥 3. **Stress Test** - Limites do Sistema  
**Arquivo**: `scripts/stress.js`  
**Objetivo**: Encontrar o ponto onde o sistema começa a falhar  
**Usuários**: 20-200 VUs progressivo  
**Duração**: 11 minutos  

**Quando usar**: Para descobrir limites máximos  
**O que detecta**: Ponto de quebra, degradação gradual, falhas de recursos  

```bash
k6 run scripts/stress.js
```

**Cenário implementado**:
- Requisições concorrentes múltiplas
- Operações de escrita intensivas  
- Payloads grandes (Large Payload Operations)
- Consultas complexas com filtros

---

### ⚡ 4. **Spike Test** - Picos Súbitos de Tráfego
**Arquivo**: `scripts/spike.js`  
**Objetivo**: Testar comportamento com aumentos súbitos de usuários  
**Usuários**: 2→100 VUs instantâneo  
**Duração**: 1 minuto  

**Quando usar**: Para simular viral content, campanhas, Black Friday  
**O que detecta**: Falhas de auto-scaling, timeout de recursos, crash do sistema  

```bash
k6 run scripts/spike.js
```

**Cenário implementado**:
- Operações críticas que DEVEM funcionar
- Mecanismos de fallback e degradação graciosa
- Teste de cache e CDN durante picos
- Retry logic e circuit breakers

---

### 🔋 5. **Soak Test** - Estabilidade a Longo Prazo
**Arquivo**: `scripts/soak.js`  
**Objetivo**: Detectar vazamentos de memória e degradação temporal  
**Usuários**: 10-20 VUs constante  
**Duração**: 40 minutos  

**Quando usar**: Para validar estabilidade em produção 24/7  
**O que detecta**: Memory leaks, degradação gradual, problemas de garbage collection  

```bash
k6 run scripts/soak.js
```

**Cenário implementado**:
- Acúmulo controlado de dados de sessão
- Operações repetitivas para detectar vazamentos
- Health checks periódicos
- Cleanup e manutenção automática

---

### 🔐 6. **Authentication Test** - Fluxos de Autenticação
**Arquivo**: `scripts/auth.js`  
**Objetivo**: Testar performance de login, sessões e operações autenticadas  
**Usuários**: 5 VUs  
**Duração**: 2 minutos  

**Quando usar**: Para APIs com autenticação, áreas restritas  
**O que detecta**: Gargalos no auth, problemas de sessão, timeout de tokens  

```bash
k6 run scripts/auth.js
```

**Cenário implementado**:
- Fluxo completo: Login → Validação → Operações → Logout
- Simulação de tokens JWT
- Operações que requerem autorização
- Teste de expiração e renovação de sessão

---

### 🛠️ 7. **API CRUD Test** - Operações Completas de API
**Arquivo**: `scripts/api-crud.js`  
**Objetivo**: Testar todas as operações de uma API REST  
**Usuários**: 3 VUs  
**Duração**: 3 minutos  

**Quando usar**: Para APIs REST, microserviços  
**O que detecta**: Gargalos em operações específicas, problemas de consistência  

```bash
k6 run scripts/api-crud.js
```

**Cenário implementado**:
- CRUD completo: Create → Read → Update → Delete
- Operações em lote (bulk operations)
- Tratamento de erros (404, 400, 405)
- Validação de integridade de dados

---

## 🚀 **Testes Avançados** - Cenários Especializados

### 💥 8. **Breaking Point Test** - "Quando o Usuário Vai Cair?"
**Arquivo**: `scripts/breaking-point.js`  
**Objetivo**: Descobrir o exato momento em que usuários começam a abandonar o site  
**Usuários**: 10→1000 VUs progressivo  
**Duração**: 43 minutos  

**🎯 Este teste responde**: "Com quantos usuários simultâneos o site fica inutilizável?"

```bash
k6 run scripts/breaking-point.js
```

**Cenário implementado**:
- Crescimento gradual até encontrar o breaking point
- Operações críticas vs. secundárias vs. fallback
- Logs de progressão para identificar exato momento da quebra
- Sleep adaptativo baseado na carga atual

**Interpretação dos resultados**:
- **< 5% erro**: Sistema saudável
- **5-10% erro**: Sistema sob pressão (WARNING)  
- **10-25% erro**: Sistema degradado (CRITICAL)
- **> 25% erro**: Sistema quebrado (FAILURE)

---

### 📊 9. **Capacity Test** - Dimensionamento de Infraestrutura  
**Arquivo**: `scripts/capacity.js`  
**Objetivo**: Determinar quantos usuários o sistema suporta mantendo SLA  
**Usuários**: 10→300 VUs em etapas  
**Duração**: 50 minutos  

**🎯 Este teste responde**: "Quantos usuários simultâneos podemos atender com qualidade?"

```bash
k6 run scripts/capacity.js
```

**Cenário implementado**:
- Crescimento linear em etapas para mapear capacidade
- Jornada realística de usuário
- API batch para medir throughput
- Think time baseado na carga atual

---

### ⏱️ 10. **Endurance Test** - Resistência a Longo Prazo
**Arquivo**: `scripts/endurance.js`  
**Objetivo**: Sistema funciona estável por horas/dias?  
**Usuários**: 30 VUs constante  
**Duração**: 2 horas e 20 minutos  

**🎯 Este teste responde**: "O sistema aguenta um dia inteiro de Black Friday?"

```bash
k6 run scripts/endurance.js
```

**Cenário implementado**:
- Simulação de sessões que crescem ao longo do tempo
- Detecção de vazamentos através de acúmulo controlado
- Manutenção periódica de sessão
- Monitoramento de degradação temporal

---

### 📦 11. **Volume Test** - Grandes Quantidades de Dados
**Arquivo**: `scripts/volume.js`  
**Objetivo**: Sistema processa grandes volumes de dados eficientemente?  
**Usuários**: 20 VUs  
**Duração**: 15 minutos  

**🎯 Este teste responde**: "O sistema consegue processar uploads de 5MB e listagens de 10.000 itens?"

```bash
k6 run scripts/volume.js
```

**Cenário implementado**:
- Simulação de upload de arquivos grandes
- Processamento de dados em lote
- Requisições concorrentes por usuário
- Estruturas de dados complexas e aninhadas

---

## 🏗️ **Arquitetura dos Testes**

### 📁 Estrutura Organizada
```
k6-estudo/
├── scripts/           # Testes de performance
│   ├── smoke.js       # ✅ Básico
│   ├── load.js        # ⚡ Carga normal  
│   ├── stress.js      # 🔥 Limites
│   ├── spike.js       # ⚡ Picos súbitos
│   ├── soak.js        # 🔋 Longo prazo
│   ├── auth.js        # 🔐 Autenticação
│   ├── api-crud.js    # 🛠️ CRUD completo
│   ├── breaking-point.js # 💥 Ponto de quebra
│   ├── capacity.js    # 📊 Capacidade
│   ├── endurance.js   # ⏱️ Resistência  
│   └── volume.js      # 📦 Grandes volumes
├── utils/             # Utilitários reutilizáveis
├── config/            # Configuração de ambientes
└── results/           # Resultados dos testes
```

### 🔧 Configuração Flexível
- **Ambientes**: dev, staging, prod via `$env:ENVIRONMENT`
- **URLs**: Configuráveis em `config/environments.js`
- **Thresholds**: Personalizáveis por teste
- **Métricas**: Customizadas para cada cenário

## 📋 Pré-requisitos

### 💻 **Requisitos de Sistema**

#### **🖥️ Como Identificar Sua Máquina**

**Windows:**
```powershell
# Verificar CPU e RAM
Get-ComputerInfo | Select-Object CsProcessors, TotalPhysicalMemory, WindowsProductName

# Verificar CPU alternativo
wmic cpu get name
```

**Linux/macOS:**
```bash
# CPU
lscpu  # Linux
sysctl -n machdep.cpu.brand_string  # macOS

# RAM
free -h  # Linux  
sysctl hw.memsize  # macOS
```

#### **✅ Configurações Recomendadas por Tipo de Teste**

| Tipo de Teste | CPU Mínimo | RAM Mínima | Duração | Impacto |
|---------------|------------|------------|---------|---------|
| **🔍 Smoke** | Qualquer | 2GB | 30s | ✅ Zero |
| **⚡ Load** | 2+ cores | 4GB | 4min | ✅ Baixo |
| **🔐 Auth** | 2+ cores | 4GB | 2min | ✅ Baixo |
| **🛠️ API-CRUD** | 2+ cores | 4GB | 3min | ✅ Baixo |
| **⚡ Spike** | 4+ cores | 8GB | 1min | ⚠️ Médio |
| **🔋 Soak** | 4+ cores | 8GB | 40min | ⚠️ Médio |
| **🔥 Stress** | 4+ cores | 8GB | 11min | 🔴 Alto |
| **📊 Capacity** | 4+ cores | 8GB | 50min | 🔴 Alto |
| **💥 Breaking Point** | 8+ cores | 16GB | 43min | 🔴 Muito Alto |
| **⏱️ Endurance** | 4+ cores | 8GB | 2h20min | 🔴 Muito Longo |
| **📦 Volume** | 4+ cores | 8GB | 15min | ⚠️ Médio |

#### **🎯 Recomendações por Hardware**

**💚 MÁQUINAS BÁSICAS** (2-4 cores, 4-8GB RAM):
```powershell
# ✅ PODE RODAR TRANQUILAMENTE:
.\run.ps1 smoke
.\run.ps1 load
.\run.ps1 auth
.\run.ps1 api-crud
.\run.ps1 spike       # Com monitoramento
.\run.ps1 soak        # Com paciência

# ⚠️ COM CUIDADO (fechar outros programas):
.\run.ps1 stress
.\run.ps1 volume
```

**💙 MÁQUINAS INTERMEDIÁRIAS** (4-8 cores, 8-16GB RAM):
```powershell
# ✅ TODOS OS TESTES BÁSICOS E MÉDIOS
.\run-all.ps1 -scenarios smoke,load,auth,api-crud,spike,soak,stress,volume

# ⚠️ COM MONITORAMENTO:
.\run.ps1 capacity
.\run.ps1 breaking-point  # Cuidado com 1000 VUs!
```

**💜 MÁQUINAS POTENTES** (8+ cores, 16+ GB RAM):
```powershell
# 🚀 TODOS OS TESTES SEM MEDO:
.\run-all.ps1  # Suite completa

# Inclusive os mais pesados:
.\run.ps1 breaking-point
.\run.ps1 endurance      # 2h20min
```

#### **🚨 Sinais de Alerta Durante Execução**

**⛔ PARE IMEDIATAMENTE se:**
- **CPU > 95%** por mais de 2 minutos
- **RAM > 90%** da capacidade total
- **Ventilador** fazendo muito barulho
- **Sistema** travando ou muito lento
- **Temperatura** muito alta (laptop esquentando muito)

**⚠️ MONITORE se:**
- CPU entre 70-90%
- RAM entre 70-90%  
- Ventilador acelerado mas não excessivo

#### **🛡️ Como Preparar Sua Máquina**

**Antes de Testes Pesados:**
```powershell
# 1. Verificar recursos disponíveis
Get-Process | Sort-Object CPU -Descending | Select-Object -First 5
Get-Counter "\Memory\Available MBytes"

# 2. Fechar programas desnecessários
# Chrome, Discord, Teams, etc.

# 3. Configurar modo de alta performance
powercfg /setactive SCHEME_MIN  # Modo de alta performance
```

**Durante Execução:**
- Abra **Task Manager** (Ctrl+Shift+Esc)
- Monitore **CPU** e **Memory** na aba "Performance"
- Se CPU > 90%, considere parar o teste

### Instalação Local (Recomendado)
```powershell
# Windows
winget install Grafana.k6 --silent --accept-source-agreements --accept-package-agreements

# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Docker (Alternativa)
```bash
docker run -i grafana/k6 run - < scripts/smoke.js
```

## 🎯 Tipos de Teste Disponíveis

### 🔍 Smoke Test (`scripts/smoke.js`)
- **Objetivo**: Verificação básica de saúde do sistema
- **Cenários**: Health checks, validação de endpoints críticos
- **Duração**: ~30 segundos
- **VUs**: 1
```bash
k6 run scripts/smoke.js
# ou
.\run.ps1 smoke
```

### ⚡ Load Test (`scripts/load.js`)
- **Objetivo**: Teste de carga gradual simulando uso normal
- **Cenários**: Jornada completa do usuário, operações CRUD
- **Duração**: ~4 minutos
- **VUs**: 10-30
```bash
k6 run scripts/load.js
# ou
.\run.ps1 load
```

### 🔥 Stress Test (`scripts/stress.js`)
- **Objetivo**: Encontrar limites do sistema
- **Cenários**: Operações pesadas, payloads grandes, requisições concorrentes
- **Duração**: ~11 minutos
- **VUs**: 20-200
```bash
k6 run scripts/stress.js
# ou
.\run.ps1 stress
```

### ⚡ Spike Test (`scripts/spike.js`)
- **Objetivo**: Testar comportamento com picos súbitos
- **Cenários**: Operações críticas, fallbacks, graceful degradation
- **Duração**: ~1 minuto
- **VUs**: 2-100 (pico súbito)
```bash
k6 run scripts/spike.js
# ou
.\run.ps1 spike
```

### 🔋 Soak Test (`scripts/soak.js`)
- **Objetivo**: Detectar vazamentos de memória e degradação
- **Cenários**: Operações de longa duração, gestão de sessão
- **Duração**: ~40 minutos
- **VUs**: 10-20
```bash
k6 run scripts/soak.js
# ou
.\run.ps1 soak
```

### 🔐 Authentication Test (`scripts/auth.js`)
- **Objetivo**: Testar fluxos de autenticação e autorização
- **Cenários**: Login, JWT, operações autenticadas, logout
- **Duração**: ~2 minutos
- **VUs**: 5
```bash
k6 run scripts/auth.js
# ou
.\run.ps1 auth
```

### 🛠️ API CRUD Test (`scripts/api-crud.js`)
- **Objetivo**: Teste completo de operações CRUD
- **Cenários**: Create, Read, Update, Delete, bulk operations, error handling
- **Duração**: ~3 minutos
- **VUs**: 3
```bash
k6 run scripts/api-crud.js
# ou
.\run.ps1 api-crud
```

## 🚀 **Guia de Execução dos Testes**

### 🎯 **Estratégia de Execução Recomendada**

#### 1. **Sequência Básica** (20 minutos)
```powershell
# 1. Sempre começar com smoke test
.\run.ps1 smoke

# 2. Se smoke passar, testar carga normal
.\run.ps1 load

# 3. Se load for OK, testar autenticação
.\run.ps1 auth

# 4. Por último, CRUD completo
.\run.ps1 api-crud
```

#### 2. **Análise de Limites** (1 hora)  
```powershell
# Descobrir limites do sistema
.\run.ps1 breaking-point  # Encontra ponto de quebra
.\run.ps1 capacity       # Mapeia capacidade máxima
.\run.ps1 stress         # Confirma limites encontrados
```

#### 3. **Testes de Produção** (3+ horas)
```powershell
# Para sistemas que vão para produção
.\run.ps1 endurance      # 2h20min - Testa estabilidade
.\run.ps1 soak          # 40min - Detecta vazamentos  
.\run.ps1 volume        # 15min - Grandes volumes
```

#### 4. **Suite Completa** (4+ horas)
```powershell
# Todos os testes em sequência
.\run-all.ps1 -scenarios smoke,load,auth,api-crud,breaking-point,capacity,stress,spike,soak,endurance,volume
```

### 🌍 **Execução por Ambiente**

```powershell
# Desenvolvimento - Testes rápidos
$env:ENVIRONMENT="dev"
.\run.ps1 smoke
.\run.ps1 load

# Staging - Validação completa
$env:ENVIRONMENT="staging"  
.\run-all.ps1 -scenarios smoke,load,stress,auth,api-crud

# Produção - Só smoke test (nunca stress em prod!)
$env:ENVIRONMENT="prod"
.\run.ps1 smoke
```

### 📊 **Interpretação de Resultados**

#### **Métricas Principais para Análise**

| Métrica | Excelente | Bom | Alerta | Crítico |
|---------|-----------|-----|--------|---------|
| **Response Time (p95)** | < 500ms | < 1s | < 2s | > 2s |
| **Error Rate** | < 0.1% | < 1% | < 5% | > 5% |
| **Throughput (RPS)** | > 100 | > 50 | > 10 | < 10 |
| **Concurrent Users** | Sistema específico | - | - | - |

#### **Como Ler os Resultados de Cada Teste**

**🔍 Smoke Test Results**:
```
✅ PASSOU: Sistema básico funcionando
❌ FALHOU: Pare tudo! Consertar antes de continuar
```

**⚡ Load Test Results**:  
```
http_req_duration.........: avg=245ms  p95=800ms   # ✅ Excelente se p95 < 1s
http_req_failed...........: 0.12%                  # ✅ Muito bom se < 1%  
iterations................: 2847                   # Quantas jornadas completas
```

**💥 Breaking Point Results**:
```
Procure nos logs por:
"Breaking Point] Iteração X - Erros: Y"

- Y < 10% das iterações: Sistema resistente
- Y > 50% das iterações: Encontrou o breaking point!
```

**📊 Capacity Test Results**:
```
Veja em qual estágio começaram os erros:
- 25 VUs: 0% erro → Capacidade: 25+ usuários
- 100 VUs: 2% erro → Capacidade: ~80 usuários  
- 200 VUs: 15% erro → Limite: 100-150 usuários
```

#### **Arquivos de Saída Detalhados**

**📂 Localização**: `results/YYYYMMDD-HHmmss/`

**📄 `teste.summary.json`** - Métricas técnicas:
```json
{
  "metrics": {
    "http_req_duration": {
      "values": {
        "avg": 245.67,
        "p(95)": 789.23,  // ← 95% das requisições abaixo deste valor
        "p(99)": 1234.56  // ← 99% das requisições abaixo deste valor  
      }
    },
    "http_req_failed": {
      "values": {
        "rate": 0.0123    // ← Taxa de erro (1.23%)
      }
    }
  }
}
```

**📄 `teste.console.log`** - Logs de execução:
```
✓ API health check passed
✓ response contains expected data  
✓ system health stable after iterations
```

**📄 `aggregate.json`** - Resumo de todos os testes:
```json
{
  "results": [
    { "scenario": "smoke", "status": "passed" },
    { "scenario": "load", "status": "failed" }  // ← Parar aqui!
  ]
}
```

## 🌍 Configuração de Ambientes

O projeto suporta diferentes ambientes através da variável `ENVIRONMENT`:

```powershell
# Desenvolvimento (padrão)
$env:ENVIRONMENT="dev"
k6 run scripts/load.js

# Staging
$env:ENVIRONMENT="staging"
k6 run scripts/load.js

# Produção
$env:ENVIRONMENT="prod"
k6 run scripts/load.js
```

### Personalizar URLs
Edite o arquivo `config/environments.js` para configurar seus endpoints:

```javascript
export const environments = {
  dev: {
    baseUrl: 'https://sua-api-dev.com',
    apiUrl: 'https://sua-api-dev.com/api',
    timeout: '30s'
  },
  // ...
};
```

## 📊 Observabilidade com Docker Stack

### Subir Stack Completa
```bash
docker compose up -d
```

### Serviços Disponíveis
- **Grafana**: `http://localhost:3000` (admin/admin)
- **InfluxDB**: `http://localhost:8086`
- **k6**: Container para execução de testes

### Executar Testes com Métricas
```bash
# Smoke test com métricas
docker compose run --rm k6 run -o influxdb=http://influxdb:8086/k6 /scripts/smoke.js

# Load test com métricas
docker compose run --rm k6 run -o influxdb=http://influxdb:8086/k6 /scripts/load.js

# Todos os testes locais (apenas JSON)
./run-all.ps1
```

## 📈 Métricas e Thresholds

### Métricas Principais
- **http_req_failed**: Taxa de falhas das requisições
- **http_req_duration**: Tempo de resposta das requisições
- **group_duration**: Tempo de execução por grupo de operações

### Thresholds Configurados
- **Smoke**: p(95) < 800ms, falhas < 1%
- **Load**: p(95) < 1500ms, falhas < 5%
- **Stress**: p(95) < 3000ms, falhas < 10%
- **Spike**: p(95) < 4000ms, falhas < 15%

## 🛡️ Boas Práticas Implementadas

### ✅ Estrutura Organizada
- Configuração centralizada por ambiente
- Utilitários reutilizáveis
- Separação por tipo de teste

### ✅ Cenários Realistas
- Jornadas completas do usuário
- Operações CRUD completas
- Fluxos de autenticação
- Tratamento de erros

### ✅ Validações Robustas
- Checks múltiplos por requisição
- Validação de estrutura de resposta
- Métricas customizadas
- Timeouts configuráveis

### ✅ Observabilidade
- Grupos organizados para análise
- Logs estruturados
- Dashboard pré-configurado
- Métricas em tempo real

## 🔧 Personalização

### Adicionar Novo Teste
1. Crie arquivo em `scripts/`
2. Importe helpers de `utils/helpers.js`
3. Configure ambiente em `config/environments.js`
4. Adicione ao `run.ps1` se necessário

### Modificar Thresholds
Edite as seções `thresholds` nos arquivos de script para ajustar critérios de performance.

### Adicionar Métricas Customizadas
Use as métricas do `utils/helpers.js` ou crie novas seguindo os exemplos.

## 📝 Logs e Debug

### Executar com Logs Detalhados
```bash
k6 run --verbose scripts/load.js
```

### Verificar Apenas Validações
```bash
k6 run --no-summary scripts/smoke.js
```

## 🎯 **Cenários de Uso Práticos**

### 🛒 **E-commerce / Black Friday**
```powershell
# Preparação para Black Friday
.\run.ps1 capacity       # Descobre quantos usuários suporta
.\run.ps1 breaking-point # Encontra o limite absoluto
.\run.ps1 spike         # Simula viral da promoção
.\run.ps1 endurance     # Testa 24h de alta carga
```

### 🏦 **Sistema Bancário / Financeiro**  
```powershell
# Validação de segurança e performance
.\run.ps1 smoke         # Health check básico
.\run.ps1 auth          # Validação de autenticação
.\run.ps1 soak          # Estabilidade 24/7
# NUNCA rodar stress/breaking-point em produção!
```

### 📱 **API Mobile / Microserviços**
```powershell
# Validação de APIs
.\run.ps1 api-crud      # Testa todas as operações
.\run.ps1 load          # Carga normal
.\run.ps1 volume        # Grandes volumes de dados
```

### 🎮 **Sistema de Gaming / Social**
```powershell
# Picos de usuários imprevisíveis
.\run.ps1 spike         # Viral content
.\run.ps1 breaking-point # Quantos players simultâneos?
.\run.ps1 endurance     # Servidores 24/7
```

## 🚨 **Troubleshooting e Interpretação de Falhas**

### ❌ **Smoke Test Falhou**
```
💥 PARE TUDO! Sistema básico não funciona

Possíveis causas:
- Serviço offline
- URL incorreta
- Rede/DNS
- Autenticação básica quebrada

Solução: Verificar conectividade básica primeiro
```

### ⚠️ **Load Test Degradou**
```
⚠️ Sistema não aguenta carga normal

Sintomas: p95 > 2s ou error rate > 5%
Causas: Database, memory, CPU, network
Ação: Analisar métricas por grupo de operação
```

### 🔥 **Breaking Point < 50 usuários**
```
🔴 Sistema não é escalável

Problema crítico de arquitetura:
- Database sem índices
- N+1 queries  
- Memory leaks
- CPU intensivo
- Synchronous processing

Ação: Profiling de código + infraestrutura
```

### 💧 **Soak/Endurance Degradando**
```
📉 Memory leak detectado

Sintomas: Performance piora ao longo do tempo
Causas: Memory leaks, garbage collection, cache infinito
Ação: Monitoring de memória + profiling
```

## 📊 **Análise Avançada de Resultados**

### 🎯 **Identificando Gargalos por Grupo**

```javascript
// Nos logs, procure por tempos de grupo:
✓ group_duration{group:::User Journey}..........: avg=1.2s  p(95)=2.3s
✓ group_duration{group:::API Operations}........: avg=456ms p(95)=890ms  
✓ group_duration{group:::Data Creation}.........: avg=2.1s  p(95)=4.5s  ← GARGALO!
```

### 📈 **Tendências Temporais**

```bash
# Execute o mesmo teste várias vezes
.\run.ps1 load    # Primeira vez
.\run.ps1 load    # Segunda vez  
.\run.ps1 load    # Terceira vez

# Compare os p95 - devem ser consistentes
# Se piorando: memory leak
# Se melhorando: cache warming up
```

### 🔍 **Correlação VUs vs Performance**

| VUs | p95 Response | Error Rate | RPS | Status |
|-----|-------------|------------|-----|---------|
| 10  | 200ms       | 0%         | 45  | ✅ Ideal |
| 25  | 350ms       | 0%         | 89  | ✅ Bom |  
| 50  | 800ms       | 1%         | 156 | ⚠️ Alerta |
| 100 | 2.3s        | 8%         | 203 | 🔴 Limite |
| 200 | 8.9s        | 35%        | 87  | 💥 Quebrado |

## 🛡️ **Boas Práticas de Segurança**

### ⚠️ **NUNCA faça em Produção**:
- ❌ Stress Test
- ❌ Breaking Point Test  
- ❌ Spike Test
- ❌ Volume Test com dados reais

### ✅ **Seguro em Produção**:
- ✅ Smoke Test (baixo impacto)
- ✅ Load Test limitado (< 10% da capacidade)
- ✅ Auth Test com dados de teste

### 🔐 **Dados de Teste**:
```javascript
// Use SEMPRE dados fake/mock
const testData = {
  users: [
    { email: 'test@example.com', password: 'fake123' }
  ]
};

// NUNCA dados reais:
// ❌ { email: 'cliente@empresa.com', password: 'senha123' }
```

## 🚀 **Otimizações de Performance**

### 📈 **Melhorias Comuns Baseadas em Resultados**

**🐌 Problema: p95 > 2s no Load Test**
```javascript
// Solução 1: Database indexing
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);

// Solução 2: Caching
app.use('/api/posts', cache('5 minutes'));

// Solução 3: Pagination
GET /api/posts?limit=20&offset=0
```

**💥 Problema: Breaking Point < 100 usuários**
```javascript
// Solução 1: Connection pooling
const pool = new Pool({ max: 20, min: 5 });

// Solução 2: Async processing  
app.post('/api/heavy', async (req, res) => {
  queue.add('heavy-job', req.body);
  res.status(202).json({ status: 'processing' });
});

// Solução 3: Rate limiting
app.use(rateLimit({ windowMs: 15000, max: 100 }));
```

**🔄 Problema: Memory leak no Soak Test**
```javascript
// Solução: Cleanup adequado
const cache = new Map();
setInterval(() => {
  // Limpa cache antigo
  cache.clear();
}, 600000); // 10 minutos
```

## 🎓 **Interpretação Científica**

### 📚 **Lei de Little (Capacity Planning)**
```
Concurrent Users = Throughput × Response Time

Exemplo:
- Throughput: 100 RPS
- Response Time: 0.5s  
- Concurrent Users: 100 × 0.5 = 50 VUs
```

### 📊 **Distribuições Estatísticas**
```
p50 (mediana): 50% das requisições abaixo deste valor
p95: 95% das requisições abaixo deste valor (SLA comum)
p99: 99% das requisições abaixo deste valor (SLA strict)
p99.9: 99.9% das requisições (SLA ultra strict)
```

### 🎯 **Thresholds Baseados em Negócio**
```javascript
// E-commerce
thresholds: {
  'http_req_duration': ['p(95)<1000'], // Conversion rate
  'http_req_failed': ['rate<0.01'],    // Revenue loss
}

// Sistema crítico (saúde, financeiro)
thresholds: {
  'http_req_duration': ['p(99)<500'],  // User safety
  'http_req_failed': ['rate<0.001'],   // Regulatory compliance
}
```

## 🤝 **Contribuindo para o Projeto**

1. **Fork** o projeto
2. **Clone** seu fork localmente
3. **Crie** uma branch para sua feature: `git checkout -b nova-feature`
4. **Implemente** seguindo as boas práticas
5. **Teste** com todos os cenários relevantes
6. **Commit** com mensagens descritivas
7. **Push** para seu fork: `git push origin nova-feature`
8. **Abra** um Pull Request detalhado

### 🎯 **Áreas para Contribuição**
- 🔧 Novos tipos de teste especializados
- 📊 Dashboards personalizados do Grafana
- 🐳 Configurações Docker mais robustas
- 📚 Documentação de casos de uso específicos
- 🛡️ Validações de segurança nos testes
- 🌐 Suporte a mais protocolos (WebSocket, gRPC)

---

## 💡 **Dicas Finais de Ouro**

1. **🔥 Sempre comece com smoke test** - Se não passa, pare tudo
2. **📈 Use rampas graduais** - Evite "thundering herd"  
3. **🎯 Foque nos p95/p99** - Média pode mentir
4. **🔍 Analise por grupos** - Isole o gargalo
5. **⏰ Execute no ambiente similar à produção** - Staging = Prod
6. **📊 Compare resultados ao longo do tempo** - Trending é chave
7. **🚫 NUNCA teste breaking-point em produção** - Óbvio, mas importante
8. **📝 Documente os resultados** - Para comparações futuras
9. **🎮 Think time realista** - Usuários não são robôs
10. **🔧 Correlacione com métricas de infraestrutura** - CPU, Memory, DB

**🎯 Lembre-se**: Performance testing é uma arte que combina ciência, experiência e bom senso. Use este projeto como base e adapte para seu contexto específico!

---

## 📬 **Contato**

Se você chegou até aqui, 😄 Sinta-se à vontade para entrar em contato:

- **📧 Email**: neftalieng@gmail.com
- **💼 LinkedIn**: [Conecte-se comigo](https://www.linkedin.com/in/nof-5442209a/)

Adoraria saber como você está usando este projeto ou se tem alguma dúvida sobre testes de performance. Vamos trocar uma ideia! 🚀

---

**⭐ Se este projeto foi útil, deixe uma estrela no GitHub!**
