import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Field } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useStore } from '../../lib/store';

export function LoginPage() {
  const { user, login } = useAuth();
  const { store } = useStore();
  const demo = store?.demo;
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await login(email, password);
      navigate((location.state as { from?: string } | null)?.from ?? '/admin', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-cream-100 px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-3xl">
            🧁
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold">Painel da loja</h1>
          <p className="text-sm text-cocoa-500">Entre para ver e gerenciar as encomendas</p>
        </div>
        {demo && (
          <Alert kind="info">
            <strong>Modo demonstração.</strong> Entre com o e-mail <code>{demo.adminEmail}</code> e
            a senha <code>{demo.adminPassword}</code>.{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                setEmail(demo.adminEmail);
                setPassword(demo.adminPassword);
              }}
            >
              Preencher
            </button>
          </Alert>
        )}
        <Field label="E-mail">
          <input
            className="input"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Senha">
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? 'Entrando...' : 'Entrar'}
        </Button>
        <a href="/" className="block text-center text-sm text-cocoa-500 hover:text-brand-700">
          ← Voltar para o site
        </a>
      </form>
    </div>
  );
}
