# Deploying MultiAiApp Backend to Linode VPS

## Prerequisites
- Linode VPS instance running Ubuntu 20.04+ or Debian 11+
- SSH access to your server
- Domain name (optional but recommended)

## Step 1: Connect to Your Linode VPS

```bash
ssh root@YOUR_LINODE_IP
```

Or if you have a non-root user:
```bash
ssh username@YOUR_LINODE_IP
```

## Step 2: Install Required Software

Run these commands on your Linode VPS:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version

# Install Git
sudo apt install git -y

# Install PM2 globally for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y

# Install certbot for SSL (optional but recommended)
sudo apt install certbot python3-certbot-nginx -y
```

## Step 3: Clone and Setup the Application

```bash
# Create app directory
sudo mkdir -p /var/www
cd /var/www

# Clone your repository
sudo git clone https://github.com/fruitcc/MultiAiApp-Backend.git
cd MultiAiApp-Backend

# Install dependencies
sudo npm install

# Install tsx globally for running TypeScript
sudo npm install -g tsx
```

## Step 4: Configure Environment Variables

```bash
# Copy the example env file
sudo cp .env.example .env

# Edit the .env file with your API keys
sudo nano .env
```

Add your actual API keys:
```env
# AI Service API Keys
OPENAI_API_KEY=your_actual_openai_key
ANTHROPIC_API_KEY=your_actual_anthropic_key
GOOGLE_API_KEY=your_actual_google_key
PERPLEXITY_API_KEY=your_actual_perplexity_key

# Server Configuration
PORT=3000
NODE_ENV=production

# CORS Configuration (update with your domain)
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000,capacitor://localhost
```

Save and exit (Ctrl+X, then Y, then Enter).

## Step 5: Setup PM2 Process Manager

Create PM2 ecosystem file:
```bash
sudo nano ecosystem.config.js
```

Add this content:
```javascript
module.exports = {
  apps: [{
    name: 'multiaiapp-backend',
    script: 'npx',
    args: 'tsx src/server.ts',
    cwd: '/var/www/MultiAiApp-Backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/multiaiapp-error.log',
    out_file: '/var/log/pm2/multiaiapp-out.log',
    log_file: '/var/log/pm2/multiaiapp-combined.log',
    time: true
  }]
};
```

Start the application:
```bash
# Create log directory
sudo mkdir -p /var/log/pm2

# Start the application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd -u root --hp /root
```

## Step 6: Configure Nginx Reverse Proxy

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/multiaiapp
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings for Perplexity API (which can be slow)
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}
```

Enable the configuration:
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/multiaiapp /etc/nginx/sites-enabled/

# Remove default site if exists
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Step 7: Configure Firewall

```bash
# Allow SSH (port 22)
sudo ufw allow 22

# Allow HTTP (port 80)
sudo ufw allow 80

# Allow HTTPS (port 443)
sudo ufw allow 443

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status
```

## Step 8: Setup SSL Certificate (Optional but Recommended)

If you have a domain name:
```bash
# Replace YOUR_DOMAIN with your actual domain
sudo certbot --nginx -d YOUR_DOMAIN

# Follow the prompts to configure SSL
# Choose option 2 to redirect HTTP to HTTPS
```

## Step 9: Test Your Deployment

```bash
# Check if the app is running
pm2 status

# Check the health endpoint
curl http://localhost:3000/health

# Check logs if needed
pm2 logs multiaiapp-backend

# Test from outside (from your local machine)
curl http://YOUR_LINODE_IP/health
```

## Step 10: Update Your iOS App

Edit `/Users/guochen/code/MultiAiApp/MultiAiApp/Services/APIManager.swift`:

```swift
// Change from:
private let backendURL = "http://localhost:3000/api/ai"

// To (if using domain with SSL):
private let backendURL = "https://yourdomain.com/api/ai"

// Or (if using IP without SSL):
private let backendURL = "http://YOUR_LINODE_IP/api/ai"
```

## Maintenance Commands

```bash
# View application logs
pm2 logs multiaiapp-backend

# Restart application
pm2 restart multiaiapp-backend

# Stop application
pm2 stop multiaiapp-backend

# Monitor application
pm2 monit

# Update application
cd /var/www/MultiAiApp-Backend
git pull
npm install
pm2 restart multiaiapp-backend

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### If PM2 doesn't start:
```bash
# Check PM2 logs
pm2 logs

# Try running directly to see errors
cd /var/www/MultiAiApp-Backend
npx tsx src/server.ts
```

### If Nginx returns 502 Bad Gateway:
```bash
# Check if app is running
pm2 status
pm2 logs

# Check if port 3000 is listening
sudo netstat -tulpn | grep :3000
```

### If API calls fail:
```bash
# Check environment variables
pm2 env multiaiapp-backend

# Ensure .env file has correct API keys
cat /var/www/MultiAiApp-Backend/.env
```

## Security Recommendations

1. **Use a non-root user** for running the application
2. **Enable SSL** with Let's Encrypt
3. **Keep your system updated**: `sudo apt update && sudo apt upgrade`
4. **Monitor logs** regularly
5. **Set up fail2ban** for additional security
6. **Backup your .env file** securely

## Quick Deployment Script

Save this as `deploy.sh` on your Linode:
```bash
#!/bin/bash
cd /var/www/MultiAiApp-Backend
git pull
npm install
pm2 restart multiaiapp-backend
echo "Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Your backend is now deployed on Linode! 🚀