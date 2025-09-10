# Deployment Guide for MultiAiApp Backend

## Prerequisites
- Git repository (GitHub, GitLab, or Bitbucket)
- API keys for AI services you want to use

## Option 1: Deploy to Render (Recommended - Free)

1. **Prepare your code:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Deploy to Render:**
   - Go to [render.com](https://render.com)
   - Sign up/login with GitHub
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - Name: `multiaiapp-backend`
     - Environment: `Node`
     - Build Command: `npm install`
     - Start Command: `npm start:prod`
   - Add environment variables in Render dashboard:
     - `OPENAI_API_KEY`
     - `ANTHROPIC_API_KEY`
     - `GOOGLE_API_KEY`
     - `PERPLEXITY_API_KEY`
     - `ALLOWED_ORIGINS` (set to your app's URL)
   - Click "Create Web Service"

3. **Update your iOS app:**
   - Change backend URL in `APIManager.swift` from `http://localhost:3000` to your Render URL
   - Example: `https://multiaiapp-backend.onrender.com`

## Option 2: Deploy to Railway

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Deploy:**
   ```bash
   railway login
   railway init
   railway up
   railway domain  # Get your public URL
   ```

3. **Set environment variables:**
   ```bash
   railway variables set OPENAI_API_KEY=your_key
   railway variables set ANTHROPIC_API_KEY=your_key
   railway variables set GOOGLE_API_KEY=your_key
   railway variables set PERPLEXITY_API_KEY=your_key
   ```

## Option 3: Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   # Follow the prompts
   ```

3. **Set environment variables:**
   - Go to Vercel dashboard
   - Settings → Environment Variables
   - Add your API keys

## Option 4: Deploy to DigitalOcean App Platform

1. **Push to GitHub**
2. **Create App:**
   - Go to DigitalOcean App Platform
   - Click "Create App"
   - Choose GitHub repository
   - Configure:
     - Region: Choose closest to your users
     - Plan: Basic ($5/month) or Pro
   - Add environment variables
   - Deploy

## Option 5: Deploy to VPS (DigitalOcean, Linode, AWS EC2)

1. **SSH into your server:**
   ```bash
   ssh user@your-server-ip
   ```

2. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone and setup:**
   ```bash
   git clone your-repo-url
   cd MultiAiApp-Backend
   npm install
   npm install -g pm2
   ```

4. **Create .env file:**
   ```bash
   cp .env.example .env
   nano .env  # Add your API keys
   ```

5. **Start with PM2:**
   ```bash
   pm2 start npm --name "multiaiapp-backend" -- run start:prod
   pm2 save
   pm2 startup
   ```

6. **Setup Nginx (optional):**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/multiaiapp
   ```

   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable:
   ```bash
   sudo ln -s /etc/nginx/sites-available/multiaiapp /etc/nginx/sites-enabled
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## Post-Deployment Steps

1. **Update iOS App:**
   Edit `/Users/guochen/code/MultiAiApp/MultiAiApp/Services/APIManager.swift`:
   ```swift
   private let backendURL = "https://your-deployed-url.com/api/ai"
   ```

2. **Update CORS settings:**
   In your deployed environment variables, set:
   ```
   ALLOWED_ORIGINS=https://your-app-domain.com,capacitor://localhost
   ```

3. **Test the deployment:**
   ```bash
   curl https://your-deployed-url.com/health
   ```

## Security Considerations

1. **Use HTTPS** - All recommended platforms provide free SSL certificates
2. **Secure API keys** - Never commit `.env` file to git
3. **Rate limiting** - Consider adding rate limiting for production
4. **Monitor usage** - Watch your API usage and costs

## Monitoring

- **Render**: Built-in metrics dashboard
- **Railway**: Metrics in dashboard
- **VPS**: Use PM2 monitoring: `pm2 monit`

## Updating Your Deployment

For most platforms:
```bash
git add .
git commit -m "Update backend"
git push origin main
```
The platform will auto-deploy the changes.

For VPS with PM2:
```bash
git pull
npm install
pm2 restart multiaiapp-backend
```