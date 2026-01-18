#!/bin/bash
# ============================================================
# WhatsApp Link Guardrail - Anti-Regression Script
# ============================================================
# This script detects manual WhatsApp URL constructions
# that bypass the centralized builder system.
#
# Run: bash scripts/lint-whatsapp.sh
# ============================================================

set -e

echo "🔍 WhatsApp Link Lint - Verificando uso de builders..."
echo ""

ERRORS=0

# Check for api.whatsapp.com (FORBIDDEN everywhere)
echo "Checking for api.whatsapp.com..."
API_WA_MATCHES=$(grep -rn "api.whatsapp.com" --include="*.ts" --include="*.tsx" src/ supabase/ 2>/dev/null || true)
if [ -n "$API_WA_MATCHES" ]; then
  echo "❌ PROIBIDO: api.whatsapp.com encontrado:"
  echo "$API_WA_MATCHES"
  echo ""
  ERRORS=$((ERRORS + 1))
fi

# Check for whatsapp.com/send (FORBIDDEN everywhere)
echo "Checking for whatsapp.com/send..."
WA_SEND_MATCHES=$(grep -rn "whatsapp.com/send" --include="*.ts" --include="*.tsx" src/ supabase/ 2>/dev/null || true)
if [ -n "$WA_SEND_MATCHES" ]; then
  echo "❌ PROIBIDO: whatsapp.com/send encontrado:"
  echo "$WA_SEND_MATCHES"
  echo ""
  ERRORS=$((ERRORS + 1))
fi

# Check for hardcoded wa.me outside allowed files
echo "Checking for hardcoded wa.me links..."
ALLOWED_FILES="whatsappBuilder|FloatingShareBar"
WA_ME_MATCHES=$(grep -rn "https://wa.me/" --include="*.ts" --include="*.tsx" src/ supabase/ 2>/dev/null | grep -vE "$ALLOWED_FILES" || true)
if [ -n "$WA_ME_MATCHES" ]; then
  echo "⚠️ POSSÍVEL PROBLEMA: wa.me hardcoded fora dos builders:"
  echo "$WA_ME_MATCHES"
  echo ""
  echo "   Se for compartilhamento (FloatingShareBar) ou dentro do builder, é OK."
  echo "   Se for CTA ou link de contato, deve usar buildWhatsAppLink/buildWhatsAppLinkSync."
  echo ""
fi

# Summary
echo "=============================================="
if [ $ERRORS -gt 0 ]; then
  echo "❌ WhatsApp lint FALHOU com $ERRORS erros"
  echo ""
  echo "SOLUÇÃO: Use as funções centralizadas:"
  echo "  - Frontend: useGlobalWhatsApp().buildLink() ou openLink()"
  echo "  - Backend: buildWhatsAppLinkSync() de _shared/whatsappBuilder.ts"
  exit 1
fi

echo "✅ WhatsApp lint PASSOU - Nenhum link manual proibido encontrado"
echo ""
echo "Builders centralizados:"
echo "  - src/lib/whatsappBuilder.ts (frontend)"
echo "  - supabase/functions/_shared/whatsappBuilder.ts (backend)"
