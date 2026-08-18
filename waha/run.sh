#!/bin/sh
set -eu

OPTIONS=/data/options.json
if [ ! -f "$OPTIONS" ]; then
  echo "Missing $OPTIONS; Home Assistant did not provide add-on options" >&2
  exit 1
fi

read_option() {
  node -e 'const o=require(process.argv[1]); const v=o[process.argv[2]]; process.stdout.write(v === undefined || v === null ? "" : String(v))' "$OPTIONS" "$1"
}

export WAHA_LOCAL_STORE_BASE_DIR=/data/.sessions
export WHATSAPP_API_PORT=3000
export WHATSAPP_DEFAULT_ENGINE="$(read_option engine)"
export WAHA_PRINT_QR="$(read_option print_qr)"
export TZ="$(read_option timezone)"

api_key=$(read_option api_key)
dashboard_user=$(read_option dashboard_username)
dashboard_password=$(read_option dashboard_password)
swagger_user=$(read_option swagger_username)
swagger_password=$(read_option swagger_password)
swagger_enabled=$(read_option swagger_enabled)

if [ -z "$api_key" ] || [ -z "$dashboard_password" ]; then
  echo "Set an API key and dashboard password in the add-on configuration before starting WAHA." >&2
  exit 1
fi

export WAHA_API_KEY="$api_key"
export WAHA_DASHBOARD_ENABLED=true
export WAHA_DASHBOARD_USERNAME="$dashboard_user"
export WAHA_DASHBOARD_PASSWORD="$dashboard_password"
export WHATSAPP_SWAGGER_ENABLED="$swagger_enabled"
export WHATSAPP_SWAGGER_USERNAME="$swagger_user"
export WHATSAPP_SWAGGER_PASSWORD="$swagger_password"

onboard_pid=''
trap '[ -n "$onboard_pid" ] && kill "$onboard_pid" 2>/dev/null || true' EXIT INT TERM

/entrypoint.sh "$@" &
app_pid=$!
node /usr/local/bin/waha-ha-onboard.js &
onboard_pid=$!

wait "$app_pid"
