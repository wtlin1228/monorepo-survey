import { Button } from "@acme/ui-components";
import { normalize, defaultSeriesColor } from "@acme/charts";

const weeklyOrders = [120, 340, 280, 410];

export default function Page() {
  const bars = normalize(weeklyOrders);
  return (
    <main>
      <h1>Admin Dashboard</h1>
      <svg width="200" height="50">
        {bars.map((h, i) => (
          <rect key={i} x={i * 50} y={50 - h * 50} width="40" height={h * 50} fill={defaultSeriesColor} />
        ))}
      </svg>
      <Button variant="secondary">Refresh</Button>
    </main>
  );
}
