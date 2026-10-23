import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Markdown from "react-markdown";
import { Link, useNavigate } from "react-router-dom";
import MultiSelect from "../components/MultiSelect";
import Stepper from "../components/Stepper";
import { api, mensagemErro, post, temDetalhe } from "../lib/api";
import type { Config } from "../lib/plano";
import {
  clearWizard,
  loadWizard,
  reuniaoIdDe,
  saveWizard,
  semFrontmatter,
  rotaAtual,
  wizardEmAndamento,
  type WizardState,
} from "../lib/wizard";

type Criada = { reuniao_id: string; ata_path: string; ata_md: string };

const MIN_CHARS = 30;
const hoje = () => new Date().toLocaleDateString("sv"); // AAAA-MM-DD no fuso local
const paraBr = (iso: string) => iso.split("-").reverse().join("/");
// dd/mm/aaaa -> AAAA-MM-DD; "" se incompleta ou inexistente (ex.: 31/02)
const paraIso = (br: string) => {
  const [d, m, a] = br.split("/");
  const iso = `${a}-${m}-${d}`;
  return /^\d{2}\/\d{2}\/\d{4}$/.test(br) &&
    (Date.parse(iso) ? new Date(iso).toISOString() : "").startsWith(iso)
    ? iso
    : "";
};
const mascaraData = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/^(\d{2})(\d)/, "$1/$2")
    .replace(/^(\d{2}\/\d{2})(\d)/, "$1/$2");
const campo = (erro: unknown) =>
  `w-full rounded-ctl border bg-superficie px-3 py-2.5 transition focus:outline-none focus:ring-2 ${erro ? "border-erro ring-1 ring-erro focus:ring-erro/40" : "border-borda hover:border-roxo/50 focus:border-roxo focus:ring-roxo/25"}`;
const rotuloCls = "mb-1 block text-sm font-semibold";
const dica = "mt-1 text-xs text-suave";
const cartao = "space-y-5 rounded-card bg-superficie p-5 shadow-card";
const Erro = ({ id, msg }: { id: string; msg: unknown }) =>
  msg ? (
    <p id={id} className="mt-1 text-sm font-medium text-erro">
      ⚠ {String(msg)}
    </p>
  ) : null;
const Obrigatorio = () => (
  <span aria-hidden className="text-erro" title="Obrigatório">
    *
  </span>
);
const btn = "rounded-ctl px-4 py-2 disabled:opacity-60";

