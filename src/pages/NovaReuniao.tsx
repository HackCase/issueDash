import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Markdown from "react-markdown";
import { Link, useNavigate } from "react-router-dom";
import Stepper from "../components/Stepper";
import { mensagemErro, post, temDetalhe } from "../lib/api";
import {
  clearWizard,
  loadWizard,
  reuniaoIdDe,
  saveWizard,
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
  return /^\d{2}\/\d{2}\/\d{4}$/.test(br) && (Date.parse(iso) ? new Date(iso).toISOString() : "").startsWith(iso) ? iso : "";
};
const mascaraData = (v: string) =>
  v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{2})(\d)/, "$1/$2").replace(/^(\d{2}\/\d{2})(\d)/, "$1/$2");
const semFrontmatter = (md: string) => md.replace(/^---\n[\s\S]*?\n---\n*/, "");
const campo = (erro: unknown) =>
  `w-full rounded-ctl border bg-superficie px-3 py-2 ${erro ? 'border-erro ring-1 ring-erro' : 'border-borda'}`;
const Obrigatorio = () => (
  <span aria-hidden className="text-erro" title="Obrigatório">*</span>
);
const btn = "rounded-ctl px-4 py-2 disabled:opacity-60";

export default function NovaReuniao() {
  const navigate = useNavigate();
  const [andamento, setAndamento] = useState(wizardEmAndamento);
  const [titulo, setTitulo] = useState("");
  const [dataBr, setDataBr] = useState(() => paraBr(hoje()));
  const data = paraIso(dataBr);
  const [participantes, setParticipantes] = useState<string[]>([]);
  const [novoNome, setNovoNome] = useState("");
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

  function addNome() {
    const n = novoNome.trim();
    if (n && !participantes.includes(n))
      setParticipantes([...participantes, n]);
    setNovoNome("");
  }
  function teclaNome(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addNome();
    }
  }
  // Enter continua a lista com um novo bullet
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
  const falhas = (Object.keys(erros) as (keyof typeof erros)[]).filter((k) => k !== "chars" && erro(k));

  if (criada)
    return (
      <div className="max-w-3xl">
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
    <div className="max-w-3xl">
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

      <p className="mb-4 text-sm text-suave">
        <span aria-hidden className="text-erro">*</span> campo obrigatório
      </p>

      <form
        onSubmit={enviar}
        noValidate
        className="space-y-5"
        aria-busy={gerar.isPending}
      >
        {falhas.length > 0 && (
          <div
            ref={resumo}
            tabIndex={-1}
            role="alert"
            className="rounded-card border-l-4 border-erro bg-erro/10 p-4"
          >
            <p className="font-semibold text-erro">
              ⚠ Corrija {falhas.length === 1 ? "o ponto abaixo" : `os ${falhas.length} pontos abaixo`} para gerar a ata:
            </p>
            <ul className="mt-1 list-disc pl-5">
              {falhas.map((k) => (
                <li key={k}>
                  <button
                    type="button"
                    className="text-left underline"
                    onClick={() => document.getElementById(ids[k])?.focus()}
                  >
                    {erros[k]}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <label htmlFor="titulo" className="mb-1 block font-medium">
            Título <Obrigatorio />
          </label>
          <input
            id="titulo"
            className={campo(erro('titulo'))}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            aria-describedby={erro('titulo') ? 'e-titulo' : undefined}
            aria-invalid={!!erro("titulo")}
          />
          {erro("titulo") && (
            <p id="e-titulo" className="mt-1 text-sm font-medium text-erro">
              ⚠ {erro("titulo")}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="data" className="mb-1 block font-medium">
            Data <Obrigatorio />
          </label>
          <input
            id="data"
            inputMode="numeric"
            placeholder="dd/mm/aaaa"
            maxLength={10}
            className={campo(erro('data'))}
            value={dataBr}
            onChange={(e) => setDataBr(mascaraData(e.target.value))}
            aria-describedby={erro('data') ? 'e-data' : undefined}
            aria-invalid={!!erro("data")}
          />
          {erro("data") && (
            <p id="e-data" className="mt-1 text-sm font-medium text-erro">
              ⚠ {erro("data")}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="participante" className="mb-1 block font-medium">
            Participantes (opcional)
          </label>
          <input
            id="participante"
            className={campo(false)}
            value={novoNome}
            placeholder="Nome e Enter"
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={teclaNome}
            onBlur={addNome}
          />
          <ul className="mt-2 flex flex-wrap gap-2">
            {participantes.map((n) => (
              <li
                key={n}
                className="flex items-center gap-1 rounded-full bg-borda px-3 py-1 text-sm"
              >
                {n}
                <button
                  type="button"
                  aria-label={`Remover ${n}`}
                  onClick={() =>
                    setParticipantes(participantes.filter((x) => x !== n))
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label htmlFor="acompanhamento" className="mb-1 block font-medium">
            Acompanhamento <Obrigatorio />
          </label>
          <textarea
            id="acompanhamento"
            rows={4}
            className={campo(erro('acompanhamento'))}
            value={acompanhamento}
            onChange={(e) => setAcompanhamento(e.target.value)}
            aria-describedby={erro('acompanhamento') ? 'e-acomp' : undefined}
            aria-invalid={!!erro("acompanhamento")}
          />
          {erro("acompanhamento") && (
            <p id="e-acomp" className="mt-1 text-sm font-medium text-erro">
              ⚠ {erro("acompanhamento")}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="problemas" className="mb-1 block font-medium">
            Problemas (um por bullet) <Obrigatorio />
          </label>
          <textarea
            id="problemas"
            rows={6}
            className={campo(erro('problemas'))}
            value={problemas}
            onChange={(e) => setProblemas(e.target.value)}
            onKeyDown={teclaProblemas}
            aria-describedby={erro('problemas') ? 'e-prob' : undefined}
            aria-invalid={!!erro("problemas")}
          />
          {erro("problemas") && (
            <p id="e-prob" className="mt-1 text-sm font-medium text-erro">
              ⚠ {erro("problemas")}
            </p>
          )}
        </div>

        <div
          ref={falhas.length ? undefined : resumo}
          tabIndex={-1}
          role={erro("chars") ? "alert" : undefined}
          className={`flex items-center gap-3 rounded-card p-4 ${
            erro("chars")
              ? "border-l-4 border-erro bg-erro/10"
              : "bg-superficie shadow-card"
          }`}
        >
          <span aria-hidden className={`text-xl ${erro("chars") ? "text-erro" : "text-suave"}`}>
            {erro("chars") ? "⚠" : "✎"}
          </span>
          <div>
            <p className={`font-semibold ${erro("chars") ? "text-erro" : ""}`}>
              {chars} / {MIN_CHARS} caracteres
            </p>
            <p className="text-sm text-suave">
              {erro("chars") ? erros.chars : "Mínimo somando acompanhamento e problemas."}
            </p>
          </div>
        </div>

        {gerar.isError && (
          <div role="alert" className="rounded-card border-l-4 border-erro bg-erro/10 p-4">
            <p className="font-semibold text-erro">⚠ Não foi possível gerar a ata</p>
            <p>{mensagemErro(gerar.error)}</p>
            {temDetalhe(gerar.error) && (
              <details className="text-sm">
                <summary>Detalhes técnicos</summary>
                {gerar.error.detalhe}
              </details>
            )}
          </div>
        )}
        {gerar.isPending && (
          <p role="status">Gerando a ata… pode levar até um minuto.</p>
        )}

        <button
          type="submit"
          disabled={gerar.isPending}
          className={`${btn} bg-ambar font-semibold text-roxo-escuro`}
        >
          {gerar.isPending ? "Gerando…" : "Gerar ata"}
        </button>
      </form>
    </div>
  );
}
