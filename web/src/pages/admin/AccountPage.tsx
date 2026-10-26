import { useState, type FormEvent } from 'react';
import { Alert, Button, Field } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useStore } from '../../lib/store';
import { PageTitle } from './AdminLayout';

export function AccountPage() {
  const { user } = useAuth();
  const { store } = useStore();
  const demo = Boolean(store?.demo);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (form.newPassword !== form.confirm)
      return setMessage({ kind: 'error', text: 'A confirmação não é igual à nova senha' });
    setSaving(true);
    setMessage(null);
    try {
      await api('PATCH', '/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setMessage({ kind: 'success', text: 'Senha alterada com sucesso!' });
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageTitle title="Minha conta" subtitle={user?.email} />
      <form onSubmit={submit} className="card max-w-md space-y-4 p-6">
        <h2 className="font-display text-lg font-bold">Trocar senha</h2>
        {demo && (
          <Alert kind="info">
            Na demonstração a senha e o e-mail do painel não podem ser alterados, para que todos os
            visitantes consigam entrar. Na loja de verdade isso funciona normalmente.
          </Alert>
        )}
        <Field label="Senha atual">
          <input
            type="password"
            className="input"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          />
        </Field>
        <Field label="Nova senha" hint="Mínimo de 8 caracteres, com letras e números">
          <input
            type="password"
            className="input"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
        </Field>
        <Field label="Confirme a nova senha">
          <input
            type="password"
            className="input"
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />
        </Field>
        {message && <Alert kind={message.kind}>{message.text}</Alert>}
        <Button type="submit" disabled={saving || demo}>
          {saving ? 'Salvando...' : 'Salvar nova senha'}
        </Button>
      </form>
    </>
  );
}
