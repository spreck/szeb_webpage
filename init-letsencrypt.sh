#!/bin/bash

# Email to use for Let's Encrypt registration
email="your-email@example.com" # Change to your email

# Domain name to request certificate for
domains=("conescout.duckdns.org")

# Root directory for certbot files
data_path="./certbot"

# RSA key size
rsa_key_size=4096

# Set to 1 if you're testing your setup to avoid hitting request limits
staging=0

echo "### Creating required directories for certbot..."
mkdir -p "$data_path/conf/live/$domains"
mkdir -p "$data_path/www"

echo "### Downloading recommended TLS parameters..."
if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ]; then
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
  echo "Downloaded options-ssl-nginx.conf"
fi

if [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"
  echo "Downloaded ssl-dhparams.pem"
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
  echo "Error: Neither docker-compose nor docker compose is installed." >&2
  exit 1
fi

# Determine Docker Compose command
DOCKER_COMPOSE="docker-compose"
if ! command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE="docker compose"
fi

echo "### Using $DOCKER_COMPOSE as Docker Compose command"

echo "### Creating dummy certificate for $domains..."
domains_str="${domains[*]}"
path="/etc/letsencrypt/live/$domains"

$DOCKER_COMPOSE run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1\
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot

echo "### Starting nginx..."
$DOCKER_COMPOSE up -d nginx-container

echo "### Deleting dummy certificate for $domains..."
$DOCKER_COMPOSE run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$domains && \
  rm -Rf /etc/letsencrypt/archive/$domains && \
  rm -Rf /etc/letsencrypt/renewal/$domains.conf" certbot

echo "### Requesting Let's Encrypt certificate for $domains..."
# Join $domains to -d args
domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

# Select appropriate email arg
case "$email" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $email" ;;
esac

# Enable staging mode if needed
if [ $staging != "0" ]; then staging_arg="--staging"; fi

$DOCKER_COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    $domain_args \
    --rsa-key-size $rsa_key_size \
    --agree-tos \
    --force-renewal" certbot

echo "### Reloading nginx..."
$DOCKER_COMPOSE exec nginx-container nginx -s reload

echo "### Certificate setup completed!"
echo "You should now be able to access your site at https://$domains"
