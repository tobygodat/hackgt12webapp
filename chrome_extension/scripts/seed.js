import { initializeApp } from "firebase/app";
import {
    getFirestore,
    doc,
    setDoc,
    addDoc,
    collection,
    Timestamp,
} from "firebase/firestore";

// Firebase config - replace with your actual config
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Demo user ID
const DEMO_USER_ID = "demo";

async function seedData() {
    try {
        console.log("Starting to seed demo data...");

        // Create demo user profile
        await setDoc(doc(db, "users", DEMO_USER_ID), {
            displayName: "Demo User",
            email: "demo@cartwatch.app",
            currency: "USD",
            riskTolerance: "medium",
            createdAt: Timestamp.now(),
        });
        console.log("✓ Created demo user profile");

        // Create demo accounts
        const accounts = [
            {
                type: "checking",
                name: "Chase Checking",
                balance: 2500.0,
                updatedAt: Timestamp.now(),
            },
            {
                type: "savings",
                name: "Ally Savings",
                balance: 15000.0,
                apr: 4.2,
                updatedAt: Timestamp.now(),
            },
            {
                type: "cc",
                name: "Chase Freedom",
                balance: -1200.0,
                apr: 21.99,
                limit: 5000.0,
                updatedAt: Timestamp.now(),
            },
        ];

        for (const account of accounts) {
            await addDoc(
                collection(db, "users", DEMO_USER_ID, "accounts"),
                account
            );
        }
        console.log("✓ Created demo accounts");

        // Generate 6 months of demo transactions
        const categories = [
            "dining",
            "coffee",
            "groceries",
            "transportation",
            "entertainment",
            "subscription",
            "shopping",
            "utilities",
        ];
        const merchants = {
            dining: [
                "Chipotle",
                "Subway",
                "Local Bistro",
                "Pizza Hut",
                "Thai Garden",
            ],
            coffee: ["Starbucks", "Local Coffee", "Dunkin'", "Blue Bottle"],
            groceries: ["Whole Foods", "Safeway", "Trader Joe's", "Costco"],
            transportation: ["Uber", "Lyft", "Gas Station", "Metro Card"],
            entertainment: ["Netflix", "AMC Theaters", "Spotify", "Steam"],
            subscription: ["Netflix", "Spotify", "Adobe CC", "GitHub Pro"],
            shopping: ["Amazon", "Target", "Best Buy", "H&M"],
            utilities: ["PG&E", "Comcast", "Verizon", "Water Dept"],
        };

        const transactions = [];
        const now = new Date();

        for (let month = 0; month < 6; month++) {
            const monthDate = new Date(
                now.getFullYear(),
                now.getMonth() - month,
                1
            );

            // Add income (2-3 times per month)
            for (let i = 0; i < 2; i++) {
                const incomeDate = new Date(
                    monthDate.getFullYear(),
                    monthDate.getMonth(),
                    Math.random() * 28 + 1
                );
                transactions.push({
                    amount: 2500 + Math.random() * 1000,
                    category: "income",
                    merchant: "Salary Deposit",
                    date: Timestamp.fromDate(incomeDate),
                    type: "credit",
                });
            }

            // Add expenses (15-25 per month)
            const numExpenses = Math.floor(Math.random() * 10) + 15;
            for (let i = 0; i < numExpenses; i++) {
                const expenseDate = new Date(
                    monthDate.getFullYear(),
                    monthDate.getMonth(),
                    Math.random() * 28 + 1
                );
                const category =
                    categories[Math.floor(Math.random() * categories.length)];
                const merchantList = merchants[category];
                const merchant =
                    merchantList[
                        Math.floor(Math.random() * merchantList.length)
                    ];

                let amount;
                switch (category) {
                    case "dining":
                        amount = Math.random() * 40 + 10;
                        break;
                    case "coffee":
                        amount = Math.random() * 8 + 3;
                        break;
                    case "groceries":
                        amount = Math.random() * 120 + 30;
                        break;
                    case "transportation":
                        amount = Math.random() * 30 + 5;
                        break;
                    case "entertainment":
                        amount = Math.random() * 60 + 10;
                        break;
                    case "subscription":
                        amount = Math.random() * 20 + 5;
                        break;
                    case "shopping":
                        amount = Math.random() * 200 + 20;
                        break;
                    case "utilities":
                        amount = Math.random() * 100 + 50;
                        break;
                    default:
                        amount = Math.random() * 50 + 10;
                }

                transactions.push({
                    amount: -Math.round(amount * 100) / 100,
                    category,
                    merchant,
                    date: Timestamp.fromDate(expenseDate),
                    type: "debit",
                });
            }
        }

        // Add transactions to Firestore
        for (const transaction of transactions) {
            await addDoc(
                collection(db, "users", DEMO_USER_ID, "transactions"),
                transaction
            );
        }
        console.log(`✓ Created ${transactions.length} demo transactions`);

        // Create a sample simulation
        const sampleSimulation = {
            inputsHash: "sample123",
            createdAt: Timestamp.now(),
            inputs: {
                purchaseAmount: 500,
                horizonMonths: 12,
                volatility: 0.15,
                incomeMean: 5000,
                expenseMean: 3500,
            },
            outputs: {
                series: Array.from({ length: 12 }, (_, i) => ({
                    monthIndex: i,
                    p10: 2000 + i * 100 + Math.random() * 200,
                    p50: 2500 + i * 150 + Math.random() * 300,
                    p90: 3000 + i * 200 + Math.random() * 400,
                })),
                debtImpactMonths: 5,
                goalDelays: [],
                recommendations: [
                    {
                        id: "dining",
                        type: "cut",
                        label: "dining",
                        monthlySave: 120,
                        frictionScore: 2.0,
                    },
                    {
                        id: "subscription",
                        type: "cut",
                        label: "subscription",
                        monthlySave: 45,
                        frictionScore: 1.5,
                    },
                ],
            },
        };

        await addDoc(
            collection(db, "users", DEMO_USER_ID, "simulations"),
            sampleSimulation
        );
        console.log("✓ Created sample simulation");

        console.log("🎉 Demo data seeding completed successfully!");
        console.log("Demo user ID:", DEMO_USER_ID);
    } catch (error) {
        console.error("Error seeding data:", error);
    }
}

// Run the seed script
seedData();
