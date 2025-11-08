# 🔍 AccessAnalyser

> **WCAG 2.1 Compliant Web Accessibility Analysis Engine**

A comprehensive fullstack web accessibility analyzer that helps identify and fix accessibility issues on websites. Built with React, Node.js, PostgreSQL, and Kafka for real-time analysis.

![Accessibility Score](https://img.shields.io/badge/Accessibility-WCAG%202.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

---

## ✨ Features

- 🎯 **WCAG 2.1 Compliance Analysis** - Comprehensive accessibility testing
- 📊 **Interactive Dashboard** - Real-time visualization of accessibility metrics
- 🚨 **Issue Detection** - Identifies Critical, Serious, Moderate, and Minor issues
- 🎨 **Color Contrast Checker** - Validates text readability
- ♿ **ARIA Validation** - Checks proper ARIA attribute usage
- ⌨️ **Keyboard Navigation** - Tests keyboard accessibility
- 🖼️ **Image Analysis** - Validates alt text and image accessibility
- 📱 **Screen Reader Compatibility** - Tests screen reader support
- 📈 **Historical Reports** - Track improvements over time
- 🔐 **User Authentication** - Secure JWT-based auth system

---

## 🖼️ Screenshots

### Landing Page
![Landing Page](./screenshots/landing.png)

### Dashboard Analytics
![Dashboard](./screenshots/dashboards.png)

### Detailed Issue Report
![Issues](./screenshots/issues.png)

---

## 🛠️ Tech Stack

### Frontend
- **React 19.1** - UI Framework
- **Redux Toolkit** - State Management
- **React Router** - Navigation
- **Tailwind CSS 4.1** - Styling
- **Chart.js** - Data Visualization
- **Vite** - Build Tool

### Backend
- **Node.js** - Runtime
- **Express** - Web Framework
- **PostgreSQL** - Database
- **Puppeteer** - Headless Browser
- **Axe-core** - Accessibility Testing Engine
- **JWT** - Authentication
- **KafkaJS** - Message Queue

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **npm** or **yarn**
- **Docker** & **Docker Compose**
- **PostgreSQL** (if not using Docker)
- **Git**

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/access-analyser.git
cd access-analyser
```

### 2. Start Docker Services

Start PostgreSQL and Kafka using Docker Compose:

```bash
# Start PostgreSQL
docker compose -f docker-compose.yml up -d

# Start Kafka (optional for development)
docker compose -f docker-compose-kafka.yml up -d
```

**Verify services are running:**
```bash
docker ps
```

### 3. Setup Backend

```bash
# Navigate to backend directory (if separate)
cd backend  # or stay in root if backend is in root

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Configure `.env` file:**
```bash
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/accessibility
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=accessibility

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Kafka (Optional)
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092

# CORS
FRONTEND_URL=http://localhost:5173
```

**Initialize Database:**
```bash
# Run database setup script
npm run setup-db
```

**Start Backend Server:**
```bash
node server.js
```

Backend will run on `http://localhost:3000`

### 4. Setup Frontend

Open a new terminal:

```bash
# Navigate to frontend
cd frontend/my-project

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

**Configure `.env.local`:**
```bash
VITE_API_URL=http://localhost:3000
```

**Start Frontend:**
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

---

## 📦 Installation (Detailed)

### Backend Setup

```bash
# Install backend dependencies
npm install

# Available Scripts
npm start          # Start production server
npm run dev        # Start with nodemon (auto-reload)
npm run setup-db   # Initialize database schema
npm test           # Run tests
npm run test:single # Run single test
```

### Frontend Setup

```bash
cd frontend/my-project

# Install frontend dependencies
npm install

# Available Scripts
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Lint code
```

---




---

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092
FRONTEND_URL=http://localhost:5173
```

#### Frontend (.env.local)
```bash
VITE_API_URL=http://localhost:3000
```

### Docker Services

**PostgreSQL Configuration:**
- Port: `5432`
- Database: `accessibility`
- User: `postgres`
- Password: `postgres`

**Kafka Configuration:**
- Kafka Port: `9092`
- Zookeeper Port: `2181`

---

# Run with coverage
npm test -- --coverage
```

---

## 🙏 Acknowledgments

- **Axe-core** - Accessibility testing engine
- **Puppeteer** - Headless browser automation
- **WCAG Guidelines** - Web accessibility standards
- **React Community** - Amazing ecosystem
- **Tailwind CSS** - Utility-first CSS framework

---

## 📞 Contact

**Project Maintainer:** Your Name

- Email: your.email@example.com
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your Profile](https://linkedin.com/in/yourprofile)

---

## 🐛 Known Issues

- ⚠️ Large websites may take longer to analyze (30+ seconds)
- ⚠️ Some dynamic content may not be captured
- ⚠️ Kafka is optional for development but recommended for production

---



## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/access-analyser&type=Date)](https://star-history.com/#yourusername/access-analyser&Date)

---

<div align="center">

**Made with ❤️ for a more accessible web**

[Report Bug](https://github.com/yourusername/access-analyser/issues) · [Request Feature](https://github.com/yourusername/access-analyser/issues) · [Documentation](https://github.com/yourusername/access-analyser/wiki)

</div>
