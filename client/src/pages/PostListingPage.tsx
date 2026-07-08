import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  PackageSearch,
  HandHelping,
  ShoppingBag,
  MapPin,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { api, parseError, firstFieldErrors } from '@/lib/api';
import type { ListingType } from '@/types';
import { CATEGORIES, LOCATIONS, categoryLabel, locationLabel } from '@/lib/constants';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ImageDropzone } from '@/components/listings/ImageDropzone';
import { TYPE_META } from '@/lib/constants';

const TYPE_CARDS: {
  value: ListingType;
  title: string;
  desc: string;
  icon: typeof PackageSearch;
}[] = [
  { value: 'lost', title: 'Lost item', desc: 'I lost something on campus', icon: PackageSearch },
  { value: 'found', title: 'Found item', desc: 'I found something to return', icon: HandHelping },
  { value: 'sell', title: 'For sale', desc: 'I want to sell or exchange', icon: ShoppingBag },
];

const STEPS = ['Type & category', 'Details & photo', 'Review'];

interface FormState {
  type: ListingType | '';
  category: string;
  title: string;
  description: string;
  location: string;
  price: string;
  verificationQuestion: string;
}

export default function PostListingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    type: '',
    category: '',
    title: '',
    description: '',
    location: '',
    price: '',
    verificationQuestion: '',
  });
  const [image, setImage] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.type) e.type = 'Pick a listing type';
      if (!form.category) e.category = 'Choose a category';
    }
    if (step === 1) {
      if (form.title.trim().length < 3) e.title = 'Title must be at least 3 characters';
      if (form.description.trim().length < 10)
        e.description = 'Add a few more details (10+ characters)';
      if (!form.location) e.location = 'Select a campus location';
      if (form.type === 'sell') {
        const p = Number(form.price);
        if (!form.price || Number.isNaN(p) || p < 0)
          e.price = 'Enter a valid price';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('type', form.type);
      fd.append('category', form.category);
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('location', form.location);
      if (form.type === 'sell') fd.append('price', form.price);
      if (form.type === 'found' && form.verificationQuestion.trim())
        fd.append('verificationQuestion', form.verificationQuestion.trim());
      if (image) fd.append('image', image);

      const { data } = await api.post('/api/listings', fd);
      toast.success('Listing posted! 🎉');
      navigate(`/listings/${data.listing.id}`);
    } catch (err) {
      const parsed = parseError(err);
      const fieldErrs = firstFieldErrors(parsed);
      if (Object.keys(fieldErrs).length) {
        setErrors(fieldErrs);
        setStep(1);
        toast.error('Please fix the highlighted fields');
      } else {
        toast.error(parsed.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Post a listing</h1>
      <p className="mt-1 text-sm text-gray-500">
        A few quick steps — it takes under a minute.
      </p>

      {/* Progress */}
      <div className="mt-6 flex items-center">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors',
                  i < step && 'bg-brand-600 text-white',
                  i === step && 'bg-brand-600 text-white ring-4 ring-brand-100',
                  i > step && 'bg-gray-100 text-gray-400'
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={clsx(
                  'mt-1.5 hidden text-xs font-medium sm:block',
                  i <= step ? 'text-gray-900' : 'text-gray-400'
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={clsx(
                  'mx-2 h-0.5 flex-1 rounded-full transition-colors',
                  i < step ? 'bg-brand-600' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-gray-100 bg-surface p-6 shadow-card">
        {/* Step 1 */}
        {step === 0 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <p className="label">What are you posting?</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {TYPE_CARDS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('type', t.value)}
                    className={clsx(
                      'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all',
                      form.type === t.value
                        ? 'border-brand-500 bg-brand-50 shadow-sm'
                        : 'border-gray-200 hover:border-brand-200 hover:bg-gray-50'
                    )}
                  >
                    <span
                      className={clsx(
                        'flex h-9 w-9 items-center justify-center rounded-lg',
                        form.type === t.value
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      <t.icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {t.title}
                    </span>
                    <span className="text-xs text-gray-500">{t.desc}</span>
                  </button>
                ))}
              </div>
              {errors.type && (
                <p className="mt-1.5 text-xs font-medium text-red-600">{errors.type}</p>
              )}
            </div>

            <Select
              label="Category"
              placeholder="Choose a category"
              options={CATEGORIES}
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              error={errors.category}
            />
          </div>
        )}

        {/* Step 2 */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <Input
              label="Title"
              placeholder={
                form.type === 'sell'
                  ? 'e.g. Casio FX-991 scientific calculator'
                  : 'e.g. Black leather wallet'
              }
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              error={errors.title}
              maxLength={120}
            />
            <Textarea
              label="Description"
              placeholder="Describe it — colour, condition, distinguishing marks, where exactly…"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              error={errors.description}
              maxLength={2000}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Campus location"
                placeholder="Where?"
                options={LOCATIONS}
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                error={errors.location}
              />
              {form.type === 'sell' && (
                <Input
                  label="Price (Rs)"
                  type="number"
                  min={0}
                  placeholder="1500"
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                  error={errors.price}
                />
              )}
            </div>
            {form.type === 'found' && (
              <Input
                label="Verification question (optional)"
                placeholder="e.g. What's engraved on the back? What's the lock-screen photo?"
                value={form.verificationQuestion}
                onChange={(e) => set('verificationQuestion', e.target.value)}
                maxLength={200}
                hint="Anyone claiming this item must answer — it helps you confirm the real owner."
              />
            )}
            <div>
              <p className="label">Photo (optional)</p>
              <ImageDropzone value={image} onChange={setImage} />
            </div>
          </div>
        )}

        {/* Step 3 review */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-sm text-gray-500">
              Take one last look before publishing.
            </p>
            <div className="overflow-hidden rounded-xl border border-gray-100">
              {image ? (
                <img
                  src={URL.createObjectURL(image)}
                  alt="Preview"
                  className="max-h-60 w-full object-cover"
                />
              ) : (
                <div className="flex h-32 items-center justify-center bg-gray-50 text-sm text-gray-400">
                  No photo added
                </div>
              )}
              <div className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  {form.type && (
                    <Badge className={TYPE_META[form.type].badge}>
                      {TYPE_META[form.type].label}
                    </Badge>
                  )}
                  <span className="text-xs text-gray-400">
                    {categoryLabel(form.category)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{form.title}</h3>
                {form.type === 'sell' && form.price && (
                  <p className="text-lg font-extrabold text-brand-700">
                    Rs {Number(form.price).toLocaleString()}
                  </p>
                )}
                <p className="text-sm text-gray-600">{form.description}</p>
                <p className="flex items-center gap-1.5 pt-1 text-xs text-gray-500">
                  <MapPin className="h-3.5 w-3.5" /> {locationLabel(form.location)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="mt-8 flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={back}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} loading={submitting}>
              <Check className="h-4 w-4" /> Publish listing
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
