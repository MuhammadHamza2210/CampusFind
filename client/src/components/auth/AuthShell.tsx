import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, ShoppingBag, PackageSearch } from 'lucide-react';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Form side */}
      <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-lg font-extrabold text-gray-900"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Search className="h-4 w-4" strokeWidth={2.5} />
            </span>
            Campus<span className="-ml-1.5 text-brand-600">Find</span>
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p>

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
        </div>
      </div>

      {/* Brand / illustration side */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 lg:flex lg:w-1/2">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="relative z-10 flex flex-col justify-center px-14 text-white">
          <h2 className="max-w-md text-3xl font-bold leading-tight">
            Your campus, reconnected.
          </h2>
          <p className="mt-3 max-w-md text-brand-100">
            Lost something? Found something? Need a cheap calculator before the
            exam? CampusFind keeps it all inside your university community.
          </p>
          <ul className="mt-10 space-y-4">
            <Feature icon={PackageSearch} text="Report lost & found items in seconds" />
            <Feature icon={ShoppingBag} text="Buy & sell books, gadgets, and more" />
            <Feature icon={MapPin} text="Everything pinned to campus locations" />
          </ul>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-sm text-brand-50">{text}</span>
    </li>
  );
}
