import { useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "../components/ChartCard";
import { ApiError } from "../lib/api";
import {
  FAIXAS_BACKLOG,
  FAIXAS_PR,
  faixas,
  fmtH,
  semanas,
  useMetric,
  type Faixa,
  type PorLabel,
  type Resolucao,
  type Resumo,
  type Revisao,
  type TaxaMerge,
  type Vazao,
} from "../lib/metrics";

const ROXO = "#5608A8",
  AMBAR = "#FFB81C",
  ESCURO = "#350053",
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
  valor,
  destaque,
}: {
  titulo: string;
  valor: ReactNode;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-card p-4 shadow-card ${destaque ? "bg-ambar text-roxo-escuro" : "bg-superficie"}`}
    >
      <p className={`text-sm ${destaque ? "" : "text-suave"}`}>{titulo}</p>
      <p className="font-titulo text-3xl font-bold">{valor}</p>
    </div>
  );
}

export default function Dashboard() {
  const [days, setDays] = useState(90);
  const resumo = useMetric<Resumo>("/issues/summary");
  const merge = useMetric<TaxaMerge>("/pulls/merge-rate");
  const resolucao = useMetric<Resolucao[]>("/issues/resolution-time", days);
  const vazao = useMetric<Vazao[]>("/issues/throughput", days);
  const porLabel = useMetric<PorLabel[]>("/issues/by-label");
  const backlog = useMetric<Faixa[]>("/issues/backlog-aging");
  const revisao = useMetric<Revisao[]>("/pulls/review-time", days);
  const tamanho = useMetric<Faixa[]>("/pulls/size-distribution");

  const semBanco = [
    resumo,
    merge,
    resolucao,
    vazao,
    porLabel,
    backlog,
    revisao,
    tamanho,
  ].some((q) => q.error instanceof ApiError && q.error.erro === "sem_banco");

  const g1 = semanas(resolucao.data ?? [], {
    fechadas: 0,
    mediana_h: null,
    p90_h: null,
  });
  const g2 = semanas(vazao.data ?? [], { abertas: 0, fechadas: 0 });
  const g4 = faixas(backlog.data ?? [], FAIXAS_BACKLOG);
  const g5 = semanas(revisao.data ?? [], {
    primeira_review_h: null,
    ate_merge_h: null,
  });
  const g6 = faixas(tamanho.data ?? [], FAIXAS_PR);
  const m = merge.data;
  const decididos = m ? m.merged + m.fechados_sem_merge : 0;
  const taxa = m && decididos ? Math.round((m.merged / decididos) * 100) : null;
  const g7 = m
    ? [
        { nome: "Mergeados", total: m.merged, cor: ROXO },
        { nome: "Fechados sem merge", total: m.fechados_sem_merge, cor: AMBAR },
        { nome: "Abertos", total: m.abertos, cor: ESCURO },
      ]
    : [];

  const grade = <CartesianGrid stroke={GRADE} vertical={false} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <label className="flex items-center gap-2 text-sm">
          Período
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-ctl border border-borda bg-superficie px-3 py-2"
          >
            {[30, 90, 180, 365].map((d) => (
              <option key={d} value={d}>
                {d} dias
              </option>
            ))}
          </select>
        </label>
      </div>

      {semBanco && (
        <p
          role="alert"
          className="rounded-card bg-amarelo p-4 text-roxo-escuro"
        >
          Métricas indisponíveis: o banco de dados não está configurado.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi titulo="Issues abertas" valor={resumo.data?.abertas ?? ""} />
        <Kpi titulo="Issues fechadas" valor={resumo.data?.fechadas ?? ""} />
        <Kpi
          titulo="Abertas há mais de 90 dias"
          valor={resumo.data?.abertas_90d ?? ""}
          destaque={(resumo.data?.abertas_90d ?? 0) > 0}
        />
        <Kpi titulo="PRs mergeados" valor={m?.merged ?? ""} />
        <Kpi titulo="Taxa de merge" valor={taxa == null ? "" : `${taxa}%`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ChartCard
          titulo="Tempo de resolução de issues"
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
          query={porLabel}
          vazio={!porLabel.data?.length}
          className="md:col-span-2 xl:col-span-1"
          tabela={{
            cabecalho: ["Label", "Total"],
            linhas: (porLabel.data ?? []).map((r) => [r.label, r.total]),
          }}
        >
          <ResponsiveContainer>
            <BarChart
              data={porLabel.data}
              layout="vertical"
              margin={{ left: 8 }}
            >
              <CartesianGrid stroke={GRADE} horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                {...eixo}
                label={{
                  value: "issues",
                  position: "insideBottom",
                  fill: EIXO,
                  fontSize: 12,
                }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={200}
                interval={0}
                {...eixo}
              />
              <Tooltip />
              <Bar dataKey="total" name="Issues" fill={ROXO} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          titulo="Envelhecimento do backlog"
          query={backlog}
          vazio={!backlog.data?.length}
          tabela={{
            cabecalho: ["Faixa", "Total"],
            linhas: g4.map((r) => [r.faixa, r.total]),
          }}
        >
          <ResponsiveContainer>
            <BarChart data={g4}>
              {grade}
              <XAxis dataKey="faixa" {...eixo} />
              <YAxis allowDecimals={false} {...eixo} label={nLabel} />
              <Tooltip />
              <Bar dataKey="total" name="Issues">
                {g4.map((r) => (
                  <Cell
                    key={r.faixa}
                    fill={r.faixa === "90+ dias" ? AMBAR : ROXO}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          titulo="Tempo de revisão e de merge de PR"
          query={revisao}
          vazio={!g5.length}
          tabela={{
            cabecalho: ["Semana", "1ª review", "Até o merge"],
            linhas: g5.map((r) => [
              r.sem,
              fmtH(r.primeira_review_h),
              fmtH(r.ate_merge_h),
            ]),
          }}
        >
          <ResponsiveContainer>
            <LineChart data={g5}>
              {grade}
              <XAxis dataKey="sem" {...eixo} />
              <YAxis {...eixo} label={hLabel} />
              <Tooltip
                formatter={horas}
                labelFormatter={(l) => `Semana de ${l}`}
              />
              <Legend />
              <Line
                dataKey="primeira_review_h"
                name="1ª review"
                stroke={ROXO}
                strokeWidth={2}
              />
              <Line
                dataKey="ate_merge_h"
                name="Até o merge"
                stroke={AMBAR}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          titulo="Tamanho dos PRs mergeados"
          query={tamanho}
          vazio={!tamanho.data?.length}
          tabela={{
            cabecalho: ["Faixa", "Total"],
            linhas: g6.map((r) => [r.faixa, r.total]),
          }}
        >
          <ResponsiveContainer>
            <BarChart data={g6}>
              {grade}
              <XAxis dataKey="faixa" {...eixo} />
              <YAxis allowDecimals={false} {...eixo} label={nLabel} />
              <Tooltip />
              <Bar dataKey="total" name="PRs" fill={ROXO} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          titulo="Destino dos PRs"
          query={merge}
          vazio={!m || m.merged + m.fechados_sem_merge + m.abertos === 0}
          tabela={{
            cabecalho: ["Destino", "Total"],
            linhas: g7.map((r) => [r.nome, r.total]),
          }}
        >
          <div className="relative size-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={g7}
                  dataKey="total"
                  nameKey="nome"
                  innerRadius="55%"
                  outerRadius="80%"
                >
                  {g7.map((r) => (
                    <Cell key={r.nome} fill={r.cor} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <p className="pointer-events-none absolute inset-x-0 top-[40%] text-center font-titulo text-2xl font-bold text-roxo-escuro">
              {taxa == null ? "" : `${taxa}%`}
            </p>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
