import { TextareaHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, error, hint, className, id, ...rest }, ref) => {
    const fieldId = id || rest.name;
    return (
      <div>
        {label && (
          <label htmlFor={fieldId} className="label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          className={clsx(
            'input min-h-[110px] resize-y',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          aria-invalid={!!error}
          {...rest}
        />
        {error ? (
          <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
