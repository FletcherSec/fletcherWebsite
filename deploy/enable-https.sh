#!/usr/bin/env bash
# Switch nginx to HTTPS using the Cloudflare ORIGIN certificate.
# Before running (as root):
#   1. Cloudflare dashboard > SSL/TLS > Origin Server > Create Certificate
#      (defaults: RSA, fletched.me + *.fletched.me, 15 years)
#   2. Paste the certificate into  /etc/ssl/cloudflare/fletched.me.pem
#      and the private key into    /etc/ssl/cloudflare/fletched.me.key
#   3. Cloudflare > SSL/TLS > set encryption mode to Full (strict)
# Then:  sudo bash enable-https.sh
set -euo pipefail

DOMAIN=fletched.me
WEBROOT=/var/www/$DOMAIN
CERT=/etc/ssl/cloudflare/$DOMAIN.pem
KEY=/etc/ssl/cloudflare/$DOMAIN.key

if [ ! -s "$CERT" ] || [ ! -s "$KEY" ]; then
  echo "Missing $CERT or $KEY — paste the Cloudflare origin cert/key first." >&2
  exit 1
fi
chmod 600 "$KEY"

cat > /etc/nginx/sites-available/$DOMAIN <<EOF
# fletched.me — static Astro site behind Cloudflare (Full strict)
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate     $CERT;
    ssl_certificate_key $KEY;
    ssl_protocols TLSv1.2 TLSv1.3;

    root $WEBROOT;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml text/plain;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    # Astro emits content-hashed assets under /_astro/ — cache forever
    location /_astro/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF

nginx -t
systemctl reload nginx
echo "HTTPS enabled. Verify: curl -sI https://$DOMAIN (via Cloudflare once DNS is live)."
