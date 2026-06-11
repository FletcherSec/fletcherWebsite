#!/usr/bin/env bash
# Restrict HTTP/HTTPS on the origin to Cloudflare's edge IP ranges, so the
# site can only be reached through the proxy (direct-to-IP scanning gets
# nothing). SSH (22) is untouched.
# Run as root:  curl -fsSL <raw url> | sudo bash
# Cloudflare occasionally adds ranges (https://www.cloudflare.com/ips/);
# re-running this refreshes the allowlist.
set -euo pipefail

RANGES=$(curl -fsSL https://www.cloudflare.com/ips-v4)
[ -n "$RANGES" ] || { echo "could not fetch Cloudflare ranges" >&2; exit 1; }

for cidr in $RANGES; do
  ufw allow proto tcp from "$cidr" to any port 80,443 comment cloudflare
done

# drop the old allow-from-anywhere web rules (keep OpenSSH)
ufw --force delete allow 80/tcp 2>/dev/null || true
ufw --force delete allow 443/tcp 2>/dev/null || true

ufw reload
echo
ufw status | head -40
echo
echo "Done. 80/443 now answer only to Cloudflare; verify with:"
echo "  curl -m 5 -o /dev/null http://<static-ip>/   # should time out"
