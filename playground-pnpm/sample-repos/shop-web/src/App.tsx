import { Button } from "@acme/ui-components";
import { isWeekend } from "@acme/date-utils";

export function App() {
  const deliveryNote = isWeekend(new Date()) ? "Ships Monday" : "Ships today";
  return (
    <main>
      <h1>Shop Web</h1>
      <p>{deliveryNote}</p>
      <Button variant="primary">Checkout</Button>
    </main>
  );
}
