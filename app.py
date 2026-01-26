from flask import Flask, render_template, request, jsonify, redirect, url_for
from models import db, Project, Observation
from datetime import datetime
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///projects.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/projects', methods=['GET'])
def get_projects():
    projects = Project.query.all()
    return jsonify([{
        'id': p.id,
        'contract_protocol': p.contract_protocol,
        'name': p.name,
        'monthly_value': p.monthly_value,
        'contact': p.contact,
        'scheduled_date': p.scheduled_date.strftime('%Y-%m-%d'),
        'client_type': p.client_type,
        'status': p.status,
        'delivery_date': p.delivery_date.strftime('%Y-%m-%d') if p.delivery_date else None
    } for p in projects])

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.json
    new_project = Project(
        contract_protocol=data['contract_protocol'],
        name=data['name'],
        monthly_value=float(data['monthly_value']),
        contact=data['contact'],
        scheduled_date=datetime.strptime(data['scheduled_date'], '%Y-%m-%d'),
        client_type=data['client_type'],
        status='Pendente'
    )
    db.session.add(new_project)
    db.session.commit()
    return jsonify({'message': 'Projeto criado com sucesso!', 'id': new_project.id}), 201

@app.route('/api/projects/<int:id>/status', methods=['PATCH'])
def update_status(id):
    data = request.json
    project = Project.query.get_or_404(id)
    project.status = data['status']
    if data['status'] == 'Concluído':
        project.delivery_date = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Status atualizado!'})

@app.route('/api/projects/<int:id>/observations', methods=['GET', 'POST'])
def handle_observations(id):
    if request.method == 'POST':
        data = request.json
        obs = Observation(content=data['content'], project_id=id)
        db.session.add(obs)
        db.session.commit()
        return jsonify({'message': 'Observação adicionada!'})
    
    observations = Observation.query.filter_by(project_id=id).order_by(Observation.timestamp.desc()).all()
    return jsonify([{
        'content': o.content,
        'timestamp': o.timestamp.strftime('%d/%m/%Y %H:%M:%S')
    } for o in observations])

@app.route('/api/stats')
def get_stats():
    projects = Project.query.all()
    total_revenue = sum(p.monthly_value for p in projects)
    
    # Estatísticas por mês (para gráfico de receita/entregas)
    monthly_stats = {}
    for p in projects:
        month = p.scheduled_date.strftime('%Y-%m')
        if month not in monthly_stats:
            monthly_stats[month] = {'revenue': 0, 'deliveries': 0}
        monthly_stats[month]['revenue'] += p.monthly_value
        if p.status == 'Concluído':
            monthly_stats[month]['deliveries'] += 1

    stats = {
        'total_projects': len(projects),
        'total_revenue': total_revenue,
        'status_counts': {
            'Pendente': Project.query.filter_by(status='Pendente').count(),
            'Em Andamento': Project.query.filter_by(status='Em Andamento').count(),
            'Concluído': Project.query.filter_by(status='Concluído').count(),
            'Atrasado': Project.query.filter_by(status='Atrasado').count()
        },
        'client_types': {
            'B2G': Project.query.filter_by(client_type='B2G').count(),
            'ISP': Project.query.filter_by(client_type='ISP').count(),
            'B2B': Project.query.filter_by(client_type='B2B').count()
        },
        'monthly_history': monthly_stats
    }
    return jsonify(stats)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
