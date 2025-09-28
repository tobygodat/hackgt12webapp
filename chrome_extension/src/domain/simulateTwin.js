import { quantile } from "./util.js";

export function simulateTwin(
  {
    purchaseAmount = 0,
    horizonMonths = 12,
    volatility = 0.15,
    incomeMean,
    expenseMean,
    bnpl = null
  },
  { accounts }
) {
  const N = 1000;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const normal = (m, sd) => m + sd * (Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random()));
  const sdIncome = incomeMean * volatility;
  const sdExpense = expenseMean * volatility;
  const series = Array.from({ length: horizonMonths }, () => []);

  for (let i = 0; i < N; i++) {
    let balance = (accounts || []).reduce((s, a) => s + (a.balance || 0), 0);
    let bnplSchedule = [];

    if (bnpl?.months) {
      const monthly = purchaseAmount / bnpl.months * (1 + (bnpl.apr || 0) / 12 * bnpl.months);
      bnplSchedule = Array.from({ length: horizonMonths }, (_, m) => m < bnpl.months ? monthly : 0);
    }

    for (let m = 0; m < horizonMonths; m++) {
      const inc = clamp(normal(incomeMean, sdIncome), 0, incomeMean * 2);
      const exp = clamp(normal(expenseMean, sdExpense), 0, expenseMean * 2);
      const purchaseHit = bnpl ? (bnplSchedule[m] || 0) : (m === 0 ? purchaseAmount : 0);
      balance += inc - exp - purchaseHit;
      series[m].push(balance);
    }
  }

  const out = series.map((arr, monthIndex) => ({
    monthIndex,
    p10: quantile(arr, 0.10),
    p50: quantile(arr, 0.50),
    p90: quantile(arr, 0.90),
  }));

  // Simple placeholders for debt/goal impacts (expand with account APR & goals dates)
  const debtImpactMonths = Math.max(0, purchaseAmount > 0 ? Math.round(purchaseAmount / 100) : 0);
  const goalDelays = []; // compute by comparing projected surplus vs goal contributions

  return { series: out, debtImpactMonths, goalDelays };
}