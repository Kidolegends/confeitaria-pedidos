import { prisma } from '../../lib/prisma';
import { withLinks } from '../orders/orders.service';
import { addDays, startOfLocalDay, startOfWeek, toLocalDate } from '../../lib/time';

const notCancelled = { status: { not: 'cancelado' } };
const openStatuses = ['novo', 'confirmado', 'em_producao', 'pronto'];

/** Números do painel. "Hoje" e "semana" seguem o fuso da confeitaria. */
export async function getSummary() {
  const today = toLocalDate();
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const monthStart = `${today.slice(0, 8)}01`;

  const [
    ordersToday,
    ordersThisWeek,
    scheduledToday,
    openOrders,
    weekRevenue,
    monthRevenue,
    byStatus,
    upcoming,
    topProducts,
  ] = await Promise.all([
    // Pedidos que CHEGARAM hoje / nesta semana (pela data de criação)
    prisma.order.count({ where: { createdAt: { gte: startOfLocalDay(today) } } }),
    prisma.order.count({ where: { createdAt: { gte: startOfLocalDay(weekStart) } } }),
    // Encomendas para entregar/retirar hoje
    prisma.order.count({ where: { scheduledDate: today, ...notCancelled } }),
    prisma.order.count({ where: { status: { in: openStatuses } } }),
    // Faturamento estimado: soma dos pedidos não cancelados com entrega no período
    prisma.order.aggregate({
      _sum: { totalCents: true },
      where: { scheduledDate: { gte: weekStart, lte: weekEnd }, ...notCancelled },
    }),
    prisma.order.aggregate({
      _sum: { totalCents: true },
      where: { scheduledDate: { gte: monthStart, lte: `${today.slice(0, 8)}31` }, ...notCancelled },
    }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.findMany({
      where: { scheduledDate: { gte: today }, status: { in: openStatuses } },
      include: { items: true },
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
      take: 5,
    }),
    prisma.orderItem.groupBy({
      by: ['productName'],
      _sum: { quantity: true },
      where: { order: { scheduledDate: { gte: monthStart }, ...notCancelled } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
  ]);

  return {
    today,
    weekStart,
    weekEnd,
    ordersToday,
    ordersThisWeek,
    scheduledToday,
    openOrders,
    revenueWeekCents: weekRevenue._sum.totalCents ?? 0,
    revenueMonthCents: monthRevenue._sum.totalCents ?? 0,
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
    upcoming: upcoming.map(withLinks),
    topProducts: topProducts.map((row) => ({
      productName: row.productName,
      quantity: row._sum.quantity ?? 0,
    })),
  };
}
