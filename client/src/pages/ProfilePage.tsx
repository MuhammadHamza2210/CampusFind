import { useState } from 'react';
import { BadgeCheck, Camera, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, parseError } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { User } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/format';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const pickAvatar = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Choose an image');
    if (file.size > 5 * 1024 * 1024) return toast.error('Max 5 MB');
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      if (avatar) fd.append('image', avatar);
      const { data } = await api.patch<{ user: User }>('/api/users/me', fd);
      setUser(data.user);
      setAvatar(null);
      setPreview(null);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const dirty = name.trim() !== user.name || !!avatar;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      <p className="mt-1 text-sm text-gray-500">
        Manage how you appear across CampusFind.
      </p>

      <div className="mt-6 space-y-6 rounded-2xl border border-gray-100 bg-surface p-6 shadow-card">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar name={name || user.name} src={preview || user.avatarUrl} size="lg" />
            <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-brand-600 text-white shadow-sm ring-2 ring-white hover:bg-brand-700">
              <Camera className="h-3.5 w-3.5" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickAvatar(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <div>
            <p className="flex items-center gap-1.5 font-semibold text-gray-900">
              {user.name}
              {user.isVerified && (
                <Badge className="bg-brand-100 text-brand-700">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </Badge>
              )}
            </p>
            <p className="text-sm text-gray-500">
              Joined {formatDate(user.joinedAt)}
            </p>
          </div>
        </div>

        <Input
          label="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
        <Input
          label="University email"
          value={user.email}
          disabled
          hint="Your email is used for login and can't be changed."
        />

        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
          <Button onClick={save} loading={saving} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
