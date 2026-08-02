import type { MatrixRow, SurveyEquation } from "./types";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Word/IEEE-like equation graphic — Times family, no tinted heading band.
 * Matches section-heading typography (bold label + italic formula).
 */
export function renderEquationSvg(eq: SurveyEquation): string {
  const width = 780;
  const height = 72;
  const formula = eq.display || eq.plaintext;
  const max = 64;
  let line1 = formula;
  let line2 = "";
  if (formula.length > max) {
    const cut = formula.lastIndexOf(" ", max);
    if (cut > 18) {
      line1 = formula.slice(0, cut);
      line2 = formula.slice(cut + 1);
    }
  }
  const h = line2 ? 88 : 72;

  // Transparent / white only — no tinted heading band or card chrome (matches section typography)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}" role="img" aria-label="Equation ${eq.number}">
  <rect x="0" y="0" width="${width}" height="${h}" fill="#ffffff"/>
  <text x="${width / 2}" y="${line2 ? 36 : 44}" text-anchor="middle" font-size="17" font-style="italic" font-family="Times New Roman, Times, serif" fill="#111111">${escapeXml(line1)}</text>
  ${
    line2
      ? `<text x="${width / 2}" y="60" text-anchor="middle" font-size="17" font-style="italic" font-family="Times New Roman, Times, serif" fill="#111111">${escapeXml(line2)}</text>`
      : ""
  }
</svg>`;
}

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
        latex: "d_{ij}(t)=\\|p_i(t)-p_j(t)\\|_2",
        plaintext: "d_ij(t) = || p_i(t) - p_j(t) ||_2",
        display: "dᵢⱼ(t) = ‖ pᵢ(t) − pⱼ(t) ‖₂",
        description:
          "Euclidean separation between agents i and j at time t, used for collision avoidance and formation maintenance.",
        sectionId: "background",
      },
      {
        id: "eq-pso",
        number: 2,
        label: "Particle swarm velocity update",
        latex: "v_i^{k+1}=w v_i^k + c_1 r_1 (pbest_i-x_i^k)+c_2 r_2(gbest-x_i^k)",
        plaintext: "v_i(k+1) = w v_i(k) + c1 r1 (pbest_i - x_i(k)) + c2 r2 (gbest - x_i(k))",
        display: "vᵢ⁽ᵏ⁺¹⁾ = w·vᵢ⁽ᵏ⁾ + c₁r₁(pbestᵢ − xᵢ⁽ᵏ⁾) + c₂r₂(gbest − xᵢ⁽ᵏ⁾)",
        description:
          "Canonical particle-swarm velocity update used for path planning and task allocation in several matrix studies.",
        sectionId: "taxonomy",
      },
      {
        id: "eq-coverage",
        number: 3,
        label: "Area coverage objective",
        latex: "J_{cov}=(1/|A|)\\int_A 1(\\min_i\\|q-p_i\\|\\le R_s)\\,dq",
        plaintext: "J_cov = (1/|A|) integral_A 1(min_i ||q - p_i|| <= R_s) dq",
        display: "Jcov = (1/|A|) ∫ₐ 𝟙( minᵢ ‖q − pᵢ‖ ≤ Rₛ ) dq",
        description:
          "Fraction of area A covered under sensing radius Rs; a recurring evaluation metric in swarm deployment studies.",
        sectionId: "comparison",
      }
    );
  } else if (/transformer|attention|language|llm|nlp|bert/.test(hay)) {
    eqs.push(
      {
        id: "eq-attention",
        number: 1,
        label: "Scaled dot-product attention",
        latex: "Attention(Q,K,V)=softmax(QK^T/\\sqrt{d_k})V",
        plaintext: "Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V",
        display: "Attention(Q, K, V) = softmax( QKᵀ / √dₖ ) V",
        description: "Core attention operator underlying many sequence-modeling studies in the matrix.",
        sectionId: "background",
      },
      {
        id: "eq-nll",
        number: 2,
        label: "Autoregressive training objective",
        latex: "L_{LM}=-\\sum_{t=1}^{T}\\log p_\\theta(x_t|x_{<t})",
        plaintext: "L_LM = - sum_{t=1 to T} log p_theta(x_t | x_<t)",
        display: "Lₗₘ = − Σₜ₌₁ᵀ log pθ(xₜ | x₁:ₜ₋₁)",
        description: "Negative log-likelihood used to train next-token predictors surveyed in this review.",
        sectionId: "comparison",
      }
    );
  } else if (/deep|neural|learning|cnn|reinforcement|\brl\b/.test(hay)) {
    eqs.push(
      {
        id: "eq-risk",
        number: 1,
        label: "Empirical risk",
        latex: "\\hat{R}(f)=(1/N)\\sum_{n=1}^{N}\\ell(f(x_n),y_n)",
        plaintext: "R_hat(f) = (1/N) sum_n ell(f(x_n), y_n)",
        display: "R̂(f) = (1/N) Σₙ₌₁ᴺ ℓ( f(xₙ), yₙ )",
        description: "Supervised learning objective common across the surveyed learning systems.",
        sectionId: "background",
      },
      {
        id: "eq-bellman",
        number: 2,
        label: "Bellman optimality equation",
        latex: "Q^*(s,a)=E[r+\\gamma\\max_{a'}Q^*(s',a')|s,a]",
        plaintext: "Q*(s,a) = E[ r + gamma max_a' Q*(s', a') | s, a ]",
        display: "Q*(s, a) = E[ r + γ maxₐ′ Q*(s′, a′) | s, a ]",
        description: "Optimal action-value recursion referenced by reinforcement-learning entries in the matrix.",
        sectionId: "taxonomy",
      }
    );
  } else {
    eqs.push(
      {
        id: "eq-obj",
        number: 1,
        label: "Regularized expected loss",
        latex: "\\min_\\theta E_{x\\sim D}[L(f_\\theta(x))]+\\lambda\\Omega(\\theta)",
        plaintext: "min_theta E_x~D [ L(f_theta(x)) ] + lambda Omega(theta)",
        display: "min_θ  Eₓ∼𝒟 [ L(fθ(x)) ] + λ Ω(θ)",
        description:
          "Abstract optimization view of methods in the corpus: expected loss plus regularizer under distribution D.",
        sectionId: "background",
      },
      {
        id: "eq-tradeoff",
        number: 2,
        label: "Multi-objective trade-off",
        latex: "F(\\theta)=(F_1(\\theta),...,F_m(\\theta))",
        plaintext: "F(theta) = (F1(theta), ..., Fm(theta))",
        display: "F(θ) = ( F₁(θ), F₂(θ), …, Fₘ(θ) )",
        description:
          "Many surveyed systems trade accuracy, latency, robustness, and cost; comparison tables approximate this Pareto view.",
        sectionId: "comparison",
      }
    );
  }

  return eqs.map((eq) => ({ ...eq, svg: renderEquationSvg(eq) }));
}

/** Marker kept for markdown/legacy; PDF/Word/HTML render from structured equations. */
export function formatEquationBlock(eq: SurveyEquation): string {
  return `Equation (${eq.number}) — ${eq.label}.`;
}
