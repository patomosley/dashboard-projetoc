let deliveryChart, clientChart, revenueChart;
let currentProjectId = null;
let obsModalInstance = null;
let alertsShown = {}; // Rastrear alertas já mostrados

document.addEventListener('DOMContentLoaded', () => {
    // Criar container de toasts
    if (!document.getElementById('toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    loadProjects();
    loadStats();
    loadAlerts();
    loadTechnologies();
    loadServices();
    initCharts();
    
    // Atualizar alertas a cada 10 segundos (mais rápido)
    setInterval(loadAlerts, 10000);

    // Evento para criar novo projeto
    document.getElementById('projectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('newProjectModal')).hide();
            e.target.reset();
            loadProjects();
            loadStats();
            loadAlerts();
            showToast('Projeto criado com sucesso!', 'success', 'Sucesso');
        } else {
            showToast('Erro ao criar projeto!', 'danger', 'Erro');
        }
    });

    // Evento para editar projeto
    document.getElementById('editProjectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const projectId = document.getElementById('editProjectId').value;
        
        const data = {
            contract_protocol: document.getElementById('edit_contract_protocol').value,
            name: document.getElementById('edit_name').value,
            monthly_value: document.getElementById('edit_monthly_value').value,
            contact: document.getElementById('edit_contact').value,
            scheduled_date: document.getElementById('edit_scheduled_date').value,
            client_type: document.getElementById('edit_client_type').value,
            status: document.getElementById('edit_status').value
        };
        
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('editProjectModal')).hide();
            loadProjects();
            loadStats();
            loadAlerts();
            showToast('Projeto atualizado com sucesso!', 'success', 'Sucesso');
        } else {
            showToast('Erro ao atualizar projeto!', 'danger', 'Erro');
        }
    });

    // Evento para filtros
    document.getElementById('searchInput').addEventListener('keyup', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('clientTypeFilter').addEventListener('change', applyFilters);
});

