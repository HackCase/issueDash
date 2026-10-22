import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export type Resumo = { abertas: number; fechadas: number; abertas_90d: number };
export type Resolucao = {
  semana: string;
  fechadas: number;
  mediana_h: number | null;
  p90_h: number | null;
};
export type Vazao = { semana: string; abertas: number; fechadas: number };
export type PorLabel = { label: string; total: number };
export type Faixa = { faixa: string; total: number };
export type Revisao = {
  semana: string;
  primeira_review_h: number | null;
  ate_merge_h: number | null;
};
export type TaxaMerge = {
  merged: number;
  fechados_sem_merge: number;
  abertos: number;
};

export const FAIXAS_BACKLOG = [
  "0-7 dias",
  "8-30 dias",
  "31-90 dias",
  "90+ dias",
];
export const FAIXAS_PR = [
  "P (até 50)",
  "M (51-250)",
  "G (251-1000)",
  "GG (1000+)",
];

export function useMetric<T>(path: string, days?: number) {
  const url = days ? `${path}?days=${days}` : path;
  return useQuery({
    queryKey: ["metric", url],
    queryFn: () => api<T>(url),
    retry: false,
  });
}

const SEMANA = 7 * 864e5;

export function semanas<T extends { semana: string }>(
  rows: T[],
  vazio: Omit<T, "semana">,
) {
  if (!rows.length) return [];
  const por = new Map(rows.map((r) => [Date.parse(r.semana), r]));
  const ts = [...por.keys()];
  const out: (T & { sem: string })[] = [];
  for (let t = Math.min(...ts); t <= Math.max(...ts); t += SEMANA) {
    const iso = new Date(t).toISOString();
    out.push({
      ...(por.get(t) ?? ({ semana: iso, ...vazio } as T)),
      sem: `${iso.slice(8, 10)}/${iso.slice(5, 7)}`,
    });
  }
  return out;
}

export const faixas = (rows: Faixa[], ordem: string[]) =>
  ordem.map((faixa) => ({
    faixa,
    total: rows.find((r) => r.faixa === faixa)?.total ?? 0,
  }));

export const fmtH = (h: number | null | undefined) =>
  h == null
    ? "—"
    : h > 48
      ? `${Math.round(h)} h (${Math.round(h / 24)} d)`
      : `${Math.round(h * 10) / 10} h`;
