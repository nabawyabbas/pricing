# Deployment Guide: AWS EC2 with Apache2

This guide walks through deploying the Pricing App to an AWS EC2 instance with Apache2 as a reverse proxy.

## Prerequisites

- AWS EC2 instance (Ubuntu 22.04 LTS recommended)
- SSH access to the EC2 instance
- Domain name (optional, for SSL)
- MySQL database (can be RDS or local MySQL on EC2)

## Step 1: Initial Server Setup

### 1.1 Connect to EC2 Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 1.2 Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Install Required Software

```bash
# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL client (if using local MySQL)
sudo apt install -y mysql-client

# Install Git
sudo apt install -y git

# Install PM2 for process management
sudo npm install -g pm2

# Install Apache2 and required modules
sudo apt install -y apache2
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
sudo a2enmod rewrite
sudo a2enmod ssl
```

### 1.4 Verify Installations

```bash
node --version  # Should show v20.x.x
npm --version
mysql --version
apache2 -v
pm2 --version
```

## Step 2: Database Setup

### Option A: Using AWS RDS MySQL

1. Create an RDS MySQL instance in AWS Console
2. Note the endpoint, port, database name, username, and password
3. Ensure security group allows inbound MySQL (port 3306) from your EC2 instance

### Option B: Local MySQL on EC2

```bash
# Install MySQL Server
sudo apt install -y mysql-server

# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
CREATE DATABASE releaseable_pricer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pricing_app'@'localhost' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON releaseable_pricer.* TO 'pricing_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 3: Application Setup

### 3.1 Create Application Directory

```bash
sudo mkdir -p /var/www/pricing-app
sudo chown -R $USER:$USER /var/www/pricing-app
cd /var/www/pricing-app
```

### 3.2 Clone Repository

```bash
git clone https://github.com/your-username/pricing_app.git .
# Or upload your code using scp/rsync
```

### 3.3 Install Dependencies

```bash
npm install
```

### 3.4 Set Up Environment Variables

```bash
nano .env
```

Add the following (adjust values as needed):

```env
# Database
DATABASE_URL="mysql://pricing_app:your-secure-password@localhost:3306/releaseable_pricer"

# Next.js
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Admin User (for initial seed)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password

# Session Security (generate random strings)
SESSION_SECRET=your-random-session-secret-here
```

Generate secure random strings:

```bash
openssl rand -base64 32  # For SESSION_SECRET
```

### 3.5 Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed initial admin user (if no users exist)
npx prisma db seed
```

### 3.6 Build Application

```bash
npm run build
```

## Step 4: Configure PM2

### 4.1 Create PM2 Ecosystem File

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'pricing-app',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/pricing-app',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/pricing-app-error.log',
    out_file: '/var/log/pm2/pricing-app-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

### 4.2 Create Log Directory

```bash
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2
```

### 4.3 Start Application with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Follow the command output to enable PM2 on system boot
```

### 4.4 Verify PM2 Status

```bash
pm2 status
pm2 logs pricing-app
```

## Step 5: Configure Apache2 Reverse Proxy

### 5.1 Create Apache Virtual Host

```bash
sudo nano /etc/apache2/sites-available/pricing-app.conf
```

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAlias www.your-domain.com

    # Redirect HTTP to HTTPS (after SSL setup)
    # Uncomment after SSL is configured:
    # Redirect permanent / https://your-domain.com/

    # For initial setup, use this:
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # Headers
    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Forwarded-Port "80"
</VirtualHost>

# HTTPS Configuration (after SSL setup)
<VirtualHost *:443>
    ServerName your-domain.com
    ServerAlias www.your-domain.com

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/your-domain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/your-domain.com/privkey.pem

    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"

    # Reverse Proxy
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # Headers
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
</VirtualHost>
```

### 5.2 Enable Site and Restart Apache

```bash
sudo a2ensite pricing-app.conf
sudo a2dissite 000-default.conf  # Disable default site
sudo systemctl restart apache2
sudo systemctl status apache2
```

### 5.3 Test Configuration

```bash
sudo apache2ctl configtest
```

## Step 6: SSL Certificate (Let's Encrypt)

