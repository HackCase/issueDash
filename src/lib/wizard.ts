// Estado do wizard no localStorage (spec 6.1). Tudo em try/catch: o storage pode estar indisponível.
export type WizardState = {
  reuniaoId: string
  ataPath: string
  ataMd: string
  sessaoId: string | null
  // ponytail: tipados quando os passos 2-4 existirem (GrillSessao, PlanoAcao, issues)
  grill: unknown | null
  plano: unknown | null
  issues: unknown | null
}

const chave = (id: string) => `mega.wizard.${id}`
const ULTIMA = 'mega.wizard.ultima'

export function loadWizard(id: string): WizardState | null {
  try {
    const raw = localStorage.getItem(chave(id))
    return raw ? (JSON.parse(raw) as WizardState) : null
  } catch {
    return null
  }
}

export function saveWizard(s: WizardState) {
  try {
    localStorage.setItem(chave(s.reuniaoId), JSON.stringify(s))
    localStorage.setItem(ULTIMA, s.reuniaoId)
  } catch {
    /* sem storage: o wizard segue sem retomada */
  }
}

export function clearWizard(id: string) {
  try {
    localStorage.removeItem(chave(id))
    if (localStorage.getItem(ULTIMA) === id) localStorage.removeItem(ULTIMA)
  } catch {
    /* idem */
  }
}

export function wizardEmAndamento(): WizardState | null {
  try {
    const id = localStorage.getItem(ULTIMA)
    return id ? loadWizard(id) : null
  } catch {
    return null
  }
}

/** Mesma regra do backend: data + título minúsculo, sem acento, com hífens. */
export const reuniaoIdDe = (data: string, titulo: string) =>
  `${data}-${titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
