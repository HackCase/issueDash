import type { PlanoAcao } from "./plano";

export type Pergunta = {
  id: string;
  problema_id: string | null;
  pergunta: string;
  recomendacao: string | null;
  resposta: string | null;
};
export type Rodada = { perguntas: Pergunta[] };
export type GrillSessao = {
  sessao_id: string;
  reuniao_id: string;
  rodadas: Rodada[];
  status: "em_andamento" | "concluida";
  max_rodadas: number;
};

export type IssueYaml = { acao_id: string; path: string; conteudo: string };

export type WizardState = {
  reuniaoId: string;
  ataPath: string;
  ataMd: string;
  sessaoId: string | null;
  grill: GrillSessao | null;
  plano: PlanoAcao | null;
  problemas?: string[];
  issues: IssueYaml[] | null;
};

const chave = (id: string) => `mega.wizard.${id}`;
const ULTIMA = "mega.wizard.ultima";

export function loadWizard(id: string): WizardState | null {
  try {
    const raw = localStorage.getItem(chave(id));
    if (!raw) return null;
    const w = JSON.parse(raw) as WizardState;
    if (w.grill && !w.grill.rodadas)
      return { ...w, grill: null, sessaoId: null };
    return w;
  } catch {
    return null;
  }
}

export function saveWizard(s: WizardState) {
  try {
    localStorage.setItem(chave(s.reuniaoId), JSON.stringify(s));
    localStorage.setItem(ULTIMA, s.reuniaoId);
  } catch {}
}

export function patchWizard(id: string, patch: Partial<WizardState>) {
  const atual = loadWizard(id);
  if (atual) saveWizard({ ...atual, ...patch });
}

export function clearWizard(id: string) {
  try {
    localStorage.removeItem(chave(id));
    if (localStorage.getItem(ULTIMA) === id) localStorage.removeItem(ULTIMA);
  } catch {

  }
}

export function wizardEmAndamento(): WizardState | null {
  try {
    const id = localStorage.getItem(ULTIMA);
    return id ? loadWizard(id) : null;
  } catch {
    return null;
  }
}

export const reuniaoIdDe = (data: string, titulo: string) =>
  `${data}-${titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;

export const rotaAtual = (s: WizardState) =>
  `/reunioes/${s.reuniaoId}/${s.issues ? "issues" : s.plano?.status === "aprovado" ? "issues" : s.plano ? "plano" : "grill"}`;

export const semFrontmatter = (md: string) =>
  md.replace(/^---\n[\s\S]*?\n---\n*/, "");
