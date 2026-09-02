export interface Order {
  id: string;
  status: "pending" | "picking" | "packed" | "shipped" | "cancelled";
  lines: OrderLine[];
  createdAt: string;
}

export interface OrderLine {
  sku: string;
  quantity: number;
}

export interface Paginated<T> {
  items: T[];
  cursor: string | null;
}