async function loadProjects() {
    const response = await fetch('/api/projects');
    const projects = await response.json();
    const list = document.getElementById('project-list');
    list.innerHTML = '';

    projects.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.contract_protocol}</td>
            <td>${p.name}</td>
            <td>R$ ${p.monthly_value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td>${p.client_type}</td>
            <td>${new Date(p.scheduled_date).toLocaleDateString('pt-BR')}</td>
            <td><span class="badge bg-${getStatusColor(p.status)}">${p.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="openEditModal(${p.id})" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="openObs(${p.id})" title="Observações">
                    <i class="bi bi-chat-text"></i>
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="updateStatus(${p.id}, 'Concluído')" title="Marcar como concluído">
                    <i class="bi bi-check-lg"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="sendWhatsApp(${p.id})" title="Enviar WhatsApp">
                    <i class="bi bi-whatsapp"></i>
                </button>
            </td>
        `;
        list.appendChild(row);
    });
}

function getStatusColor(status) {
    switch(status) {
        case 'Concluído': return 'success';
        case 'Em Andamento': return 'primary';
        case 'Atrasado': return 'danger';
        case 'Cancelado': return 'secondary';
        default: return 'warning';
    }
}

async function loadStats() {
    const response = await fetch('/api/stats');
    const stats = await response.json();
    updateDashboard(stats);
}

function updateDashboard(stats) {
    document.getElementById('stat-total-projects').innerText = stats.total_projects;
    document.getElementById('stat-total-revenue').innerText = `R$ ${stats.total_revenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('stat-pending').innerText = stats.status_counts['Pendente'] + stats.status_counts['Em Andamento'];
    
    const sla = stats.total_projects > 0 ? (stats.status_counts['Concluído'] / stats.total_projects * 100).toFixed(1) : 0;
    document.getElementById('stat-sla').innerText = `${sla}%`;

    updateCharts(stats);
}

async function loadAlerts() {
    const response = await fetch('/api/alerts');
    const alerts = await response.json();
    
    // Mostrar cada alerta como toast
    alerts.forEach(alert => {
        const alertKey = `${alert.id}-${alert.type}`;
        
        // Só mostrar se não foi mostrado recentemente
        if (!alertsShown[alertKey]) {
            let icon = '';
            let toastType = 'info';
            
            switch(alert.type) {
                case 'atrasado':
                case 'vencido':
                    icon = '🚨';
                    toastType = 'danger';
                    break;
                case 'proximo_vencimento':
                    icon = '⏰';
                    toastType = 'warning';
                    break;
                case 'em_andamento_longo':
                    icon = 'ℹ️';
                    toastType = 'info';
                    break;
            }
            
            showToast(alert.message, toastType, icon, 8000);
            alertsShown[alertKey] = true;
            
            // Limpar do rastreamento após 5 minutos
            setTimeout(() => {
                delete alertsShown[alertKey];
            }, 300000);
        }
    });
}

function initCharts() {
    const ctxDelivery = document.getElementById('deliveryChart').getContext('2d');
    deliveryChart = new Chart(ctxDelivery, {
        type: 'bar',
        data: {
            labels: ['Pendente', 'Em Andamento', 'Concluído', 'Atrasado', 'Cancelado'],
            datasets: [{
                label: 'Projetos',
                data: [0, 0, 0, 0, 0],
                backgroundColor: ['#ffc107', '#0d6efd', '#198754', '#dc3545', '#6c757d']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
    revenueChart = new Chart(ctxRevenue, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Receita (R$)',
                data: [],
                borderColor: '#198754',
                tension: 0.1,
                fill: true,
                backgroundColor: 'rgba(25, 135, 84, 0.1)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const ctxClient = document.getElementById('clientChart').getContext('2d');
    clientChart = new Chart(ctxClient, {
        type: 'doughnut',
        data: {
            labels: ['B2G', 'ISP', 'B2B'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#6f42c1', '#fd7e14', '#20c997']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function updateCharts(stats) {
    deliveryChart.data.datasets[0].data = [
        stats.status_counts['Pendente'],
        stats.status_counts['Em Andamento'],
        stats.status_counts['Concluído'],
        stats.status_counts['Atrasado'],
        stats.status_counts['Cancelado']
    ];
    deliveryChart.update();

    const months = Object.keys(stats.monthly_history).sort();
    revenueChart.data.labels = months;
    revenueChart.data.datasets[0].data = months.map(m => stats.monthly_history[m].revenue);
    revenueChart.update();

    clientChart.data.datasets[0].data = [
        stats.client_types['B2G'],
        stats.client_types['ISP'],
        stats.client_types['B2B']
    ];
    clientChart.update();
}

// ===== FUNÇÕES DE EDIÇÃO E EXCLUSÃO =====

async function openEditModal(id) {
    const response = await fetch(`/api/projects/${id}`);
    const project = await response.json();
    
    document.getElementById('editProjectId').value = project.id;
    document.getElementById('edit_contract_protocol').value = project.contract_protocol;
    document.getElementById('edit_name').value = project.name;
    document.getElementById('edit_monthly_value').value = project.monthly_value;
    document.getElementById('edit_contact').value = project.contact;
    document.getElementById('edit_scheduled_date').value = project.scheduled_date;
    document.getElementById('edit_client_type').value = project.client_type;
    document.getElementById('edit_status').value = project.status;
    document.getElementById('edit_technology').value = project.technology || '';
    document.getElementById('edit_service').value = project.service || '';
    
    new bootstrap.Modal(document.getElementById('editProjectModal')).show();
}

async function deleteProject() {
    const projectId = document.getElementById('editProjectId').value;
    
    if (confirm('Tem certeza que deseja deletar este projeto? Esta ação não pode ser desfeita.')) {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('editProjectModal')).hide();
            loadProjects();
            loadStats();
            loadAlerts();
            showToast('Projeto deletado com sucesso!', 'success', '✓');
        } else {
            showToast('Erro ao deletar projeto!', 'danger', '✗');
        }
    }
}

// ===== FUNÇÕES DE FILTRO =====

async function applyFilters() {
    const search = document.getElementById('searchInput').value;
    const status = document.getElementById('statusFilter').value;
    const clientType = document.getElementById('clientTypeFilter').value;
    
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (clientType) params.append('client_type', clientType);
    
    const response = await fetch(`/api/projects?${params.toString()}`);
    const projects = await response.json();
    const list = document.getElementById('project-list');
    list.innerHTML = '';

    if (projects.length === 0) {
        list.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Nenhum projeto encontrado</td></tr>';
    } else {
        projects.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.contract_protocol}</td>
            <td>${p.name}</td>
            <td>R$ ${p.monthly_value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td>${p.client_type}</td>
            <td>${new Date(p.scheduled_date).toLocaleDateString('pt-BR')}</td>
            <td><span class="badge bg-${getStatusColor(p.status)}">${p.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="openEditModal(${p.id})" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="openObs(${p.id})" title="Observações">
                    <i class="bi bi-chat-text"></i>
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="updateStatus(${p.id}, 'Concluído')" title="Marcar como concluído">
                    <i class="bi bi-check-lg"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="sendWhatsApp(${p.id})" title="Enviar WhatsApp">
                    <i class="bi bi-whatsapp"></i>
                </button>
            </td>
        `;
        list.appendChild(row);
        });
    }
    
    // Atualizar dashboard com dados filtrados
    const statsResponse = await fetch(`/api/stats?${params.toString()}`);
    const stats = await statsResponse.json();
    updateDashboard(stats);
}

// ===== FUNÇÕES DE OBSERVAÇÕES (CORRIGIDAS) =====

async function openObs(id) {
    currentProjectId = id;
    const response = await fetch(`/api/projects/${id}/observations`);
    const obs = await response.json();
    
    const list = document.getElementById('obs-list');
    list.innerHTML = obs.map(o => `
        <div class="obs-item">
            <span class="obs-date">${o.timestamp}</span>
            ${o.content}
        </div>
    `).join('') || '<p class="text-muted">Nenhuma observação registrada.</p>';
    
    // Fechar modal anterior se existir
    if (obsModalInstance) {
        obsModalInstance.hide();
    }
    
    // Criar nova instância do modal
    obsModalInstance = new bootstrap.Modal(document.getElementById('obsModal'));
    obsModalInstance.show();
}

document.getElementById('btn-save-obs').addEventListener('click', async () => {
    const content = document.getElementById('new-obs-content').value;
    if (!content || !currentProjectId) return;

    const response = await fetch(`/api/projects/${currentProjectId}/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });

    if (response.ok) {
        document.getElementById('new-obs-content').value = '';
        // Recarregar observações sem fechar o modal
        const obsResponse = await fetch(`/api/projects/${currentProjectId}/observations`);
        const obsData = await obsResponse.json();
        
        const list = document.getElementById('obs-list');
        list.innerHTML = obsData.map(o => `
            <div class="obs-item">
                <span class="obs-date">${o.timestamp}</span>
                ${o.content}
            </div>
        `).join('') || '<p class="text-muted">Nenhuma observação registrada.</p>';
        
        showToast('Observação adicionada!', 'success', '✓');
    }
});

async function updateStatus(id, status) {
    const response = await fetch(`/api/projects/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });

    if (response.ok) {
        loadProjects();
        loadStats();
        loadAlerts();
        showToast('Status atualizado!', 'success', '✓');
    }
}

// ===== FUNÇÕES DE WHATSAPP =====

async function sendWhatsApp(projectId) {
    const response = await fetch(`/api/projects/${projectId}`);
    const project = await response.json();
    
    // Extrair apenas números do contato (remover caracteres especiais)
    const phoneNumber = project.contact.replace(/\D/g, '');
    
    if (!phoneNumber) {
        showToast('Contato do cliente não contém um número de telefone válido!', 'danger', '⚠️');
        return;
    }
    
    // Mensagem padrão de conclusão
    const message = `Olá! 👋\n\nInformamos que o serviço do projeto "${project.name}" (Protocolo: ${project.contract_protocol}) foi *concluído com sucesso*! ✅\n\nEstamos à disposição para qualquer dúvida ou ajuste necessário.\n\nAtenciosamente!`;
    
    // Codificar a mensagem para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Abrir WhatsApp Web com a mensagem
    // Se o número não tiver código de país, adicionar +55 (Brasil)
    let fullNumber = phoneNumber;
    if (!phoneNumber.startsWith('55')) {
        fullNumber = '55' + phoneNumber;
    }
    
    const whatsappUrl = `https://wa.me/${fullNumber}?text=${encodedMessage}`;
    
    // Abrir em nova aba
    window.open(whatsappUrl, '_blank');
    
    showToast('WhatsApp aberto! Verifique a mensagem pré-preenchida.', 'info', 'ℹ️');
}

// ===== FUNÇÕES DE IMPORTAÇÃO/EXPORTAÇÃO =====

async function exportToExcel() {
    try {
        const response = await fetch('/api/export/excel');
        const blob = await response.blob();
        
        // Criar link de download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `projetos_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('Arquivo exportado com sucesso!', 'success', '✓');
    } catch (error) {
        showToast('Erro ao exportar arquivo!', 'danger', '✗');
        console.error(error);
    }
}

async function importFromExcel() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Por favor, selecione um arquivo!', 'warning', '⚠️');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/import/excel', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            let message = `${result.imported_count} projetos importados com sucesso!`;
            if (result.errors.length > 0) {
                message += `\n\nErros encontrados:\n${result.errors.join('\n')}`;
            }
            
            showToast(message, 'success', '✓');
            fileInput.value = '';
            bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
            loadProjects();
            loadStats();
            loadAlerts();
        } else {
            showToast(`Erro: ${result.error}`, 'danger', '✗');
        }
    } catch (error) {
        showToast('Erro ao importar arquivo!', 'danger', '✗');
        console.error(error);
    }
}

// ===== FUNÇÃO DE TOAST NOTIFICATIONS =====

function showToast(message, type = 'info', title = '', duration = 5000) {
    const container = document.getElementById('toast-container');
    
    // Mapear ícones por tipo
    const icons = {
        'success': '✓',
        'danger': '✗',
        'warning': '⚠️',
        'info': 'ℹ️'
    };
    
    const icon = title || icons[type] || 'ℹ️';
    
    // Criar elemento toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <div class="toast-content">
            <p class="toast-title">${type === 'success' ? 'Sucesso' : type === 'danger' ? 'Erro' : type === 'warning' ? 'Aviso' : 'Informação'}</p>
            <p class="toast-message">${message}</p>
        </div>
        <button class="toast-close" onclick="this.parentElement.classList.add('hide'); setTimeout(() => this.parentElement.remove(), 300)">×</button>
    `;
    
    container.appendChild(toast);
    
    // Remover automaticamente após o tempo especificado
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// Manter função showAlert para compatibilidade
function showAlert(message, type) {
    showToast(message, type);
}


// ===== FUNÇÕES DE TECNOLOGIAS E SERVIÇOS =====

async function loadTechnologies() {
    try {
        const response = await fetch('/api/technologies');
        const technologies = await response.json();
        
        // Atualizar select de novo projeto
        const newTechSelect = document.getElementById('new_technology');
        newTechSelect.innerHTML = '<option value="">Selecione uma tecnologia...</option>';
        technologies.forEach(tech => {
            const option = document.createElement('option');
            option.value = tech.name;
            option.textContent = tech.name;
            newTechSelect.appendChild(option);
        });
        
        // Atualizar select de edição
        const editTechSelect = document.getElementById('edit_technology');
        editTechSelect.innerHTML = '<option value="">Selecione uma tecnologia...</option>';
        technologies.forEach(tech => {
            const option = document.createElement('option');
            option.value = tech.name;
            option.textContent = tech.name;
            editTechSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar tecnologias:', error);
    }
}

async function loadServices() {
    try {
        const response = await fetch('/api/services');
        const services = await response.json();
        
        // Atualizar select de novo projeto
        const newServiceSelect = document.getElementById('new_service');
        newServiceSelect.innerHTML = '<option value="">Selecione um serviço...</option>';
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.name;
            option.textContent = service.name;
            newServiceSelect.appendChild(option);
        });
        
        // Atualizar select de edição
        const editServiceSelect = document.getElementById('edit_service');
        editServiceSelect.innerHTML = '<option value="">Selecione um serviço...</option>';
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.name;
            option.textContent = service.name;
            editServiceSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
    }
}

function openAddTechnologyModal() {
    new bootstrap.Modal(document.getElementById('addTechnologyModal')).show();
}

function openAddServiceModal() {
    new bootstrap.Modal(document.getElementById('addServiceModal')).show();
}

// Evento para adicionar nova tecnologia
document.addEventListener('DOMContentLoaded', () => {
    const addTechForm = document.getElementById('addTechnologyForm');
    if (addTechForm) {
        addTechForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('technologyName').value.trim();
            
            if (!name) {
                showToast('Nome da tecnologia é obrigatório', 'warning', '⚠️');
                return;
            }
            
            try {
                const response = await fetch('/api/technologies', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                
                if (response.ok) {
                    bootstrap.Modal.getInstance(document.getElementById('addTechnologyModal')).hide();
                    document.getElementById('technologyName').value = '';
                    loadTechnologies();
                    showToast('Tecnologia adicionada com sucesso!', 'success', '✓');
                } else {
                    const error = await response.json();
                    showToast(error.error || 'Erro ao adicionar tecnologia', 'danger', '✗');
                }
            } catch (error) {
                showToast('Erro ao adicionar tecnologia!', 'danger', '✗');
                console.error(error);
            }
        });
    }
});

// Evento para adicionar novo serviço
document.addEventListener('DOMContentLoaded', () => {
    const addServiceForm = document.getElementById('addServiceForm');
    if (addServiceForm) {
        addServiceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('serviceName').value.trim();
            
            if (!name) {
                showToast('Nome do serviço é obrigatório', 'warning', '⚠️');
                return;
            }
            
            try {
                const response = await fetch('/api/services', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                
                if (response.ok) {
                    bootstrap.Modal.getInstance(document.getElementById('addServiceModal')).hide();
                    document.getElementById('serviceName').value = '';
                    loadServices();
                    showToast('Serviço adicionado com sucesso!', 'success', '✓');
                } else {
                    const error = await response.json();
                    showToast(error.error || 'Erro ao adicionar serviço', 'danger', '✗');
                }
            } catch (error) {
                showToast('Erro ao adicionar serviço!', 'danger', '✗');
                console.error(error);
            }
        });
    }
});
