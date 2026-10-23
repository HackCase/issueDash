import { useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { nomeLabel } from "../lib/plano";
import ChartCard from "../components/ChartCard";
import { ApiError } from "../lib/api";
import {
  FAIXAS_BACKLOG,
  faixas,
  fmtH,
  semanas,
  useMetric,
  type Faixa,
  type PorLabel,
  type Resolucao,
  type Resumo,
  type Vazao,
} from "../lib/metrics";

const ROXO = "#5608A8",
  AMBAR = "#FFB81C",
  ESCURO = "#350053",
  IDADE = ["#2E7D32", "#FFDE59", "#EF6C00", "#C62828"],
  GRADE = "#E4D9F0",
  EIXO = "#6B5A7D";
const eixo = { stroke: EIXO, fontSize: 12 };
const hLabel = {
  value: "horas",
  angle: -90,
  position: "insideLeft" as const,
  fill: EIXO,
  fontSize: 12,
};
const nLabel = {
  value: "quantidade",
  angle: -90,
  position: "insideLeft" as const,
  fill: EIXO,
  fontSize: 12,
};
const horas = (v: unknown) => fmtH(v as number | null);

function Kpi({
  titulo,
  sub,
  valor,
  destaque,
}: {
  titulo: string;
  sub: string;
  valor: ReactNode;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-card p-4 shadow-card ${destaque ? "bg-ambar text-roxo-escuro" : "bg-superficie"}`}
    >
      <p className="text-sm font-medium">{titulo}</p>
      <p className="font-titulo text-3xl font-bold">{valor}</p>
      <p className={`text-xs ${destaque ? "" : "text-suave"}`}>{sub}</p>
    </div>
  );
}

export default function Dashboard() {
  const [days, setDays] = useState(90);
  const resumo = useMetric<Resumo>("/issues/summary");
  const resolucao = useMetric<Resolucao[]>("/issues/resolution-time", days);
  const vazao = useMetric<Vazao[]>("/issues/throughput", days);
  const porLabel = useMetric<PorLabel[]>("/issues/by-label");
  const backlog = useMetric<Faixa[]>("/issues/backlog-aging");

  const todas = [resumo, resolucao, vazao, porLabel, backlog];
  const comErro = todas.filter((q) => q.isError && !(q.error instanceof ApiError && q.error.erro === "sem_banco"));
  const semBanco = todas.some((q) => q.error instanceof ApiError && q.error.erro === "sem_banco");

  const g1 = semanas(resolucao.data ?? [], {
    fechadas: 0,
    mediana_h: null,
    p90_h: null,
  });
  const g2 = semanas(vazao.data ?? [], { abertas: 0, fechadas: 0 });
  const g4 = faixas(backlog.data ?? [], FAIXAS_BACKLOG);

  const grade = <CartesianGrid stroke={GRADE} vertical={false} />;

  return (
    <div className="flex flex-col gap-4 lg:min-h-[calc(100vh-108px)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div role="group" aria-label="Período" className="flex items-center gap-2 text-sm">
          <span className="font-medium">Período:</span>
          <div className="flex overflow-hidden rounded-ctl border border-roxo">
            {[30, 90, 180, 365].map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={days === d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 font-medium ${days === d ? "bg-roxo text-white" : "bg-superficie text-roxo hover:bg-roxo/10"}`}
              >
                {d} dias
              </button>
            ))}
          </div>
        </div>
      </div>

      {comErro.length > 0 && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-card border-l-4 border-erro bg-erro/10 p-4"
        >
          <span aria-hidden className="text-xl text-erro">⚠</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-erro">Erro ao comunicar com a API</p>
            <p className="text-sm">
              {comErro.length === todas.length
                ? "Nenhuma métrica foi carregada."
                : `${comErro.length} de ${todas.length} métricas não foram carregadas.`}
            </p>
          </div>
          <button
            onClick={() => comErro.forEach((q) => q.refetch())}
            className="rounded-ctl bg-erro px-4 py-2 font-semibold text-white"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {semBanco && (
        <p
          role="alert"
          className="rounded-card bg-amarelo p-4 text-roxo-escuro"
        >
          Métricas indisponíveis: o banco de dados não está configurado.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi titulo="Issues abertas" sub="Total de issues ainda em aberto agora." valor={resumo.data?.abertas ?? ""} />
        <Kpi titulo="Issues fechadas" sub="Total de issues já concluídas desde o início da coleta." valor={resumo.data?.fechadas ?? ""} />
        <Kpi
          titulo="Abertas há mais de 90 dias"
          sub="Issues abertas paradas há mais de 3 meses: sinal de backlog esquecido."
          valor={resumo.data?.abertas_90d ?? ""}
          destaque={(resumo.data?.abertas_90d ?? 0) > 0}
        />
      </div>

      <div className="grid gap-4 lg:flex-1 lg:grid-cols-2 lg:grid-rows-2">
        <ChartCard
          titulo="Tempo de resolução de issues"
          subtitulo="Quanto tempo uma issue leva do abrir ao fechar, por semana. Mediana = caso típico (metade fecha mais rápido); P90 = os casos lentos (9 em cada 10 fecham antes disso)."
          query={resolucao}
          vazio={!g1.length}
          tabela={{
            cabecalho: ["Semana", "Fechadas", "Mediana", "P90"],
            linhas: g1.map((r) => [
              r.sem,
              r.fechadas,
              fmtH(r.mediana_h),
              fmtH(r.p90_h),
            ]),
          }}
        >
          <ResponsiveContainer>
            <LineChart data={g1}>
              {grade}
              <XAxis dataKey="sem" {...eixo} />
              <YAxis {...eixo} label={hLabel} />
              <Tooltip
                formatter={horas}
                labelFormatter={(l, p) =>
                  `Semana de ${l} · ${p[0]?.payload.fechadas ?? 0} fechadas`
                }
              />
              <Legend />
              <Line
                dataKey="mediana_h"
                name="Mediana"
                stroke={ROXO}
                strokeWidth={2}
              />
              <Line dataKey="p90_h" name="P90" stroke={AMBAR} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          titulo="Vazão semanal"
          subtitulo="Issues abertas × fechadas por semana. Se abrem mais do que fecham, o backlog cresce."
          query={vazao}
          vazio={!g2.length}
          tabela={{
            cabecalho: ["Semana", "Abertas", "Fechadas"],
            linhas: g2.map((r) => [r.sem, r.abertas, r.fechadas]),
          }}
        >
          <ResponsiveContainer>
            <BarChart data={g2}>
              {grade}
              <XAxis dataKey="sem" {...eixo} />
              <YAxis allowDecimals={false} {...eixo} label={nLabel} />
              <Tooltip />
              <Legend />
              <Bar dataKey="abertas" name="Abertas" fill={ROXO} />
              <Bar dataKey="fechadas" name="Fechadas" fill={AMBAR} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          titulo="Issues por label"
          subtitulo="Quantas issues abertas há em cada label (tipo, diretoria etc.), para ver onde o trabalho se concentra."
          query={porLabel}
          vazio={!porLabel.data?.length}
          tabela={{
            cabecalho: ["Label", "Total"],
            linhas: (porLabel.data ?? []).map((r) => [r.label, r.total]),
          }}
        >
          <ResponsiveContainer>
            <BarChart
              data={(porLabel.data ?? []).map((r) => ({ ...r, nome: nomeLabel(r.label) }))}
              layout="vertical"
              margin={{ left: 0, right: 32 }}
              barCategoryGap="25%"
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="nome"
                width={110}
                interval={0}
                tickLine={false}
                axisLine={false}
                {...eixo}
                fontSize={13}
              />
              <Tooltip cursor={{ fill: GRADE, opacity: 0.4 }} />
              <Bar dataKey="total" name="Issues" fill={ROXO} radius={[0, 6, 6, 0]}>
                <LabelList dataKey="total" position="right" fill={ESCURO} fontSize={13} fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          titulo="Envelhecimento do backlog"
          subtitulo="Issues abertas agrupadas por idade. Quanto mais quente a cor, mais velha a issue: a faixa 90+ dias (vermelha) é a mais esquecida."
          query={backlog}
          vazio={!backlog.data?.length}
          tabela={{
            cabecalho: ["Faixa", "Total"],
            linhas: g4.map((r) => [r.faixa, r.total]),
          }}
        >
          <ResponsiveContainer>
            <BarChart data={g4} margin={{ top: 20 }} barCategoryGap="20%">
              {grade}
              <XAxis dataKey="faixa" tickLine={false} {...eixo} fontSize={13} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} {...eixo} />
              <Tooltip cursor={{ fill: GRADE, opacity: 0.4 }} />
              <Bar dataKey="total" name="Issues" radius={[6, 6, 0, 0]}>
                {g4.map((r, i) => (
                  <Cell key={r.faixa} fill={IDADE[i]} />
                ))}
                <LabelList dataKey="total" position="top" fill={ESCURO} fontSize={13} fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
