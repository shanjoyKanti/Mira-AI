# Mira AI - Fidelity Development & Integration

## Overview

Mira AI is a **generic, language-agnostic code modernization platform** supporting any programming language or framework (PHP, Python, JavaScript, Java, C#, Go, Ruby, etc.) via a RAG-based documentation system integrated with FastAPI backend, MongoDB data store, and asynchronous job processing.

This repository contains the Fidelity team's development and integration work across the backend API and frontend dashboard applications.

---

## Project Structure

### Backend (`/Mira-AI`)
- **FastAPI** REST API with async/await architecture
- **MongoDB** + **Beanie 2.x** ODM for data persistence
- **Redis** + **Celery** for distributed task queue
- **LangGraph** agent orchestration framework
- **Qdrant** vector database for RAG retrieval
- **Paramiko** SSH/SFTP for remote code execution
- **SonarQube** integration for static code analysis

**Key Modules:**
- `/app/api/` - REST endpoints (accounts, analysis, agents, sonarqube, ssh)
- `/app/services/` - Business logic (agents, LLM, SSH, SonarQube, RAG)
- `/app/db/` - MongoDB models and initialization
- `/rag/` - RAG system (Qdrant, scrapers, migration tool)

### Frontend (`/frontend`)
- **React** dashboard application
- **TypeScript** for type safety
- Real-time job status tracking
- Code transformation visualization
- SonarQube findings dashboard
- Responsive UI with modern design

---

## Development Timeline

**Duration:** February 17 - July 11, 2026  
**Team Size:** 4 Fidelity engineers  
**Total Dev/Integration Tasks:** 555

### Fidelity Team Members

| Engineer | Tasks | Role |
|----------|-------|------|
| Mohiuzzaman Anik | 157 | Full-stack development |
| Moshiur Rahman | 149 | Backend & infrastructure |
| Shanjoy Kanti | 128 | Architecture & planning |
| Arafat Uddin | 121 | API design & integration |

---

## Key Features Delivered

### Phase 1: Foundation (Feb 17 - Mar 6, 2026)
- Requirements & architecture planning
- Ingestion pipeline (ZIP upload, Git import)
- Repository validation & language detection
- Secure credential storage (AES-256-GCM)
- Project registration & CRUD endpoints

### Phase 2: Analysis (Mar 1 - Mar 25, 2026)
- API contract extraction & endpoint discovery
- Breaking change detection
- Dependency graph generation
- Package version automation
- Migration planning engine

### Phase 3: Findings Pipeline (Mar 13 - Apr 10, 2026)
- Findings standardization & unified schema
- Deduplication with fingerprinting
- Confidence scoring (Bayesian model)
- Normalization pipeline (parse → map → dedupe → score)
- Enrichment & export (JSON, NDJSON)

### Phase 4: Production Hardening (Apr 11 - Jul 11, 2026)
- Structured findings with evidence linking
- Prioritization & validation-corroboration
- TLS deployment & reverse-proxy setup
- Performance optimization & tuning
- Integration testing & staging validation

---

## Technical Stack

### Backend
- **Runtime:** Python 3.10+, Uvicorn, ASGI
- **Framework:** FastAPI
- **Database:** MongoDB (Atlas), Beanie ODM
- **Cache/Queue:** Redis 7.0+, Celery 5.3+
- **AI/ML:** LangGraph, LangChain, Groq API (Qwen3-32B)
- **Search:** Qdrant vector DB
- **Monitoring:** Prometheus, Grafana, structured logging
- **Testing:** pytest, hypothesis (property-based)

### Frontend
- **Framework:** React 18+
- **Language:** TypeScript
- **Build:** Webpack/Vite
- **Testing:** Jest, Playwright E2E
- **Styling:** CSS Modules, responsive design

### Infrastructure
- **Containerization:** Docker, Docker Compose
- **Reverse Proxy:** Nginx (TLS 1.2/1.3, OCSP stapling)
- **SSL/TLS:** Let's Encrypt (Certbot automation)
- **Secrets:** Envelope encryption with KMS
- **IaC:** Terraform/Docker Compose

---

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Git
- Python 3.10+ (for local dev)
- Node.js 18+ (for frontend)

### Development Setup

```bash
# Clone repository
git clone https://github.com/shanjoyKanti/Mira-AI.git
cd Mira-AI

# Backend setup
cp .env.example .env
docker-compose up -d
make migrate
make seed

# Frontend setup
cd frontend
npm install
npm start
```

### Running Services

```bash
# Start all services
make up

# View logs
make logs

# Run tests
make test

# Access services
# API: http://localhost:8000
# Dashboard: http://localhost:3000
# Flower (Celery): http://localhost:5555
```

---

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout

### Projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects` - List projects
- `GET /api/v1/projects/{id}` - Get project details
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

### Jobs
- `POST /api/v1/jobs` - Submit migration job
- `GET /api/v1/jobs/{id}/status` - Poll job status
- `GET /api/v1/jobs/{id}/findings` - Retrieve findings
- `POST /api/v1/jobs/{id}/cancel` - Cancel job

### Analysis
- `GET /api/v1/analysis/capabilities` - Supported languages/frameworks
- `GET /api/v1/sonarqube/report/{id}` - SonarQube report

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `MONGO_DB_URL` | MongoDB connection string | (required) |
| `MONGODB_DATABASE` | Database name | `mira_ai` |
| `REDIS_URL` | Redis broker URL | `redis://redis:6379/0` |
| `SECRET_KEY` | JWT signing key | (required, min 32 chars) |
| `LLM_PROVIDER` | LLM provider | `groq` |
| `LLM_MODEL` | Model name | `qwen/qwen3-32b` |
| `GROQ_API_KEY` | Groq API key | (required) |
| `SONAR_HOST_URL` | SonarQube server URL | (required) |
| `SONAR_TOKEN` | SonarQube auth token | (required) |

---

## Deployment

### Docker Compose (Development/Staging)
```bash
docker-compose -f docker-compose.yml up -d
```

### Production
1. Configure environment variables in `.env`
2. Run migrations: `make migrate`
3. Start services: `docker-compose -f docker-compose.prod.yml up -d`
4. Verify health: `curl http://localhost:8000/health`

---

## Testing

```bash
# Unit & integration tests
make test

# Coverage report
make test-cov

# E2E tests (frontend)
cd frontend && npm run test:e2e

# Specific test file
docker-compose exec api pytest app/tests/test_file.py -v
```

---

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| First-pass success | ≥94% | On track |
| Hard failure rate | <0.5% | On track |
| Issue reduction | ≥40% per upgrade | On track |
| Cache-warm latency | ~3 s/file | On track |
| Throughput | ~1,200 files/hour | On track |
| Job timeout | 6 hours max | Configured |

---

## Security

- ✅ JWT RS256 with refresh-token rotation
- ✅ AES-256-GCM for credential encryption
- ✅ TLS 1.2/1.3 with modern cipher suite
- ✅ HTTPS/SSH authentication for Git
- ✅ Role-based access control (RBAC)
- ✅ STRIDE threat modeling applied
- ✅ Dependency CVE scanning
- ✅ Input validation & sanitization

---

## Monitoring & Observability

- **Metrics:** Prometheus (job duration, success rate, error rates)
- **Logging:** Structured JSON logs with correlation IDs
- **Tracing:** LangGraph execution traces
- **Dashboards:** Grafana (latency, throughput, error tracking)
- **Alerts:** Thresholds for quota exhaustion, SonarQube outages

---

## Contributing

1. Create feature branch: `git checkout -b feature/description`
2. Commit with clear messages: `git commit -m "feat(module): description"`
3. Push to branch: `git push origin feature/description`
4. Open pull request with test coverage
5. Pass CI checks and code review

### Code Standards
- Python: PEP 8, type hints, 90%+ test coverage
- TypeScript: ESLint, Prettier, strict mode
- Git: Conventional commits, signed commits

---

## License

Copyright © 2026 Fidelity. All rights reserved.

---

## Support & Contact

- **GitHub Issues:** Report bugs and feature requests
- **Documentation:** See `/docs` directory
- **Email:** team@fidelityfze.com

---

**Last Updated:** August 2026  
**Status:** Development & Integration Complete

---
**Last Updated:** July 13, 2026 - Final Deployment Complete
