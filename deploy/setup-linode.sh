#!/bin/bash

# MultiAiApp Backend - Linode VPS Setup Script
# Run this script on your Linode VPS as root or with sudo

set -e  # Exit on error

echo "================================================"
echo "MultiAiApp Backend - Linode VPS Setup"
echo "================================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root or with sudo"
   exit 1
fi

# Step 1: Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Step 2: Install Node.js
print_status "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
npm_version=$(npm --version)
print_status "Node.js installed: $node_version"
print_status "npm installed: $npm_version"

# Step 3: Install required packages
print_status "Installing Git, Nginx, and other dependencies..."
apt install -y git nginx certbot python3-certbot-nginx build-essential

# Step 4: Install PM2 and tsx globally
print_status "Installing PM2 and tsx..."
npm install -g pm2 tsx

# Step 5: Create application directory
print_status "Creating application directory..."
mkdir -p /var/www
cd /var/www

# Step 6: Clone repository
if [ -d "/var/www/MultiAiApp-Backend" ]; then
    print_warning "Repository already exists. Pulling latest changes..."
    cd MultiAiApp-Backend
    git pull
else
    print_status "Cloning repository..."
    git clone https://github.com/fruitcc/MultiAiApp-Backend.git
    cd MultiAiApp-Backend
fi

# Step 7: Install dependencies
print_status "Installing application dependencies..."
npm install

# Step 8: Setup environment file
if [ ! -f ".env" ]; then
    print_status "Creating .env file from template..."
    cp .env.example .env
    print_warning "Please edit /var/www/MultiAiApp-Backend/.env and add your API keys!"
    echo ""
    echo "Run: nano /var/www/MultiAiApp-Backend/.env"
    echo ""
else
    print_status ".env file already exists"
fi

# Step 9: Create PM2 ecosystem file
print_status "Creating PM2 ecosystem configuration..."
cat > /var/www/MultiAiApp-Backend/ecosystem.config.cjs << 'EOF'
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
      PORT: 48395
    },
    error_file: '/var/log/pm2/multiaiapp-error.log',
    out_file: '/var/log/pm2/multiaiapp-out.log',
    log_file: '/var/log/pm2/multiaiapp-combined.log',
    time: true
  }]
};
EOF

# Step 10: Create log directory
print_status "Creating log directory..."
mkdir -p /var/log/pm2

# Step 11: Configure Nginx
print_status "Configuring Nginx..."

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)

cat > /etc/nginx/sites-available/multiaiapp << EOF
server {
    listen 80;
    server_name $SERVER_IP;

    location / {
        proxy_pass http://localhost:48395;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeout settings for slow APIs
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/multiaiapp /etc/nginx/sites-enabled/

# Remove default site if exists
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx

# Step 12: Configure firewall
print_status "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Step 13: Create update script
print_status "Creating update script..."
cat > /var/www/MultiAiApp-Backend/update.sh << 'EOF'
#!/bin/bash
cd /var/www/MultiAiApp-Backend
git pull
npm install
pm2 restart multiaiapp-backend
echo "Update complete!"
EOF
chmod +x /var/www/MultiAiApp-Backend/update.sh

echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
print_warning "IMPORTANT - Next Steps:"
echo ""
echo "1. Edit the .env file with your API keys:"
echo "   nano /var/www/MultiAiApp-Backend/.env"
echo ""
echo "2. Start the application:"
echo "   cd /var/www/MultiAiApp-Backend"
echo "   pm2 start ecosystem.config.cjs"
echo "   pm2 save"
echo "   pm2 startup systemd -u root --hp /root"
echo ""
echo "3. Your backend will be available at:"
echo "   http://$SERVER_IP"
echo ""
echo "4. Test the health endpoint:"
echo "   curl http://$SERVER_IP/health"
echo ""
echo "5. To setup SSL with a domain (optional):"
echo "   - Point your domain to $SERVER_IP"
echo "   - Run: certbot --nginx -d yourdomain.com"
echo ""
echo "6. Update your iOS app's APIManager.swift:"
echo "   backendURL = \"http://$SERVER_IP/api/ai\""
echo ""
echo "================================================"