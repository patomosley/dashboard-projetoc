let deliveryChart, clientChart, revenueChart;

document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    loadStats();
    initCharts();

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
        }
    });
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
                <button class="btn btn-sm btn-outline-secondary" onclick="openObs(${p.id})"><i class="bi bi-chat-text"></i></button>
                <button class="btn btn-sm btn-outline-success" onclick="updateStatus(${p.id}, 'Concluído')"><i class="bi bi-check-lg"></i></button>
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
    }
}
