import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import { AuthProvider, RequireAuth } from './lib/auth';
import { StoreProvider } from './lib/store';
import { AccountPage } from './pages/admin/AccountPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { CalendarPage } from './pages/admin/CalendarPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { LoginPage } from './pages/admin/LoginPage';
import { OrdersPage } from './pages/admin/OrdersPage';
import { ProductsPage } from './pages/admin/ProductsPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { TestimonialsPage } from './pages/admin/TestimonialsPage';
import { HomePage } from './pages/site/HomePage';
import { NotFoundPage } from './pages/site/NotFoundPage';
import { TrackOrderPage } from './pages/site/TrackOrderPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <AuthProvider>
          <Routes>
            {/* Site público */}
            <Route path="/" element={<HomePage />} />
            <Route path="/pedido/:token" element={<TrackOrderPage />} />

            {/* Painel administrativo */}
            <Route path="/admin/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="pedidos" element={<OrdersPage />} />
              <Route path="agenda" element={<CalendarPage />} />
              <Route path="produtos" element={<ProductsPage />} />
              <Route path="depoimentos" element={<TestimonialsPage />} />
              <Route path="configuracoes" element={<SettingsPage />} />
              <Route path="conta" element={<AccountPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
);
