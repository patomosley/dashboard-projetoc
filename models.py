from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    contract_protocol = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    monthly_value = db.Column(db.Float, nullable=False)
    contact = db.Column(db.String(200), nullable=False)
    scheduled_date = db.Column(db.DateTime, nullable=False)
    client_type = db.Column(db.String(50), nullable=False) # B2G, ISP, B2B
    status = db.Column(db.String(50), default='Pendente') # Pendente, Em Andamento, Concluído, Atrasado
    delivery_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    observations = db.relationship('Observation', backref='project', lazy=True, cascade="all, delete-orphan")

class Observation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