### 6.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-apache
```

### 6.2 Obtain SSL Certificate

```bash
sudo certbot --apache -d your-domain.com -d www.your-domain.com
```

Follow the prompts. Certbot will automatically configure Apache.

### 6.3 Auto-Renewal

Certbot sets up auto-renewal automatically. Test it:

```bash
sudo certbot renew --dry-run
```

## Step 7: Firewall Configuration

### 7.1 Configure UFW (Uncomplicated Firewall)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Apache Full'
sudo ufw allow 3306/tcp  # Only if using local MySQL
sudo ufw enable
sudo ufw status
```

## Step 8: Security Hardening

### 8.1 Secure Environment File

```bash
sudo chmod 600 /var/www/pricing-app/.env
```

### 8.2 Create Non-Root User (if not already done)

```bash
# Create user for running the app
sudo adduser pricing-app
sudo usermod -aG www-data pricing-app
sudo chown -R pricing-app:www-data /var/www/pricing-app
```

### 8.3 Update PM2 to Run as App User

Update `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    // ... existing config
    user: 'pricing-app',
    // ... rest of config
  }]
};
```

## Step 9: Monitoring and Maintenance

### 9.1 PM2 Monitoring

```bash
pm2 monit
```

### 9.2 View Logs

```bash
# Application logs
pm2 logs pricing-app

# Apache logs
sudo tail -f /var/log/apache2/error.log
sudo tail -f /var/log/apache2/access.log

# PM2 logs
tail -f /var/log/pm2/pricing-app-out.log
```

### 9.3 Application Updates

```bash
cd /var/www/pricing-app

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Run migrations
npx prisma migrate deploy
npx prisma generate

# Rebuild
npm run build

# Restart application
pm2 restart pricing-app
```

## Step 10: Backup Strategy

### 10.1 Database Backup Script

Create `/var/www/pricing-app/scripts/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/pricing-app"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="releaseable_pricer"
DB_USER="pricing_app"

mkdir -p $BACKUP_DIR
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/backup_$DATE.sql
gzip $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

Make it executable:

```bash
chmod +x /var/www/pricing-app/scripts/backup-db.sh
```

### 10.2 Set Up Cron Job for Backups

```bash
crontab -e
```

Add:

```
0 2 * * * /var/www/pricing-app/scripts/backup-db.sh
```

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 status
pm2 status
pm2 logs pricing-app

# Check if port 3000 is in use
sudo netstat -tlnp | grep 3000

# Check Node.js version
node --version
```

### Apache Not Proxying

```bash
# Check Apache error log
sudo tail -f /var/log/apache2/error.log

# Test Apache configuration
sudo apache2ctl configtest

# Verify proxy modules are enabled
apache2ctl -M | grep proxy
```

### Database Connection Issues

```bash
# Test MySQL connection
mysql -u pricing_app -p -h localhost releaseable_pricer

# Check MySQL status
sudo systemctl status mysql

# Check Prisma connection
cd /var/www/pricing-app
npx prisma db pull
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R pricing-app:www-data /var/www/pricing-app
sudo chmod -R 755 /var/www/pricing-app
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/dbname` |
| `NODE_ENV` | Environment mode | `production` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `https://your-domain.com` |
| `ADMIN_USERNAME` | Initial admin username | `admin` |
| `ADMIN_PASSWORD` | Initial admin password | `secure-password` |

## Quick Reference Commands

```bash
# Start/Stop/Restart App
pm2 start pricing-app
pm2 stop pricing-app
pm2 restart pricing-app

# Apache
sudo systemctl restart apache2
sudo systemctl status apache2

# MySQL
sudo systemctl restart mysql
sudo systemctl status mysql

# View Logs
pm2 logs pricing-app
sudo tail -f /var/log/apache2/error.log
```

## Post-Deployment Checklist

- [ ] Application accessible via domain/IP
- [ ] SSL certificate installed and working
- [ ] Database migrations applied
- [ ] Admin user created and can login
- [ ] PM2 auto-start configured
- [ ] Firewall rules configured
- [ ] Backups scheduled
- [ ] Monitoring set up
- [ ] Environment variables secured
- [ ] Apache reverse proxy working
- [ ] HTTPS redirect working (if using SSL)

## Support

For issues or questions:
1. Check application logs: `pm2 logs pricing-app`
2. Check Apache logs: `sudo tail -f /var/log/apache2/error.log`
3. Verify PM2 status: `pm2 status`
4. Test database connection: `npx prisma db pull`

