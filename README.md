# ProjectTracker - Sistema de Acompanhamento de Projetos

Este é um sistema simples e moderno para acompanhamento de projetos, desenvolvido em Python (Flask), HTML, CSS (Bootstrap) e JavaScript (Chart.js), ideal para ser executado em um Raspberry Pi.

## Funcionalidades

*   **Dashboard de Produtividade:** Visão geral com total de projetos, receita mensal total, demandas pendentes e Taxa de Entrega (SLA).
*   **Gráficos:**
    *   Status das Entregas (Pendente, Em Andamento, Concluído, Atrasado).
    *   Receita por Mês (Histórico de faturamento).
    *   Tipos de Clientes (B2G, ISP, B2B).
*   **Cadastro de Projetos:** Formulário completo com: `CONTRATO/PROTOCOLO`, `NOME`, `VALOR MENSAL`, `CONTATO`, `DATA DE AGENDAMENTO`, `TIPO DE CLIENTE`.
*   **Acompanhamento de Prazos (SLA):** O status `Concluído` registra a data de entrega.
*   **Observações/Histórico:** Campo para adicionar observações com registro de data e hora, servindo como documentação.
*   **Banco de Dados:** Utiliza SQLite (arquivo `projects.db`), que é um banco de dados SQL leve e ideal para o Raspberry Pi.

## Estrutura do Projeto

```
project_tracker/
├── app.py              # Aplicação Flask (Backend)
├── models.py           # Definição do modelo de dados (SQLAlchemy)
├── projects.db         # Banco de dados SQLite (será criado automaticamente)
├── README.md           # Este arquivo
├── static/
│   ├── css/
│   │   └── style.css   # Estilos CSS
│   └── js/
│       └── main.js     # Lógica JavaScript e gráficos (Chart.js)
└── templates/
    └── index.html      # Template HTML principal
```

## Instruções de Deploy no Raspberry Pi

### 1. Pré-requisitos

Certifique-se de que seu Raspberry Pi tenha o Python 3 e o `pip` instalados.

### 2. Instalação das Dependências

Navegue até o diretório do projeto e instale as bibliotecas Python necessárias:

```bash
cd /caminho/para/project_tracker
sudo pip3 install Flask Flask-SQLAlchemy
```

### 3. Execução da Aplicação

Você pode iniciar o servidor Flask da seguinte forma:

```bash
python3 app.py
```

**Observação:** O Flask por padrão roda na porta `5000`. Para que o sistema seja acessível na sua rede local, o Flask está configurado para escutar em todas as interfaces (`host='0.0.0.0'`).

### 4. Acesso ao Sistema

Após iniciar o servidor, acesse o sistema em qualquer navegador na sua rede local usando o endereço IP do seu Raspberry Pi e a porta 5000.

Exemplo: `http://[IP_DO_RASPBERRY_PI]:5000`

## Considerações Finais

O banco de dados SQLite (`projects.db`) é criado automaticamente na primeira execução. Para fins de backup, basta copiar este arquivo. Para um ambiente de produção mais robusto, você pode configurar o Flask-SQLAlchemy para usar um banco de dados mais completo como PostgreSQL ou MySQL, mas o SQLite é perfeitamente adequado para um servidor local em Raspberry Pi.
