#!/usr/bin/env bash
set -euo pipefail

URL="${1:-${PREVIEW_URL:-}}"

if [ -z "$URL" ]; then
  echo "Usage: $0 <url> or set PREVIEW_URL"
  exit 1
fi

echo "Running smoke test against $URL"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

falhar() {
  echo "Smoke test failed: $1"
  exit 1
}

# 1. Página pública carrega (pública = /login e / neste app).
STATUS=$(curl -s -o /tmp/smoke-body -w "%{http_code}" "$URL/login")
[ "$STATUS" = "200" ] || falhar "GET /login retornou $STATUS, esperado 200"
grep -q "Apoio à Rotina" /tmp/smoke-body || falhar "página pública sem conteúdo esperado"
echo "ok - página pública"

# 2. Rota privada exige sessão — sem cookie, redireciona para /login.
LOCATION=$(curl -s -o /dev/null -w "%{redirect_url}" "$URL/hoje")
case "$LOCATION" in
  */login*) echo "ok - rota privada protegida" ;;
  *) falhar "GET /hoje sem sessão não redirecionou para /login (Location: $LOCATION)" ;;
esac

# 3. Credencial inválida não entra — redirect para erro de credencial.
LOCATION=$(curl -s -o /dev/null -w "%{redirect_url}" \
  -X POST "$URL/api/auth/login" \
  --data-urlencode "email=smoke@invalido.local" \
  --data-urlencode "password=credencial-errada")
case "$LOCATION" in
  */login*erro=credencial*) echo "ok - credencial inválida rejeitada" ;;
  *) falhar "login inválido não devolveu erro=credencial (Location: $LOCATION)" ;;
esac

# 4. Fluxo completo com credencial de smoke — opcional, via env.
if [ -n "${SMOKE_EMAIL:-}" ] && [ -n "${SMOKE_PASSWORD:-}" ]; then
  LOCATION=$(curl -s -c "$COOKIE_JAR" -o /dev/null -w "%{redirect_url}" \
    -X POST "$URL/api/auth/login" \
    --data-urlencode "email=$SMOKE_EMAIL" \
    --data-urlencode "password=$SMOKE_PASSWORD")
  case "$LOCATION" in
    */hoje*) echo "ok - login" ;;
    *) falhar "login válido não redirecionou para /hoje (Location: $LOCATION)" ;;
  esac

  # Carregar a área privada exercita a persistência mínima (leitura do
  # estado e autocriação da tabela) sem escrever dados pessoais.
  STATUS=$(curl -s -b "$COOKIE_JAR" -o /tmp/smoke-body -w "%{http_code}" "$URL/hoje")
  [ "$STATUS" = "200" ] || falhar "GET /hoje autenticado retornou $STATUS"
  grep -q "Sair" /tmp/smoke-body || falhar "área privada sem conteúdo esperado"
  echo "ok - área privada + leitura persistida"

  LOCATION=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -o /dev/null -w "%{redirect_url}" \
    -X POST "$URL/api/auth/logout")
  case "$LOCATION" in
    */login*) : ;;
    *) falhar "logout não redirecionou para /login (Location: $LOCATION)" ;;
  esac
  LOCATION=$(curl -s -b "$COOKIE_JAR" -o /dev/null -w "%{redirect_url}" "$URL/hoje")
  case "$LOCATION" in
    */login*) echo "ok - logout encerra a sessão" ;;
    *) falhar "sessão continuou válida após logout" ;;
  esac
else
  echo "skip - SMOKE_EMAIL/SMOKE_PASSWORD ausentes; login/logout não verificados"
fi

echo "Smoke test passed"
