import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import NaoExiste from "../components/NaoExiste";
import Stepper from "../components/Stepper";
import { ApiError, mensagemErro, post } from "../lib/api";
import {
  clearWizard,
  loadWizard,
  patchWizard,
  type GrillSessao,
  type Pergunta,
} from "../lib/wizard";

const btn = "rounded-ctl px-4 py-2 disabled:opacity-60";
const LLM = () => ({ signal: AbortSignal.timeout(180_000) });
type Corpo = {
  respostas?: { id: string; resposta: string }[];
  aceitar_recomendacoes?: boolean;
};

function Formulario({
  perguntas,
  problemas,
  pendente,
  erro,
  onEnviar,
}: {
  perguntas: Pergunta[];
  problemas: string[];
  pendente: boolean;
  erro: unknown;
  onEnviar: (c: Corpo) => void;
}) {
  const [txt, setTxt] = useState<Record<string, string>>({});
  const resp = (p: Pergunta) => (txt[p.id] ?? "").trim();
  const digitadas = perguntas
    .filter(resp)
    .map((p) => ({ id: p.id, resposta: resp(p) }));
  const completo = digitadas.length === perguntas.length;
  const todasAceitaveis = perguntas.every((p) => resp(p) || p.recomendacao);

  const grupos = new Map<string, Pergunta[]>();
  for (const p of perguntas)
    grupos.set(p.problema_id ?? "", [
      ...(grupos.get(p.problema_id ?? "") ?? []),
      p,
    ]);

  const respondidas = digitadas.length;
  let n = 0;

  return (
    <div aria-busy={pendente} className="space-y-6">
      <div className="rounded-card bg-superficie p-4 shadow-card">
        <p>
          Responda as <strong>{perguntas.length} perguntas</strong> abaixo.
          Quando concordar com a IA, use <strong>Usar sugestão</strong> e ajuste
          o texto se quiser.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-borda"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={perguntas.length}
            aria-valuenow={respondidas}
          >
            <div
              className="h-full bg-roxo transition-all"
              style={{ width: `${(respondidas / perguntas.length) * 100}%` }}
            />
          </div>
          <span className="text-sm text-suave">
            {respondidas}/{perguntas.length}
          </span>
        </div>
      </div>

      {[...grupos].map(([pid, ps]) => (
        <section key={pid} aria-labelledby={`g-${pid}`} className="space-y-3">
          <div className="rounded-card bg-roxo-escuro p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-amarelo">
              {pid ? `Problema ${pid.slice(1)}` : "Perguntas gerais"}
            </p>
            <h2
              id={`g-${pid}`}
              className="!text-white mt-0.5 text-base font-medium"
            >
              {pid
                ? (problemas[Number(pid.slice(1)) - 1] ?? "")
                : "Sobre a reunião como um todo"}
            </h2>
          </div>
          {ps.map((p) => {
            const feita = !!resp(p);
            n++;
            return (
              <div
                key={p.id}
                className={`rounded-card border-l-4 bg-superficie p-4 shadow-card ${feita ? "border-sucesso" : "border-ambar"}`}
              >
                <div className="flex gap-3">
                  <span
                    aria-hidden
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${feita ? "bg-sucesso text-white" : "bg-borda"}`}
                  >
                    {feita ? "✓" : n}
                  </span>
                  <label
                    htmlFor={p.id}
                    className="flex-1 text-base font-medium"
                  >
                    {p.pergunta}
                  </label>
                </div>
                {p.recomendacao && (
                  <div className="ml-10 mt-3 flex flex-wrap items-center gap-3 rounded-ctl border border-amarelo bg-amarelo/30 p-3">
                    <p className="min-w-0 flex-1 text-sm">
                      <span aria-hidden>💡 </span>
                      <strong>Sugestão da IA:</strong> {p.recomendacao}
                    </p>
                    <button
                      type="button"
                      disabled={pendente || txt[p.id] === p.recomendacao}
                      onClick={() =>
                        setTxt({ ...txt, [p.id]: p.recomendacao ?? "" })
                      }
                      className="rounded-ctl border border-roxo-escuro bg-superficie px-3 py-1 text-sm font-medium disabled:opacity-50"
                    >
                      Usar sugestão
                    </button>
                  </div>
                )}
                <textarea
                  id={p.id}
                  rows={3}
                  value={txt[p.id] ?? ""}
                  disabled={pendente}
                  placeholder="Sua resposta…"
                  onChange={(e) => setTxt({ ...txt, [p.id]: e.target.value })}
                  className="ml-10 mt-3 block w-[calc(100%-2.5rem)] rounded-ctl border border-borda px-3 py-2"
                />
              </div>
            );
          })}
        </section>
      ))}

      {!!erro && (
        <div
          role="alert"
          className="rounded-card border-l-4 border-erro bg-erro/10 p-4"
        >
          <p className="font-semibold text-erro">
            ⚠ Não foi possível enviar as respostas
          </p>
          <p>{mensagemErro(erro)}</p>
          <p className="text-sm text-suave">O que você digitou foi mantido.</p>
        </div>
      )}
      {pendente && (
        <p role="status">Enviando… a IA pode levar até um minuto.</p>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-borda bg-superficie/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={pendente || !completo}
            onClick={() => onEnviar({ respostas: digitadas })}
            className={`${btn} bg-roxo font-semibold text-white`}
          >
            Enviar respostas
          </button>
          <button
            disabled={pendente || !todasAceitaveis}
            onClick={() =>
              setTxt(
                Object.fromEntries(
                  perguntas.map((p) => [p.id, resp(p) || p.recomendacao || ""]),
                ),
              )
            }
            className={`${btn} border border-roxo text-roxo`}
          >
            Aceitar todas as sugestões
          </button>
          {!completo && (
            <span className="text-sm text-suave">
              Faltam {perguntas.length - respondidas} para enviar
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Grill() {
  const { reuniaoId = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const chave = ["grill", reuniaoId];
  const titulo = useRef<HTMLHeadingElement>(null);
  const respondeu = useRef(false);
  const wiz = loadWizard(reuniaoId);

  const sessao = useQuery({
    queryKey: chave,
    queryFn: () =>
      post<GrillSessao>(`/reunioes/${reuniaoId}/grill`, undefined, LLM()),
    enabled: !!wiz,
    retry: false,
    staleTime: Infinity,
  });
  const s = sessao.data;

  useEffect(() => {
    if (s) patchWizard(reuniaoId, { sessaoId: s.sessao_id, grill: s });
  }, [s, reuniaoId]);

  const responder = useMutation({
    mutationFn: (corpo: Corpo) =>
      post<GrillSessao>(`/grill/${s?.sessao_id}/respostas`, corpo, LLM()),
    onSuccess: (nova) => {
      qc.setQueryData(chave, nova);
      respondeu.current = true;
    },

    onError: (e) => {
      if (e instanceof ApiError && e.erro === "grill_concluido")
        sessao.refetch();
    },
  });

  useEffect(() => {
    if (respondeu.current) {
      respondeu.current = false;
      titulo.current?.focus();
    }
  }, [s?.rodadas.length, s?.status]);

  function recomecar() {
    clearWizard(reuniaoId);
    navigate("/reunioes/nova");
  }

  const naoExiste =
    !wiz ||
    [sessao.error, responder.error].some(
      (e) => e instanceof ApiError && e.status === 404,
    );
  const concluida = s?.status === "concluida";
  const abertas = s?.rodadas.at(-1)?.perguntas ?? [];
  const historico = (concluida ? s?.rodadas : s?.rodadas.slice(0, -1)) ?? [];

  let corpo;
  if (naoExiste) corpo = <NaoExiste onRecomecar={recomecar} />;
  else if (sessao.isPending)
    corpo = (
      <p role="status">Preparando as perguntas… pode levar até um minuto.</p>
    );
  else if (sessao.error)
    corpo = (
      <div role="alert">
        <p className="text-erro">{mensagemErro(sessao.error)}</p>
        <button
          onClick={() => sessao.refetch()}
          className={`${btn} mt-3 bg-roxo text-white`}
        >
          Tentar de novo
        </button>
      </div>
    );
  else if (s)
    corpo = (
      <>
        {!concluida && (
          <p className="mb-4 text-sm text-suave">
            Rodada {s.rodadas.length} de até {s.max_rodadas}
          </p>
        )}

        {historico.length > 0 && (
          <div className="mb-6 space-y-3">
            {historico.map((r, i) => (
              <details
                key={i}
                className="rounded-card bg-superficie p-4 shadow-card"
              >
                <summary className="cursor-pointer font-medium">
                  Rodada {i + 1} (respondida)
                </summary>
                <ul className="mt-3 space-y-3">
                  {r.perguntas.map((p) => (
                    <li key={p.id}>
                      <p className="font-medium">{p.pergunta}</p>
                      <p className="text-suave">
                        <span className="sr-only">Resposta: </span>
                        {p.resposta}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}

        {concluida ? (
          <div
            role="status"
            className="rounded-card bg-superficie p-4 shadow-card"
          >
            <p className="mb-3 font-semibold text-sucesso">
              ✓ Entrevista concluída
            </p>
            <button
              onClick={() => navigate(`/reunioes/${reuniaoId}/plano`)}
              className={`${btn} bg-ambar font-semibold text-roxo-escuro`}
            >
              Gerar plano de ação
            </button>
          </div>
        ) : (
          <Formulario
            key={s.rodadas.length}
            perguntas={abertas}
            problemas={wiz?.problemas ?? []}
            pendente={responder.isPending}
            erro={responder.error}
            onEnviar={(c) => responder.mutate(c)}
          />
        )}
      </>
    );

  return (
    <div>
      <Stepper atual={1} reuniaoId={reuniaoId} />
      <h1 ref={titulo} tabIndex={-1} className="mb-1 text-2xl font-bold">
        Grill-me
      </h1>
      <p className="mb-4 text-suave">
        A IA faz perguntas, todas de uma vez, para tirar ambiguidades antes do
        plano.{" "}
        <Link to="/reunioes/nova" className="underline">
          Voltar à ata
        </Link>
      </p>
      <div aria-busy={sessao.isPending}>{corpo}</div>
    </div>
  );
}
