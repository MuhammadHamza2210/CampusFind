import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, ImageOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, parseError, firstFieldErrors } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { Listing } from '@/types';
import { CATEGORIES, LOCATIONS } from '@/lib/constants';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ImageDropzone } from '@/components/listings/ImageDropzone';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageLoader } from '@/components/ui/Spinner';

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    price: '',
    verificationQuestion: '',
  });

  useEffect(() => {
    if (!id) return;
    api
      .get<{ listing: Listing }>(`/api/listings/${id}`)
      .then(({ data }) => {
        const l = data.listing;
        if (user && l.owner.id !== user.id) {
          setDenied(true);
          return;
        }
        setListing(l);
        setForm({
          title: l.title,
          description: l.description,
          category: l.category,
          location: l.location,
          price: l.price !== null ? String(l.price) : '',
          verificationQuestion: l.verificationQuestion ?? '',
        });
      })
      .catch(() => setDenied(true))
      .finally(() => setLoading(false));
  }, [id, user]);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const save = async () => {
    if (!listing) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('category', form.category);
      fd.append('location', form.location);
      if (listing.type === 'sell') fd.append('price', form.price);
      if (listing.type === 'found')
        fd.append('verificationQuestion', form.verificationQuestion.trim());
      if (image) fd.append('image', image);

      await api.patch(`/api/listings/${id}`, fd);
      toast.success('Listing updated');
      navigate(`/listings/${id}`);
    } catch (err) {
      const parsed = parseError(err);
      const fieldErrs = firstFieldErrors(parsed);
      if (Object.keys(fieldErrs).length) setErrors(fieldErrs);
      else toast.error(parsed.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <FullPageLoader />;
  if (denied || !listing)
    return (
      <EmptyState
        icon={ImageOff}
        title="Can't edit this listing"
        description="It doesn't exist or you don't have permission."
        action={
          <Link to="/dashboard" className="btn-primary">
            Back to dashboard
          </Link>
        }
      />
    );

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to={`/listings/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to listing
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Edit listing</h1>

      <div className="mt-6 space-y-5 rounded-2xl border border-gray-100 bg-surface p-6 shadow-card">
        <Input
          label="Title"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          error={errors.title}
          maxLength={120}
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          error={errors.description}
          maxLength={2000}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            options={CATEGORIES}
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            error={errors.category}
          />
          <Select
            label="Campus location"
            options={LOCATIONS}
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            error={errors.location}
          />
        </div>
        {listing.type === 'sell' && (
          <Input
            label="Price (Rs)"
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            error={errors.price}
          />
        )}
        {listing.type === 'found' && (
          <Input
            label="Verification question (optional)"
            placeholder="e.g. What's engraved on the back?"
            value={form.verificationQuestion}
            onChange={(e) => set('verificationQuestion', e.target.value)}
            error={errors.verificationQuestion}
            maxLength={200}
            hint="Claimants must answer this to prove the item is theirs."
          />
        )}
        <div>
          <p className="label">Photo</p>
          <ImageDropzone
            value={image}
            previewUrl={listing.imageUrl}
            onChange={setImage}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link to={`/listings/${id}`} className="btn-secondary">
            Cancel
          </Link>
          <Button onClick={save} loading={saving}>
            <Check className="h-4 w-4" /> Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
