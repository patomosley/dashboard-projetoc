let deliveryChart, clientChart, revenueChart;

document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    loadStats();
    initCharts();

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
            showAlert('Projeto criado com sucesso!', 'success');
        } else {
            showAlert('Erro ao criar projeto!', 'danger');
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
            showAlert('Projeto atualizado com sucesso!', 'success');
        } else {
            showAlert('Erro ao atualizar projeto!', 'danger');
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
        default: return 'warning';
    }
}

async function loadStats() {
    const response = await fetch('/api/stats');
    const stats = await response.json();

    document.getElementById('stat-total-projects').innerText = stats.total_projects;
    document.getElementById('stat-total-revenue').innerText = `R$ ${stats.total_revenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('stat-pending').innerText = stats.status_counts['Pendente'] + stats.status_counts['Em Andamento'];
    
    const sla = stats.total_projects > 0 ? (stats.status_counts['Concluído'] / stats.total_projects * 100).toFixed(1) : 0;
    document.getElementById('stat-sla').innerText = `${sla}%`;

    updateCharts(stats);
}

function initCharts() {
    const ctxDelivery = document.getElementById('deliveryChart').getContext('2d');
    deliveryChart = new Chart(ctxDelivery, {
        type: 'bar',
        data: {
            labels: ['Pendente', 'Em Andamento', 'Concluído', 'Atrasado'],
            datasets: [{
                label: 'Projetos',
                data: [0, 0, 0, 0],
                backgroundColor: ['#ffc107', '#0d6efd', '#198754', '#dc3545']
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
        stats.status_counts['Atrasado']
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
            showAlert('Projeto deletado com sucesso!', 'success');
        } else {
            showAlert('Erro ao deletar projeto!', 'danger');
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
        list.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhum projeto encontrado</td></tr>';
        return;
    }

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
            </td>
        `;
        list.appendChild(row);
    });
}

// ===== FUNÇÕES DE OBSERVAÇÕES =====

let currentProjectId = null;
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
    
    new bootstrap.Modal(document.getElementById('obsModal')).show();
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
        openObs(currentProjectId);
        showAlert('Observação adicionada!', 'success');
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
        showAlert('Status atualizado!', 'success');
    }
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
        
        showAlert('Arquivo exportado com sucesso!', 'success');
    } catch (error) {
        showAlert('Erro ao exportar arquivo!', 'danger');
        console.error(error);
    }
}

async function importFromExcel() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showAlert('Por favor, selecione um arquivo!', 'warning');
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
            
            showAlert(message, 'success');
            fileInput.value = '';
            bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
            loadProjects();
            loadStats();
        } else {
            showAlert(`Erro: ${result.error}`, 'danger');
        }
    } catch (error) {
        showAlert('Erro ao importar arquivo!', 'danger');
        console.error(error);
    }
}

// ===== FUNÇÃO AUXILIAR =====

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Inserir no topo do container
    const container = document.querySelector('.container-fluid');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Remover após 5 segundos
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}
