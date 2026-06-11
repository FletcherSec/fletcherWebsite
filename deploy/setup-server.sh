#!/usr/bin/env bash
# One-time bootstrap for the fletched.me origin (Ubuntu 24.04 on Lightsail).
# Run as root:  curl -fsSL https://raw.githubusercontent.com/FletcherSec/fletcherWebsite/main/deploy/setup-server.sh | sudo bash
# Serves HTTP immediately; run enable-https.sh after installing the
# Cloudflare origin certificate (see deploy/enable-https.sh).
set -euo pipefail

DOMAIN=fletched.me
WEBROOT=/var/www/$DOMAIN

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq nginx ufw fail2ban unattended-upgrades

# --- deploy user: owns the webroot, is what GitHub Actions logs in as -------
if ! id deploy &>/dev/null; then
  adduser --disabled-password --gecos '' deploy
fi
mkdir -p "$WEBROOT"
chown -R deploy:deploy "$WEBROOT"

# dedicated CI keypair — the private half goes in the repo's DEPLOY_SSH_KEY
# secret; your admin key is never shared with GitHub. Re-running rotates the
# key (old github-deploy entries are replaced), so always update the secret.
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
sed -i '/github-deploy/d' /home/deploy/.ssh/authorized_keys
rm -f /tmp/github_deploy /tmp/github_deploy.pub
sudo -u deploy ssh-keygen -q -t ed25519 -C github-deploy -N '' -f /tmp/github_deploy
cat /tmp/github_deploy.pub >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
DEPLOY_KEY=$(cat /tmp/github_deploy)
rm -f /tmp/github_deploy /tmp/github_deploy.pub

# --- ssh hardening (cloud images mostly default to this; make it explicit) --
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
EOF
# Ubuntu 24.04 socket-activates sshd: when idle there is no service to
# reload, and each new connection picks up the config fresh — so a failed
# reload here is fine.
systemctl reload ssh 2>/dev/null || true

# --- firewall + fail2ban -----------------------------------------------------
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
systemctl enable --now fail2ban

# --- nginx: HTTP-only to start (HTTPS comes with enable-https.sh) -----------
cat > /etc/nginx/sites-available/$DOMAIN <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    root $WEBROOT;
    index index.html;

    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
rm -f /etc/nginx/sites-enabled/default
[ -f "$WEBROOT/index.html" ] || echo '<!doctype html><title>fletched.me</title><pre>$ deploy pending…</pre>' > "$WEBROOT/index.html"
chown deploy:deploy "$WEBROOT/index.html"
nginx -t
systemctl reload nginx

echo
echo "============================================================"
echo "Server ready. Site serving over HTTP."
echo
echo "GitHub repo secrets to add (Settings > Secrets > Actions):"
echo "  DEPLOY_HOST    = this server's static IP"
echo "  DEPLOY_SSH_KEY = the private key below (copy ALL lines)"
echo "============================================================"
echo "${DEPLOY_KEY:-<deploy key already provisioned on a previous run>}"
echo "============================================================"
echo "Next: install the Cloudflare origin cert, then run enable-https.sh"
