import clsx from 'clsx';
import { initials } from '@/lib/format';

interface Props {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
};

export function Avatar({ name, src, size = 'md', className }: Props) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={clsx(
          'rounded-full object-cover ring-2 ring-white',
          sizeMap[size],
          className
        )}
      />
    );
  }
  return (
    <div
      className={clsx(
        'flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ring-2 ring-white',
        sizeMap[size],
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
