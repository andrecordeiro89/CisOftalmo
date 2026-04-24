# OftalmoPro — Plataforma Clínica Oftalmológica

## Stack
React 18 + TypeScript · Vite · Tailwind CSS · Supabase · React Router v6 · pdf.js

---

## Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais do Supabase

# 3. Criar as tabelas no Supabase
# Abra o SQL Editor no seu projeto Supabase
# Cole e execute o SQL que está em src/lib/supabase.ts (dentro do comentário /* ... */)

# 4. Rodar
npm run dev
# → http://localhost:5173
```

---

## Telas implementadas

| Tela | Status | Funcionalidades |
|------|--------|-----------------|
| Recepção | ✅ Completo | Upload PDF AVYX, extração automática, CPF único, tipos de atendimento, lista de pacientes |
| Triagem | ✅ Completo | 4 abas: Motivo/Queixas, Anamnese, AV/Exames, Resumo · salva no Supabase |
| Consulta Médica | ✅ Completo | Resumo triagem inline, biomicroscopia, FO, tono, diagnóstico, conduta completa, consentimento |
| Agendamento | ✅ Completo | Calendário, confirmação, kit cirúrgico com 5 documentos prontos para impressão |

---

## Credenciais Supabase
- `VITE_SUPABASE_URL` → Settings → API → Project URL
- `VITE_SUPABASE_ANON_KEY` → Settings → API → anon/public key
