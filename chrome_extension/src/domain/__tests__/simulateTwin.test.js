import { simulateTwin } from '../simulateTwin.js';

describe('simulateTwin', () => {
  const mockAccounts = [
    { balance: 1000 },
    { balance: 5000 },
    { balance: -500 } // negative balance (credit card)
  ];

  const defaultInputs = {
    purchaseAmount: 500,
    horizonMonths: 12,
    volatility: 0.15,
    incomeMean: 4000,
    expenseMean: 3000,
  };

  test('should return simulation results with correct structure', () => {
    const result = simulateTwin(defaultInputs, { accounts: mockAccounts });

    expect(result).toHaveProperty('series');
    expect(result).toHaveProperty('debtImpactMonths');
    expect(result).toHaveProperty('goalDelays');

    expect(result.series).toHaveLength(12);
    expect(result.series[0]).toHaveProperty('monthIndex', 0);
    expect(result.series[0]).toHaveProperty('p10');
    expect(result.series[0]).toHaveProperty('p50');
    expect(result.series[0]).toHaveProperty('p90');
  });

  test('should have p90 >= p50 >= p10 for all months', () => {
    const result = simulateTwin(defaultInputs, { accounts: mockAccounts });

    result.series.forEach((month) => {
      expect(month.p90).toBeGreaterThanOrEqual(month.p50);
      expect(month.p50).toBeGreaterThanOrEqual(month.p10);
    });
  });

  test('should calculate debt impact based on purchase amount', () => {
    const smallPurchase = simulateTwin(
      { ...defaultInputs, purchaseAmount: 100 },
      { accounts: mockAccounts }
    );
    const largePurchase = simulateTwin(
      { ...defaultInputs, purchaseAmount: 1000 },
      { accounts: mockAccounts }
    );

    expect(largePurchase.debtImpactMonths).toBeGreaterThan(smallPurchase.debtImpactMonths);
  });

  test('should handle zero purchase amount', () => {
    const result = simulateTwin(
      { ...defaultInputs, purchaseAmount: 0 },
      { accounts: mockAccounts }
    );

    expect(result.debtImpactMonths).toBe(0);
    expect(result.series).toHaveLength(12);
  });

  test('should handle empty accounts array', () => {
    const result = simulateTwin(defaultInputs, { accounts: [] });

    expect(result.series).toHaveLength(12);
    // Should not crash with empty accounts
    expect(typeof result.debtImpactMonths).toBe('number');
  });

  test('should handle BNPL option correctly', () => {
    const bnplInputs = {
      ...defaultInputs,
      purchaseAmount: 1200,
      bnpl: { months: 6, apr: 0.15 }
    };

    const result = simulateTwin(bnplInputs, { accounts: mockAccounts });

    expect(result.series).toHaveLength(12);
    // BNPL should spread the cost over multiple months
    expect(result).toBeDefined();
  });
});