import { rankRecommendations } from "../recommend.js";

describe("rankRecommendations", () => {
    const mockTransactions = [
        { amount: 25, category: "dining", merchant: "Restaurant A" },
        { amount: 5, category: "coffee", merchant: "Starbucks" },
        { amount: 120, category: "dining", merchant: "Restaurant B" },
        { amount: 15, category: "subscription", merchant: "Netflix" },
        { amount: 12, category: "subscription", merchant: "Spotify" },
        { amount: 8, category: "coffee", merchant: "Local Coffee" },
        { amount: 200, category: "shopping", merchant: "Amazon" },
        { amount: 50, category: "entertainment", merchant: "Concert" },
        { amount: -100, category: "income", merchant: "Salary" }, // Should be ignored (negative/income)
    ];

    test("should return recommendations sorted by efficiency", () => {
        const recommendations = rankRecommendations(mockTransactions);

        expect(recommendations).toBeInstanceOf(Array);
        expect(recommendations.length).toBeGreaterThan(0);
        expect(recommendations.length).toBeLessThanOrEqual(5);

        // Check that all recommendations have required properties
        recommendations.forEach((rec) => {
            expect(rec).toHaveProperty("id");
            expect(rec).toHaveProperty("type", "cut");
            expect(rec).toHaveProperty("label");
            expect(rec).toHaveProperty("monthlySave");
            expect(rec).toHaveProperty("frictionScore");
        });
    });

    test("should only include discretionary categories", () => {
        const recommendations = rankRecommendations(mockTransactions);

        const nonDiscretionaryCategories = [
            "income",
            "utilities",
            "rent",
            "insurance",
        ];
        recommendations.forEach((rec) => {
            expect(nonDiscretionaryCategories).not.toContain(rec.label);
        });
    });

    test("should calculate monthly savings correctly", () => {
        const recommendations = rankRecommendations(mockTransactions);

        const diningRec = recommendations.find((rec) =>
            rec.label.includes("dining")
        );
        if (diningRec) {
            // Dining total: 25 + 120 = 145, 30% of that = 43.5, rounded = 44
            expect(diningRec.monthlySave).toBeCloseTo(44, 0);
        }

        const coffeeRec = recommendations.find((rec) =>
            rec.label.includes("coffee")
        );
        if (coffeeRec) {
            // Coffee total: 5 + 8 = 13, 30% of that = 3.9, rounded = 4
            expect(coffeeRec.monthlySave).toBeCloseTo(4, 0);
        }
    });

    test("should handle empty transactions array", () => {
        const recommendations = rankRecommendations([]);

        expect(recommendations).toBeInstanceOf(Array);
        expect(recommendations).toHaveLength(0);
    });

    test("should handle transactions with missing categories", () => {
        const transactionsWithMissingCategories = [
            { amount: 25, merchant: "Unknown Store" }, // No category
            { amount: 50, category: "", merchant: "Empty Category" }, // Empty category
            { amount: 30, category: "dining", merchant: "Restaurant" },
        ];

        const recommendations = rankRecommendations(
            transactionsWithMissingCategories
        );

        expect(recommendations).toBeInstanceOf(Array);
        // Should still find the dining category
        const diningRec = recommendations.find((rec) => rec.label === "dining");
        expect(diningRec).toBeDefined();
    });

    test("should sort by savings-to-friction ratio", () => {
        const recommendations = rankRecommendations(mockTransactions);

        if (recommendations.length > 1) {
            for (let i = 0; i < recommendations.length - 1; i++) {
                const current = recommendations[i];
                const next = recommendations[i + 1];

                const currentRatio =
                    current.monthlySave / current.frictionScore;
                const nextRatio = next.monthlySave / next.frictionScore;

                expect(currentRatio).toBeGreaterThanOrEqual(nextRatio);
            }
        }
    });

    test("should assign higher friction scores to certain categories", () => {
        const subscriptionTransactions = [
            { amount: 15, category: "subscription", merchant: "Netflix" },
            { amount: 30, category: "entertainment", merchant: "Movies" },
        ];

        const recommendations = rankRecommendations(subscriptionTransactions);

        const subscriptionRec = recommendations.find((rec) =>
            rec.label.includes("subscription")
        );
        const entertainmentRec = recommendations.find((rec) =>
            rec.label.includes("entertainment")
        );

        if (subscriptionRec) {
            expect(subscriptionRec.frictionScore).toBeGreaterThan(1);
        }
        if (entertainmentRec) {
            expect(entertainmentRec.frictionScore).toBeGreaterThanOrEqual(1);
        }
    });
});
