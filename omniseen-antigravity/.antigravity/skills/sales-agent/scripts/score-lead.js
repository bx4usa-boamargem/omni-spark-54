#!/usr/bin/env node
/**
 * sales-agent/scripts/score-lead.js
 * Called by: sales-agent skill (Step 2)
 * Usage: node score-lead.js --message "<text>" --history-file <path>
 */

import fs from 'fs';

const args = process.argv.slice(2);
const msgIdx = args.indexOf('--message');
const histIdx = args.indexOf('--history-file');

const message = msgIdx >= 0 ? args[msgIdx + 1] : '';
const historyFile = histIdx >= 0 ? args[histIdx + 1] : null;

let history = [];
if (historyFile && fs.existsSync(historyFile)) {
  history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
}

const SIGNALS = [
  // Budget signals (+40)
  { regex: /orçamento|preço|quanto\s+(custa|fica|é)|valor|cobr[ao]|barato|caro/gi, score: 40, type: 'budget' },
  // Schedule signals (+30)
  { regex: /agendar|marcar|quando\s+(vocês\s+)?(atendem|estão)|disponível|horário|visita/gi, score: 30, type: 'schedule' },
  // Contact offer (+30)
  { regex: /meu\s+(número|telefone|email|contato)|pode\s+me\s+(ligar|mandar|contatar)|whatsapp/gi, score: 30, type: 'contact_offer' },
  // Information (+10)
  { regex: /como\s+funciona|o\s+que\s+inclui|quais\s+(são|os)\s+serviços|mais\s+informações/gi, score: 10, type: 'info' },
  // Urgency (+20)
  { regex: /urgente|hoje|agora|rápido|emergência|imediato/gi, score: 20, type: 'urgency' }
];

function scoreText(text) {
  let score = 0;
  const signals = [];
  for (const signal of SIGNALS) {
    signal.regex.lastIndex = 0;
    if (signal.regex.test(text)) {
      score += signal.score;
      signals.push(signal.type);
    }
  }
  return { score, signals };
}

// Score current message
const current = scoreText(message);

// Score history (decayed: last message 100%, second-to-last 70%, older 40%)
let historyScore = 0;
const decay = [1.0, 0.7, 0.4, 0.2];
const recentHistory = [...history].reverse().slice(0, 4);
for (let i = 0; i < recentHistory.length; i++) {
  const msg = recentHistory[i];
  if (msg.role === 'user') {
    const { score } = scoreText(msg.content || '');
    historyScore += score * (decay[i] || 0.1);
  }
}

const totalScore = Math.min(100, Math.round(current.score + historyScore * 0.3));

const result = {
  score: totalScore,
  current_signals: current.signals,
  should_capture_lead: totalScore >= 60,
  should_show_whatsapp: totalScore >= 80,
  message: message.substring(0, 100)
};

fs.mkdirSync('.tmp', { recursive: true });
fs.writeFileSync('.tmp/lead-score.json', JSON.stringify(result, null, 2));

console.log(`[LEAD SCORE] ${totalScore}/100 | capture: ${result.should_capture_lead} | wa: ${result.should_show_whatsapp}`);
if (current.signals.length > 0) {
  console.log(`[SIGNALS] ${current.signals.join(', ')}`);
}

process.exit(0);
