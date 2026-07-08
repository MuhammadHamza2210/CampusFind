import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthShell } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api, parseError, firstFieldErrors } from '@/lib/api';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const update = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await api.post('/api/auth/signup', form);
      toast.success('Account created — check your email for a code');
      navigate('/verify', { state: { email: form.email } });
    } catch (err) {
      const parsed = parseError(err);
      const fieldErrs = firstFieldErrors(parsed);
      if (Object.keys(fieldErrs).length) setErrors(fieldErrs);
      else toast.error(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Sign up with your university email to get started."
      footer={
        <span className="text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Log in
          </Link>
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          name="name"
          placeholder="Ali Raza"
          icon={<UserIcon className="h-4 w-4" />}
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          error={errors.name}
          autoComplete="name"
        />
        <Input
          label="University email"
          name="email"
          type="email"
          placeholder="you@bahria.edu.pk"
          icon={<Mail className="h-4 w-4" />}
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          error={errors.email}
          hint="Only your campus email domain is allowed."
          autoComplete="email"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="At least 6 characters"
          icon={<Lock className="h-4 w-4" />}
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          error={errors.password}
          autoComplete="new-password"
        />
        <Button type="submit" fullWidth loading={loading}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
