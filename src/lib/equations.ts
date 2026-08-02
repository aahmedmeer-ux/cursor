import type { MatrixRow, SurveyEquation } from "./types";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


const SUB: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  i: "ᵢ", j: "ⱼ", k: "ₖ", n: "ₙ", s: "ₛ", t: "ₜ", x: "ₓ", a: "ₐ", m: "ₘ",
};

/** Convert latex/plaintext markers into a journal-readable Unicode display string. */
export function toUnicodeDisplay(raw: string): string {
  return raw
    .replace(/\\\|/g, "‖")
    .replace(/\\leq/g, "≤")
    .replace(/\\int/g, "∫")
    .replace(/\\sqrt\{([^}]+)\}/g, "√$1")
    .replace(/\\theta/g, "θ")
    .replace(/\\lambda/g, "λ")
    .replace(/\\Omega/g, "Ω")
    .replace(/\\sum/g, "Σ")
    .replace(/\\cdot/g, "·")
    .replace(/_\{([^}]+)\}/g, (_: string, g: string) =>
      [...g].map((ch) => SUB[ch] || SUB[ch.toLowerCase()] || ch).join("")
    )
    .replace(/_([a-zA-Z0-9])/g, (_: string, ch: string) => SUB[ch] || SUB[ch.toLowerCase()] || ch)
    .replace(/\^\{([^}]+)\}/g, "^($1)")
    .replace(/\^([0-9+\-]+)/g, "^($1)")
    .replace(/\s+/g, " ")
    .trim();
}


/**
 * Word/IEEE-like equation graphic — white backdrop, DejaVu/Noto serif (sharp-safe).
 * Uses tspan subscripts so formulas stay readable even when Unicode glyphs are missing.
 */
export function renderEquationSvg(eq: SurveyEquation): string {
  const width = 820;
  const src = (eq.latex || eq.plaintext || eq.display || "").trim();

  let parse = src
    .replace(/\\\|/g, "||")
    .replace(/\\leq/g, "<=")
    .replace(/\\int/g, "∫")
    .replace(/\\cdot/g, "·")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\theta/g, "θ")
    .replace(/\\lambda/g, "λ")
    .replace(/\\Omega/g, "Ω")
    .replace(/\\sum/g, "Σ")
    .replace(/\\,/g, " ")
    .replace(/\\lVert/g, "||")
    .replace(/\\rVert/g, "||")
    .replace(/\\mathbf\{([^}]+)\}/g, "$1")
    .replace(/\\mathrm\{([^}]+)\}/g, "$1")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
    .replace(/\\left/g, "")
    .replace(/\\right/g, "")
    .replace(/\\le\b/g, "<=")
    .replace(/[−–—]/g, "-")
    .replace(/[“”"]/g, "")
    .replace(/\^\(([^)]+)\)/g, "^{$1}");

  if (!/_/.test(parse) && eq.display) {
    parse = eq.display
      .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (ch) => `_${"₀₁₂₃₄₅₆₇₈₉".indexOf(ch)}`)
      .replace(/ᵢ/g, "_i")
      .replace(/ⱼ/g, "_j")
      .replace(/ₖ/g, "_k")
      .replace(/ₛ/g, "_s")
      .replace(/ₙ/g, "_n")
      .replace(/ₜ/g, "_t")
      .replace(/ₓ/g, "_x")
      .replace(/ₐ/g, "_a")
      .replace(/ₘ/g, "_m")
      .replace(/‖/g, "||")
      .replace(/≤/g, "<=")
      .replace(/⁽/g, "^(")
      .replace(/⁾/g, ")")
      .replace(/ᵏ/g, "k")
      .replace(/⁺/g, "+")
      .replace(/⁻/g, "-");
  }

  const parts: string[] = [];
  const re = /_\{([^}]+)\}|_([a-zA-Z0-9])|\^\{([^}]+)\}|\^([0-9+\-]+)|[^_^]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(parse))) {
    if (m[1] != null || m[2] != null) {
      const sub = escapeXml(m[1] ?? m[2]);
      parts.push(`<tspan dy="6" font-size="17" font-style="italic">${sub}</tspan><tspan dy="-6"> </tspan>`);
    } else if (m[3] != null || m[4] != null) {
      const sup = escapeXml(m[3] ?? m[4]);
      parts.push(`<tspan dy="-8" font-size="15" font-style="italic">${sup}</tspan><tspan dy="8"> </tspan>`);
    } else {
      parts.push(escapeXml(m[0]));
    }
  }

  const font = "DejaVu Serif, Noto Serif, Liberation Serif, Times New Roman, Times, serif";
  // Approximate visible length (ignore tspan tags) for wrap decision
  const visible = parse.replace(/_\{[^}]+\}|_([a-zA-Z0-9])|\^\{[^}]+\}|\^([0-9+\-]+)/g, "x");
  const needsWrap = visible.length > 54;

  if (needsWrap) {
    // Split source at a mid operator, then build tspans for each line
    const cutAt = (() => {
      const prefer = [" + ", " - ", " = ", "+ ", "- "];
      let best = -1;
      for (const p of prefer) {
        const idx = parse.indexOf(p, Math.floor(parse.length * 0.35));
        if (idx > 12 && idx < parse.length - 8) { best = idx + (p.startsWith(" ") ? 1 : 0); break; }
      }
      return best > 0 ? best : Math.floor(parse.length / 2);
    })();
    const left = parse.slice(0, cutAt).trim();
    const right = parse.slice(cutAt).trim();
    const toSpans = (src: string) => {
      const out: string[] = [];
      const re2 = /_\{([^}]+)\}|_([a-zA-Z0-9])|\^\{([^}]+)\}|\^([0-9+\-]+)|[^_^]+/g;
      let m2: RegExpExecArray | null;
      while ((m2 = re2.exec(src))) {
        if (m2[1] != null || m2[2] != null) {
          const sub = escapeXml(m2[1] ?? m2[2]);
          out.push(`<tspan dy="6" font-size="15" font-style="italic">${sub}</tspan><tspan dy="-6"> </tspan>`);
        } else if (m2[3] != null || m2[4] != null) {
          const sup = escapeXml(m2[3] ?? m2[4]);
          out.push(`<tspan dy="-8" font-size="14" font-style="italic">${sup}</tspan><tspan dy="8"> </tspan>`);
        } else {
          out.push(escapeXml(m2[0]));
        }
      }
      return out.join("") || escapeXml(src);
    };
    const h = 100;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}" role="img" aria-label="Equation ${eq.number}">
  <rect x="0" y="0" width="${width}" height="${h}" fill="#ffffff"/>
  <text x="${width / 2}" y="38" text-anchor="middle" font-size="22" font-style="italic" font-family="${font}" fill="#111111">${toSpans(left)}</text>
  <text x="${width / 2}" y="72" text-anchor="middle" font-size="22" font-style="italic" font-family="${font}" fill="#111111">${toSpans(right)}</text>
</svg>`;
  }

  const tspans = parts.join("") || escapeXml(eq.display || eq.plaintext || eq.label);
  const h = 82;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}" role="img" aria-label="Equation ${eq.number}">
  <rect x="0" y="0" width="${width}" height="${h}" fill="#ffffff"/>
  <text x="${width / 2}" y="52" text-anchor="middle" font-size="28" font-style="italic" font-family="${font}" fill="#111111">${tspans}</text>
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
