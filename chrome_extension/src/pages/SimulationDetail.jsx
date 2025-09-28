import { useParams } from "react-router-dom";
import Card from "../components/Card.jsx";

export default function SimulationDetail() {
    const { id } = useParams();

    // This would fetch simulation details by ID in a real app
    // For now, showing a placeholder

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-text">
                    Simulation Details
                </h1>
                <p className="text-text-muted">
                    Detailed analysis of simulation #{id}
                </p>
            </div>

            <Card title="Coming Soon" className="text-center py-12">
                <h3 className="text-lg font-semibold text-text mb-2">
                    Detailed Simulation View
                </h3>
                <p className="text-text-muted">
                    This page will show in-depth analysis of specific simulation
                    results, including scenario comparisons and detailed
                    recommendations.
                </p>
            </Card>
        </div>
    );
}