export default function NovaReuniao() {
  const navigate = useNavigate();
  const [andamento, setAndamento] = useState(wizardEmAndamento);
  const [titulo, setTitulo] = useState("");
  const [dataBr, setDataBr] = useState(() => paraBr(hoje()));
  const data = paraIso(dataBr);
  const [participantes, setParticipantes] = useState<string[]>([]);
  const cfg = useQuery({
    queryKey: ["config"],
    queryFn: () => api<Config>("/config"),
    staleTime: Infinity,
    retry: false,
  });
  const [acompanhamento, setAcompanhamento] = useState("");
  const [problemas, setProblemas] = useState("- ");
  const [tentou, setTentou] = useState(false);
  const [tentativas, setTentativas] = useState(0);
  const resumo = useRef<HTMLDivElement>(null);
  const [criada, setCriada] = useState<WizardState | null>(null);

  const problemasOk = problemas
    .split("\n")
    .map((p) => p.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
  const chars = acompanhamento.trim().length + problemasOk.join("").length;
  const erros = {
    titulo: !titulo.trim() && "Informe o título.",
    data: !data && "Informe uma data válida (dd/mm/aaaa).",
    acompanhamento: !acompanhamento.trim() && "Informe o acompanhamento.",
    problemas: !problemasOk.length && "Informe ao menos um problema.",
    chars:
      chars < MIN_CHARS &&
      `Descreva melhor a reunião: faltam ${MIN_CHARS - chars} caracteres (acompanhamento + problemas).`,
  };
  const ids: Record<keyof typeof erros, string> = {
    titulo: "titulo",
    data: "data",
    acompanhamento: "acompanhamento",
    problemas: "problemas",
    chars: "acompanhamento",
  };
  const invalido = Object.values(erros).some(Boolean);

  const gerar = useMutation({
    mutationFn: () =>
      post<Criada>(
        "/reunioes",
        {
          titulo: titulo.trim(),
          data,
          participantes,
          acompanhamento: acompanhamento.trim(),
          problemas: problemasOk,
        },
        { signal: AbortSignal.timeout(180_000) }, // LLM: 10–60 s
      ),
    onSuccess: (r) => {
      const s: WizardState = {
        reuniaoId: r.reuniao_id,
        ataPath: r.ata_path,
        ataMd: r.ata_md,
        sessaoId: null,
        grill: null,
        plano: null,
        issues: null,
        problemas: problemasOk,
      };
      saveWizard(s);
      setCriada(s);
    },
  });

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (invalido) setTentativas((n) => n + 1);
    if (invalido || gerar.isPending) return;
    const existente = loadWizard(reuniaoIdDe(data, titulo.trim()));
    if (
      existente &&
      (existente.grill || existente.plano) &&
      !confirm(
        "Esta reunião já tem grill ou plano. Gerar a ata de novo recomeça o fluxo. Continuar?",
      )
    )
      return;
    gerar.mutate();
  }

  function teclaProblemas(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    const t = e.currentTarget;
    setProblemas(
      problemas.slice(0, t.selectionStart) +
        "\n- " +
        problemas.slice(t.selectionEnd),
    );
  }
  const erro = (k: keyof typeof erros) => tentou && erros[k];
  useEffect(() => {
    if (tentativas) resumo.current?.focus();
  }, [tentativas]);
  const falhas = (Object.keys(erros) as (keyof typeof erros)[]).filter(
    (k) => k !== "chars" && erro(k),
  );

  if (criada)
    return (
      <div>
        <Stepper atual={0} />
        <h1 className="mb-4 text-2xl font-bold">Ata gerada</h1>
        <p
          role="status"
          className="mb-4 rounded-card bg-amarelo p-3 text-roxo-escuro"
        >
          Ata salva em <code>{criada.ataPath}</code>
        </p>
        <article className="ata rounded-card bg-superficie p-6 shadow-card">
          <Markdown>{semFrontmatter(criada.ataMd)}</Markdown>
        </article>
        <button
          onClick={() => navigate(`/reunioes/${criada.reuniaoId}/grill`)}
          className={`${btn} mt-6 bg-ambar font-semibold text-roxo-escuro`}
        >
          Continuar para o grill
        </button>
      </div>
    );

  return (
    <div>
      <Stepper atual={0} />
      <h1 className="mb-4 text-2xl font-bold">Nova reunião</h1>

      {andamento && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center gap-3 rounded-card bg-amarelo p-4 text-roxo-escuro"
        >
          <span className="flex-1">
            Há uma reunião em andamento: <strong>{andamento.reuniaoId}</strong>
          </span>
          <Link
            to={rotaAtual(andamento)}
            className={`${btn} bg-roxo text-white`}
          >
            Continuar reunião
          </Link>
          <button
            onClick={() => {
              clearWizard(andamento.reuniaoId);
              setAndamento(null);
            }}
            className={`${btn} border border-roxo-escuro`}
          >
            Começar outra
          </button>
        </div>
      )}

      <p className="mb-6 text-suave">
        Descreva o que foi discutido. A IA monta a ata e, em seguida, faz
        perguntas para fechar o plano de ação.{" "}
        <span aria-hidden className="text-erro">
          *
        </span>{" "}
        = obrigatório
      </p>

      <form
        onSubmit={enviar}
        noValidate
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
        aria-busy={gerar.isPending}
      >
        <div className="space-y-6">
          {falhas.length > 0 && (
            <div
              ref={resumo}
              tabIndex={-1}
              role="alert"
              className="rounded-card border-l-4 border-erro bg-erro/10 p-4"
            >
              <p className="font-semibold text-erro">
                ⚠ Corrija{" "}
                {falhas.length === 1
                  ? "o ponto abaixo"
                  : `os ${falhas.length} pontos abaixo`}{" "}
                para gerar a ata:
              </p>
              <ul className="mt-1 list-disc pl-5">
                {falhas.map((k) => (
                  <li key={k}>
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => document.getElementById(ids[k])?.focus()}
                    >
                      {erros[k]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <section className={cartao} aria-labelledby="s-dados">
            <h2 id="s-dados" className="text-lg font-semibold">
              1. Dados da reunião
            </h2>
            <div className="grid gap-5 sm:grid-cols-[1fr_11rem]">
              <div>
                <label htmlFor="titulo" className={rotuloCls}>
                  Título <Obrigatorio />
                </label>
                <input
                  id="titulo"
                  autoFocus
                  placeholder="Ex.: Retrospectiva da sprint 12"
                  className={campo(erro("titulo"))}
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  aria-describedby={erro("titulo") ? "e-titulo" : undefined}
                  aria-invalid={!!erro("titulo")}
                />
                <Erro id="e-titulo" msg={erro("titulo")} />
              </div>
              <div>
                <label htmlFor="data" className={rotuloCls}>
                  Data <Obrigatorio />
                </label>
                <input
                  id="data"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                  className={campo(erro("data"))}
                  value={dataBr}
                  onChange={(e) => setDataBr(mascaraData(e.target.value))}
                  aria-describedby={erro("data") ? "e-data" : undefined}
                  aria-invalid={!!erro("data")}
                />
                <Erro id="e-data" msg={erro("data")} />
              </div>
            </div>
            <div>
              <label htmlFor="participante" className={rotuloCls}>
                Participantes{" "}
                <span className="font-normal text-suave">(opcional)</span>
              </label>
              <MultiSelect
                id="participante"
                opcoes={(cfg.data?.membros ?? []).map((m) => m.nome)}
                valor={participantes}
                onChange={setParticipantes}
                placeholder="Selecione ou busque pelo nome"
              />
              <p className={dica}>
                Quem não está na lista: digite o nome e tecle Enter.
              </p>
            </div>
          </section>

          <section className={cartao} aria-labelledby="s-conteudo">
            <h2 id="s-conteudo" className="text-lg font-semibold">
              2. O que foi discutido
            </h2>
            <div>
              <label htmlFor="acompanhamento" className={rotuloCls}>
                Acompanhamento <Obrigatorio />
              </label>
              <textarea
                id="acompanhamento"
                rows={4}
                placeholder="Ex.: Das 5 ações da reunião anterior, 3 foram concluídas e 2 seguem em andamento…"
                className={campo(erro("acompanhamento"))}
                value={acompanhamento}
                onChange={(e) => setAcompanhamento(e.target.value)}
                aria-describedby={`d-acomp${erro("acompanhamento") ? " e-acomp" : ""}`}
                aria-invalid={!!erro("acompanhamento")}
              />
              <p id="d-acomp" className={dica}>
                Como andam os itens da última reunião.
              </p>
              <Erro id="e-acomp" msg={erro("acompanhamento")} />
            </div>
            <div>
              <label htmlFor="problemas" className={rotuloCls}>
                Problemas levantados <Obrigatorio />
              </label>
              <textarea
                id="problemas"
                rows={6}
                className={campo(erro("problemas"))}
                value={problemas}
                onChange={(e) => setProblemas(e.target.value)}
                onKeyDown={teclaProblemas}
                aria-describedby={`d-prob${erro("problemas") ? " e-prob" : ""}`}
                aria-invalid={!!erro("problemas")}
              />
              <div className="mt-1 flex flex-wrap justify-between gap-2">
                <p id="d-prob" className="text-xs text-suave">
                  Um por linha. Enter cria o próximo bullet; Shift+Enter
                  quebra a linha.
                </p>
                <span className="rounded-full bg-amarelo px-2 py-0.5 text-xs font-medium text-roxo-escuro">
                  {problemasOk.length}{" "}
                  {problemasOk.length === 1 ? "problema" : "problemas"}
                </span>
              </div>
              <Erro id="e-prob" msg={erro("problemas")} />
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <div
            ref={falhas.length ? undefined : resumo}
            tabIndex={-1}
            role={erro("chars") ? "alert" : undefined}
            className={cartao}
          >
            <h2 className="text-lg font-semibold">Antes de gerar</h2>
            <ul className="space-y-2 text-sm">
              {(
                [
                  ["titulo", "Título informado"],
                  ["data", "Data válida"],
                  ["acompanhamento", "Acompanhamento preenchido"],
                  ["problemas", "Ao menos 1 problema"],
                ] as const
              ).map(([k, t]) => {
                const ok = !erros[k];
                return (
                  <li
                    key={k}
                    className={`flex items-center gap-2 ${ok ? "text-sucesso" : erro(k) ? "font-medium text-erro" : "text-suave"}`}
                  >
                    <span aria-hidden className="w-4 text-center">
                      {ok ? "✓" : erro(k) ? "✕" : "○"}
                    </span>
                    {t}
                  </li>
                );
              })}
            </ul>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className={erro("chars") ? "font-medium text-erro" : ""}>
                  Texto da reunião
                </span>
                <span className="text-suave">
                  {chars} / {MIN_CHARS}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-borda"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={MIN_CHARS}
                aria-valuenow={Math.min(chars, MIN_CHARS)}
              >
                <div
                  className={`h-full transition-all ${chars >= MIN_CHARS ? "bg-sucesso" : erro("chars") ? "bg-erro" : "bg-roxo"}`}
                  style={{ width: `${Math.min(100, (chars / MIN_CHARS) * 100)}%` }}
                />
              </div>
              <p
                className={`mt-1 text-xs ${erro("chars") ? "text-erro" : "text-suave"}`}
              >
                {erro("chars")
                  ? erros.chars
                  : "Mínimo somando acompanhamento e problemas."}
              </p>
            </div>

            {gerar.isError && (
              <div
                role="alert"
                className="rounded-ctl border-l-4 border-erro bg-erro/10 p-3 text-sm"
              >
                <p className="font-semibold text-erro">
                  ⚠ Não foi possível gerar a ata
                </p>
                <p>{mensagemErro(gerar.error)}</p>
                {temDetalhe(gerar.error) && (
                  <details>
                    <summary>Detalhes técnicos</summary>
                    {gerar.error.detalhe}
                  </details>
                )}
              </div>
            )}
            {gerar.isPending && (
              <p role="status" className="text-sm">
                Gerando a ata… pode levar até um minuto.
              </p>
            )}

            <button
              type="submit"
              disabled={gerar.isPending}
              className={`${btn} w-full bg-ambar font-semibold text-roxo-escuro hover:brightness-95`}
            >
              {gerar.isPending ? "Gerando…" : "Gerar ata"}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
