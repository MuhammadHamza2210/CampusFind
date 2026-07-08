import { useState, useRef, FormEvent, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { api, parseError } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { User } from '@/types';

const LEN = 6;

export default function VerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const email = (location.state as { email?: string })?.email || '';

  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) navigate('/signup', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const setDigit = (i: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean && val !== '') return;
    const next = [...digits];
    if (clean.length > 1) {
      // Handle paste of the full code.
      clean.split('').slice(0, LEN).forEach((d, idx) => (next[idx] = d));
      setDigits(next);
      inputs.current[Math.min(clean.length, LEN - 1)]?.focus();
      return;
    }
    next[i] = clean;
    setDigits(next);
    if (clean && i < LEN - 1) inputs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0)
      inputs.current[i - 1]?.focus();
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const code = digits.join('');
    if (code.length !== LEN) return toast.error('Enter the full 6-digit code');
    setLoading(true);
    try {
      const { data } = await api.post<{ user: User }>('/api/auth/verify', {
        email,
        code,
      });
      setUser(data.user);
      toast.success('Email verified — welcome to CampusFind!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await api.post('/api/auth/resend', { email });
      toast.success('A new code is on its way');
      setCooldown(30);
    } catch (err) {
      toast.error(parseError(err).message);
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle={`We sent a 6-digit code to ${email}. Enter it below.`}
      footer={
        <Link to="/login" className="text-gray-500 hover:text-gray-700">
          Back to login
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-6">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              inputMode="numeric"
              maxLength={LEN}
              aria-label={`Digit ${i + 1}`}
              className="h-14 w-11 rounded-xl border border-gray-200 text-center text-xl font-bold text-gray-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 sm:w-12"
            />
          ))}
        </div>

        <Button type="submit" fullWidth loading={loading}>
          <MailCheck className="h-4 w-4" /> Verify & continue
        </Button>

        <p className="text-center text-sm text-gray-500">
          Didn't get it?{' '}
          {cooldown > 0 ? (
            <span className="text-gray-400">Resend in {cooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={resend}
              className="font-semibold text-brand-600 hover:underline"
            >
              Resend code
            </button>
          )}
        </p>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
          Tip: in local dev without SMTP, the code is printed in the server console.
        </p>
      </form>
    </AuthShell>
  );
}
