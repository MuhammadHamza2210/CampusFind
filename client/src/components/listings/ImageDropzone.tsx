import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, X, ImageIcon } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface Props {
  value: File | null;
  previewUrl?: string | null;
  onChange: (file: File | null) => void;
}

const MAX_SIZE = 5 * 1024 * 1024;

export function ImageDropzone({ value, previewUrl, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const preview = localPreview || previewUrl || null;

  const accept = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('Image must be under 5 MB');
      return;
    }
    setLocalPreview(URL.createObjectURL(file));
    onChange(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) accept(file);
  };

  const onSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) accept(file);
  };

  const clear = () => {
    setLocalPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  if (preview) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-gray-200">
        <img src={preview} alt="Preview" className="max-h-72 w-full object-cover" />
        <button
          type="button"
          onClick={clear}
          className="absolute right-3 top-3 rounded-full bg-gray-900/70 p-1.5 text-white transition hover:bg-gray-900"
          aria-label="Remove image"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 bg-surface px-4 py-2.5 text-xs text-gray-500">
          <ImageIcon className="h-4 w-4" />
          {value ? value.name : 'Current image'}
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      className={clsx(
        'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors',
        dragging
          ? 'border-brand-400 bg-brand-50'
          : 'border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/40'
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
        <UploadCloud className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-gray-700">
        <span className="text-brand-600">Click to upload</span> or drag & drop
      </p>
      <p className="mt-1 text-xs text-gray-400">PNG, JPG, or WEBP up to 5 MB</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onSelect}
      />
    </div>
  );
}
