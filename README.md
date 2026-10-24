# issueDash

**Frontend do fluxo Atas → Plano de ação → Issues, mais um dashboard de métricas.** Interface web da
[`issueApi`](../issueApi): o usuário registra uma reunião de gestão da Mega Jr., responde ao grill da IA,
revisa e aprova o plano de ação e cria as issues no GitHub. O dashboard mostra como o backlog da
organização está se comportando.

Projeto da Batalha de Inovação Conecta v360, Trilha B (Tecnologia & TI).

## O problema

Decisões e problemas levantados em reuniões de gestão se perdem, e transformar uma reunião em tarefas no
board é lento e inconsistente. Este app guia o usuário por todo o caminho, da reunião à issue criada, e
mostra no dashboard se o trabalho está mesmo andando.

## Telas

```
Dashboard                      Nova reunião ──► Ata ──► Grill ──► Plano ──► Issues
(métricas do GitHub)           (formulário)    (IA)     (você     (revisa    (YAMLs + criar
                                                        responde)  e aprova)  no GitHub)
```

| Rota | Tela | O que faz |
| --- | --- | --- |
| `/dashboard` | Dashboard | KPIs e gráficos de issues da organização, com filtro de período |
| `/reunioes/nova` | Nova reunião | Formulário da reunião; envia para a API gerar a ata |
| `/reunioes/:id/ata` | Ata | Mostra a ata gerada (resumo, acompanhamento e problemas) em Markdown |
| `/reunioes/:id/grill` | Grill | Rodadas de perguntas da IA, cada uma com resposta sugerida |
| `/reunioes/:id/plano` | Plano de ação | Gera, edita e aprova o plano (ações, responsáveis, labels, prazos) |
| `/reunioes/:id/issues` | Issues | Gera os YAMLs, permite baixá-los e cria as issues no GitHub |

`/` redireciona para `/dashboard`.

### Fluxo da reunião

1. **Nova reunião** (`POST /reunioes`): título, participantes e texto da reunião. A API devolve a ata.
2. **Grill** (`POST /reunioes/{id}/grill` e `POST /grill/{sessao}/respostas`): cada rodada traz de uma vez as
   perguntas de todos os problemas (dono, prazo, critério de sucesso). Dá para aceitar a sugestão da IA ou
   escrever a própria resposta, e só se sobrarem lacunas há uma nova rodada.
3. **Plano** (`POST /reunioes/{id}/plano`): rascunho editável (`PATCH`). Responsáveis e labels vêm de
   `GET /config`, então só aparecem opções válidas. **Aprovar** (`POST .../plano/aprovar`) trava a edição.
4. **Issues** (`POST /reunioes/{id}/issues`): um YAML por ação, que pode ser baixado. O botão
   **Criar issues no GitHub** (`POST /reunioes/{id}/issues/publicar`) cria as issues de verdade.

O estado do wizard fica no `localStorage`, porque a API não tem `GET` de reuniões. Ao voltar, o app leva o
usuário à etapa mais avançada salva (grill, plano ou issues). Limpar os dados do navegador apaga esse
progresso, mas não o que já está na API.

### Dashboard

Os dados vêm dos endpoints `/issues/*` da API (coletados do GitHub para o Postgres):

| Gráfico | Endpoint | Para quê |
| --- | --- | --- |
| Issues abertas / fechadas / abertas há +90 dias | `/issues/summary` | Panorama do backlog |
| Tempo de resolução | `/issues/resolution-time` | Mediana e P90 do abrir ao fechar, por semana |
| Vazão semanal | `/issues/throughput` | Abertas × fechadas; se abrem mais do que fecham, o backlog cresce |
| Issues por label | `/issues/by-label` | Onde o trabalho se concentra |
| Envelhecimento do backlog | `/issues/backlog-aging` | Issues abertas por faixa de idade (a de 90+ dias é a mais esquecida) |

Sem banco configurado na API (`sem_banco`), o dashboard mostra o aviso de métricas indisponíveis e o resto do
app continua funcionando.

## Rodar

Pré-requisitos: Node.js 20+ e a [`issueApi`](../issueApi) em execução (`docker compose up -d --build`, porta
8000).

```bash
cp .env.example .env   # VITE_API_URL=http://localhost:8000
npm install
npm run dev            # http://localhost:5173
```

A porta **5173** é fixa (`strictPort`), porque o CORS da API só libera essa origem. Se ela estiver ocupada,
o Vite falha em vez de subir em outra porta.

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000` | URL base da API |

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Checa os tipos (`tsc -b`) e gera `dist/` |
| `npm run preview` | Serve o `dist/` localmente |
| `npm run lint` | Roda o `oxlint` |

## Stack

- **Vite + React 19 + TypeScript**
- **React Router** (rotas do wizard e do dashboard)
- **TanStack Query** (cache, loading e erro das métricas)
- **Recharts** (gráficos)
- **Tailwind CSS 4** (identidade visual da Mega em variáveis CSS)
- **react-markdown** (renderiza a ata)

## Tratamento de erros

A API devolve `{ erro, detalhe }`, e `src/lib/api.ts` traduz cada código em mensagem em português (ex.:
`entrada_insuficiente`, `respostas_incompletas`, `plano_invalido`, `plano_aprovado`). Falhas da IA (502,
`saida_invalida`, `falha_externa`) oferecem tentar de novo. Chamadas ao LLM têm timeout de 180 s, com
mensagem própria. Rede fora do ar e API inacessível também têm texto específico.

## Estrutura

```
src/
  pages/        uma por rota (Dashboard, NovaReuniao, Ata, Grill, Plano, Issues)
  components/   Layout, Stepper, AcaoCard, MultiSelect, ChartCard, NaoExiste
  lib/          api (fetch e erros), wizard (localStorage), plano, issue, metrics
sdd/            spec do frontend, contrato com a API e pendências
public/         favicon
```

## Documentação

- [`sdd/spec.md`](sdd/spec.md): especificação do frontend (escopo, identidade visual, telas, erros).
- [`sdd/contrato.md`](sdd/contrato.md): contrato com a API.
- [`sdd/pendencias.md`](sdd/pendencias.md): o que ainda falta, por etapa.

## Limites conhecidos

- Sem login nem múltiplos usuários, e sem histórico de reuniões (a API não lista reuniões).
- O progresso do wizard vive só no navegador (`localStorage`).
- Sem testes automatizados: nenhum framework configurado.
- Logo oficial pendente: hoje o cabeçalho usa o texto "Mega Jr." em Poppins.
- As fontes vêm do Google Fonts (CDN); é preciso self-host para rodar offline.
- Menu no celular sem botão de recolher.
- Acessibilidade dos gráficos: só há tabela alternativa, sem `aria-label` por gráfico.

## Créditos

- Sessão de perguntas inspirada na skill **grill-me**, de Matt Pocock.
