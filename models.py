from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Project(db.Model):
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    contract_protocol = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    monthly_value = db.Column(db.Float, nullable=False)
    contact = db.Column(db.String(100), nullable=False)
    scheduled_date = db.Column(db.DateTime, nullable=False)
    client_type = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='Pendente')
    delivery_date = db.Column(db.DateTime, nullable=True)
    technology = db.Column(db.String(100), nullable=True)
    service = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relacionamento com observações
    observations = db.relationship('Observation', backref='project', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'contract_protocol': self.contract_protocol,
            'name': self.name,
            'monthly_value': self.monthly_value,
            'contact': self.contact,
            'scheduled_date': self.scheduled_date.isoformat(),
            'client_type': self.client_type,
            'status': self.status,
            'delivery_date': self.delivery_date.isoformat() if self.delivery_date else None,
            'technology': self.technology,
            'service': self.service
        }

class Observation(db.Model):
    __tablename__ = 'observations'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'text': self.text,
            'created_at': self.created_at.isoformat()
        }

class Technology(db.Model):
    __tablename__ = 'technologies'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }

class Service(db.Model):
    __tablename__ = 'services'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }
