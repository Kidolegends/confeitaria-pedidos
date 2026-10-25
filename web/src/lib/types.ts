// Tipos dos dados que a API devolve

export type Category = 'bolos' | 'tortas' | 'doces' | 'salgados' | 'kits';

export interface Product {
  id: string;
  name: string;
  description: string;
  category: Category;
  priceCents: number;
  unit: string;
  emoji: string;
  imageUrl: string | null;
  active: boolean;
  featured: boolean;
}

export type OrderStatus =
  'novo' | 'confirmado' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado';
export type Fulfillment = 'retirada' | 'entrega';

export interface OrderItem {
  id?: string;
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
}

export interface Order {
  id: number;
  code: string;
  customerName: string;
  customerPhone: string;
  phoneFormatted: string;
  fulfillment: Fulfillment;
  address: string | null;
  scheduledDate: string;
  scheduledTime: string;
  notes: string | null;
  status: OrderStatus;
  deliveryFeeCents: number;
  totalCents: number;
  createdAt: string;
  items: OrderItem[];
  trackingUrl: string;
  customerWhatsappUrl: string;
}

export interface CreatedOrder {
  id: number;
  publicToken: string;
  totalCents: number;
  trackingUrl: string;
  whatsappUrl: string;
}

export interface PublicOrder {
  code: string;
  status: OrderStatus;
  customerName: string;
  phoneEnding: string;
  fulfillment: Fulfillment;
  address: string | null;
  scheduledDate: string;
  scheduledTime: string;
  notes: string | null;
  items: OrderItem[];
  deliveryFeeCents: number;
  totalCents: number;
  createdAt: string;
  store: { name: string; address: string; city: string };
  whatsappUrl: string;
}

export interface StoreSettings {
  storeName: string;
  whatsappNumber: string;
  phoneDisplay: string | null;
  email: string | null;
  instagram: string | null;
  address: string;
  city: string;
  mapsUrl: string | null;
  openDays: number[];
  openingTime: string;
  closingTime: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeeCents: number;
  deliveryArea: string | null;
  minDaysAhead: number;
  aboutText: string | null;
}

export interface PublicStore extends StoreSettings {
  minDate: string;
  today: string;
}

export interface Testimonial {
  id: string;
  customerName: string;
  text: string;
  rating: number;
  active: boolean;
}

export interface Dashboard {
  today: string;
  weekStart: string;
  weekEnd: string;
  ordersToday: number;
  ordersThisWeek: number;
  scheduledToday: number;
  openOrders: number;
  revenueWeekCents: number;
  revenueMonthCents: number;
  byStatus: Partial<Record<OrderStatus, number>>;
  upcoming: Order[];
  topProducts: { productName: string; quantity: number }[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}
