# 🔄 SkillSwap - Peer-to-Peer Skill Exchange Platform

Connect with people who can teach you what you want to learn, and teach them what you know. No money, no courses—just pure knowledge exchange.

## ✨ Features

- **Smart Matching System**: Three-tier matching (Exact, Subcategory, Category)
- **Real-Time Messaging**: WebSocket-based instant messaging
- **Video Calls**: Built-in video calling for learning sessions
- **335+ Skills**: From coding to cooking, art to analytics
- **Mutual Swaps**: Fair exchange - teach and learn together

## 🛠️ Tech Stack

**Backend:**
- Django 5.2+ & Django REST Framework
- Django Channels (WebSockets)
- SQLite (Development) / PostgreSQL (Production)
- JWT Authentication

**Frontend:**
- React 18+
- React Router
- Axios
- Tailwind CSS

## 📦 Installation

### Prerequisites
- Python 3.10+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Clone the repository
\`\`\`bash
git clone https://github.com/YOUR_USERNAME/SkillSwap.git
cd SkillSwap/backend
\`\`\`

2. Create virtual environment
\`\`\`bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
\`\`\`

3. Install dependencies
\`\`\`bash
pip install -r requirements.txt
\`\`\`

4. Run migrations
\`\`\`bash
python manage.py migrate
\`\`\`

5. Create superuser (optional)
\`\`\`bash
python manage.py createsuperuser
\`\`\`

6. Run development server
\`\`\`bash
python manage.py runserver
\`\`\`

### Frontend Setup

1. Navigate to project root
\`\`\`bash
cd ..
\`\`\`

2. Install dependencies
\`\`\`bash
npm install
\`\`\`

3. Start development server
\`\`\`bash
npm start
\`\`\`

The app will open at http://localhost:3000

## 🚀 Deployment

### Backend Deployment Options

**Option 1: Railway (Recommended for beginners)**
- Free tier available
- Automatic deployments from GitHub
- Built-in PostgreSQL

**Option 2: Heroku**
- Easy deployment with Heroku CLI
- Free tier with limitations

**Option 3: DigitalOcean/AWS/GCP**
- More control, requires server management
- Use Gunicorn + Nginx

### Frontend Deployment Options

**Option 1: Vercel (Recommended)**
- Free tier
- Automatic deployments
- CDN included

**Option 2: Netlify**
- Similar to Vercel
- Great for React apps

**Option 3: GitHub Pages**
- Free static hosting
- Requires build configuration

## ⚠️ Important Notes

### Video Call Feature
The video calling feature uses WebRTC with a simple signaling server through Django Channels. For production:

1. **WebSocket Support Required**: Your hosting provider must support WebSockets
2. **Use Redis**: Replace InMemoryChannelLayer with Redis for production
3. **STUN/TURN Servers**: May need external STUN/TURN servers for reliable connections across networks

### Database Considerations
- **SQLite**: Fine for development and small deployments
- **PostgreSQL**: Recommended for production with multiple concurrent users
- **Backup Strategy**: Implement regular database backups

### Known Limitations
- In-memory channel layers won't work across multiple server instances
- Video calling may have NAT traversal issues without TURN servers
- SQLite has limited concurrent write support

## 📝 License

MIT License - Feel free to use this project for learning and building!

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open a GitHub issue.
\`\`\`

---

## 🌐 Production Deployment Options

### Option A: Railway (Easiest - Recommended)

1. **Sign up at railway.app**
2. **Create new project from GitHub**
3. **Add PostgreSQL database**
4. **Configure environment variables**:
   - `SECRET_KEY`
   - `ALLOWED_HOSTS`
   - `DATABASE_URL` (auto-configured)
5. **Deploy automatically on push**

**Pros:**
- Free tier available
- Auto-deploys from GitHub
- Built-in database
- WebSocket support

**Cons:**
- Free tier has limitations
- May need paid plan for 24/7 uptime

### Option B: Render.com (Good Alternative)

Similar to Railway but with different pricing structure.

### Option C: Traditional VPS (Most Control)

**Providers:** DigitalOcean, Linode, AWS Lightsail

**Requirements:**
- Install Python, Node.js, Nginx, PostgreSQL
- Configure Gunicorn for Django
- Set up SSL with Let's Encrypt
- Configure systemd for auto-restart

---

## 🔧 Production Checklist

### Security
- [ ] Change `SECRET_KEY` to a secure random value
- [ ] Set `DEBUG = False`
- [ ] Configure `ALLOWED_HOSTS`
- [ ] Use HTTPS (SSL certificate)
- [ ] Enable CSRF protection
- [ ] Use environment variables for secrets

### Performance
- [ ] Use PostgreSQL instead of SQLite
- [ ] Configure Redis for channels
- [ ] Enable Django's caching
- [ ] Compress static files
- [ ] Use CDN for static assets

### Reliability
- [ ] Set up database backups
- [ ] Configure logging
- [ ] Monitor error rates
- [ ] Set up health checks
- [ ] Configure auto-restart on crash

### WebSocket/Video Calls
- [ ] Use Redis for channel layers
- [ ] Configure STUN/TURN servers
- [ ] Test across different networks
- [ ] Set up monitoring for WebSocket connections

---

## 💡 Development vs Production

### Development (Current Setup)
- SQLite database ✅
- InMemoryChannelLayer ✅
- DEBUG = True ✅
- `python manage.py runserver` ✅
- `npm start` ✅

### Production (What You Need)
- PostgreSQL/MySQL database
- Redis for channels
- DEBUG = False
- Gunicorn/uWSGI + Nginx
- `npm run build` served by Nginx or CDN
- Process manager (systemd/supervisor)
- Monitoring and logging

---

## 🎯 Quick Start for Others

Users cloning your repo can get started with:

\`\`\`bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend (new terminal)
npm install
npm start
\`\`\`

---

## ⚡ Keeping Backend Running 24/7

### For Production:

**Option 1: Use a Platform Service** (Easiest)
- Railway, Render, Heroku handle this automatically
- No manual process management needed

**Option 2: Use systemd** (Linux VPS)
Create `/etc/systemd/system/skillswap.service`:

\`\`\`ini
[Unit]
Description=SkillSwap Django Application
After=network.target

[Service]
User=youruser
Group=yourgroup
WorkingDirectory=/path/to/Skills-Swap/backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/gunicorn skillswap.wsgi:application --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target