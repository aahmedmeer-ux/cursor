import type { MatrixRow, SurveyEquation } from "./types";

/**
 * Domain-aware analytical foundations for survey drafts.
 * Equations are illustrative templates grounded in common formulations
 * for the detected topic family — authors should verify notation against sources.
 */
export function generateEquations(topic: string, rows: MatrixRow[]): SurveyEquation[] {
  const hay = `${topic} ${rows
    .slice(0, 8)
    .map((r) => `${r.title} ${r.method} ${r.themes} ${r.keywords}`)
    .join(" ")}`.toLowerCase();

  const eqs: SurveyEquation[] = [];

  if (/uav|drone|swarm|multi-?agent|formation|flock/.test(hay)) {
    eqs.push(
      {
        id: "eq-distance",
        number: 1,
        label: "Inter-agent separation",
        latex: "d_{ij}(t) = \\lVert \\mathbf{p}_i(t) - \\mathbf{p}_j(t) \\rVert_2",
        plaintext: "d_ij(t) = || p_i(t) − p_j(t) ||_2",
        description:
          "Euclidean separation between agents i and j at time t, a primitive for collision avoidance and formation maintenance.",
        sectionId: "background",
      },
      {
        id: "eq-pso",
        number: 2,
        label: "PSO velocity update",
        latex:
          "\\mathbf{v}_i^{k+1} = w\\mathbf{v}_i^{k} + c_1 r_1 (\\mathbf{pbest}_i - \\mathbf{x}_i^{k}) + c_2 r_2 (\\mathbf{gbest} - \\mathbf{x}_i^{k})",
        plaintext:
          "v_i^(k+1) = w v_i^(k) + c1 r1 (pbest_i − x_i^(k)) + c2 r2 (gbest − x_i^(k))",
        description:
          "Canonical particle-swarm velocity update used by several matrix studies for path planning and task allocation.",
        sectionId: "taxonomy",
      },
      {
        id: "eq-coverage",
        number: 3,
        label: "Coverage objective",
        latex: "J_{cov} = \\frac{1}{|\\mathcal{A}|}\\int_{\\mathcal{A}} \\mathbf{1}\\!\\left(\\min_i \\lVert q - \\mathbf{p}_i\\rVert \\le R_s\\right) dq",
        plaintext: "J_cov = (1/|A|) ∫_A 1( min_i ||q − p_i|| ≤ R_s ) dq",
        description:
          "Area coverage ratio under sensing radius R_s; recurring evaluation metric in swarm deployment studies.",
        sectionId: "comparison",
      }
    );
  } else if (/transformer|attention|language|llm|nlp|bert/.test(hay)) {
    eqs.push(
      {
        id: "eq-attention",
        number: 1,
        label: "Scaled dot-product attention",
        latex: "\\mathrm{Attention}(Q,K,V) = \\mathrm{softmax}\\!\\left(\\frac{QK^{\\top}}{\\sqrt{d_k}}\\right)V",
        plaintext: "Attention(Q, K, V) = softmax(Q K^T / √d_k) V",
        description: "Core attention operator underlying many sequence-modeling studies in the matrix.",
        sectionId: "background",
      },
      {
        id: "eq-nll",
        number: 2,
        label: "Autoregressive training objective",
        latex: "\\mathcal{L}_{LM} = -\\sum_{t=1}^{T} \\log p_\\theta(x_t \\mid x_{<t})",
        plaintext: "L_LM = − Σ_{t=1..T} log p_θ(x_t | x_<t)",
        description: "Negative log-likelihood used to train next-token predictors surveyed in this review.",
        sectionId: "comparison",
      }
    );
  } else if (/deep|neural|learning|cnn|reinforcement|rl\b/.test(hay)) {
    eqs.push(
      {
        id: "eq-risk",
        number: 1,
        label: "Empirical risk",
        latex: "\\hat{\\mathcal{R}}(f) = \\frac{1}{N}\\sum_{n=1}^{N} \\ell\\big(f(x_n), y_n\\big)",
        plaintext: "R̂(f) = (1/N) Σ_{n=1..N} ℓ(f(x_n), y_n)",
        description: "Supervised learning objective common across the surveyed learning systems.",
        sectionId: "background",
      },
      {
        id: "eq-bellman",
        number: 2,
        label: "Bellman optimality (when RL appears)",
        latex: "Q^*(s,a) = \\mathbb{E}\\big[r + \\gamma \\max_{a'} Q^*(s',a') \\,\\big|\\, s,a\\big]",
        plaintext: "Q*(s,a) = E[ r + γ max_{a'} Q*(s',a') | s,a ]",
        description: "Optimal action-value recursion referenced by reinforcement-learning entries in the matrix.",
        sectionId: "taxonomy",
      }
    );
  } else {
    eqs.push(
      {
        id: "eq-obj",
        number: 1,
        label: "Generic system objective",
        latex: "\\min_{\\theta \\in \\Theta} \\; \\mathbb{E}_{x \\sim \\mathcal{D}}\\big[ \\mathcal{L}(f_\\theta(x)) \\big] + \\lambda \\Omega(\\theta)",
        plaintext: "min_θ E_{x~D}[ L(f_θ(x)) ] + λ Ω(θ)",
        description:
          "Abstract optimization view of methods in the corpus: expected loss plus regularizer under distribution D.",
        sectionId: "background",
      },
      {
        id: "eq-tradeoff",
        number: 2,
        label: "Multi-objective trade-off",
        latex: "\\mathbf{F}(\\theta) = \\big(F_1(\\theta),\\ldots,F_m(\\theta)\\big),\\quad \\theta^* \\in \\arg\\mathrm{Pareto}\\,\\mathbf{F}",
        plaintext: "F(θ) = (F1(θ), …, Fm(θ)),  θ* ∈ argPareto F",
        description:
          "Many surveyed systems trade accuracy, latency, robustness, and cost; comparison tables approximate this Pareto view.",
        sectionId: "comparison",
      }
    );
  }

  return eqs;
}

export function formatEquationBlock(eq: SurveyEquation): string {
  return [
    `Equation (${eq.number}) — ${eq.label}.`,
    eq.plaintext,
    eq.description,
  ].join(" ");
}
