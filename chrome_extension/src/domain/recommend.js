export function rankRecommendations(transactions) {
    // Identify recurring discretionary categories (coffee, dining, rideshare, subs)
    const discretionary = [
        "coffee",
        "dining",
        "restaurants",
        "rideshare",
        "subscription",
        "entertainment",
        "fashion",
        "beauty",
        "gaming",
        "alcohol",
    ];
    const buckets = {};

    for (const t of transactions) {
        const cat = (t.category || "other").toLowerCase();
        if (!discretionary.some((d) => cat.includes(d))) continue;
        const key = cat;
        buckets[key] = (buckets[key] || 0) + (t.amount > 0 ? t.amount : 0);
    }

    const recs = Object.entries(buckets)
        .map(([label, monthlySpend]) => {
            const monthlySave = Math.round(monthlySpend * 0.3); // suggest 30% reduction
            const frictionScore =
                1 +
                (label.includes("subscription") ? 0.5 : 0) +
                (label.includes("dining") ? 0.5 : 0);
            return {
                id: label,
                type: "cut",
                label,
                monthlySave,
                frictionScore,
            };
        })
        .sort(
            (a, b) =>
                b.monthlySave / b.frictionScore -
                a.monthlySave / a.frictionScore
        );

    return recs.slice(0, 5);
}
