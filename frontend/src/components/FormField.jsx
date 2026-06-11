import FieldError from './FieldError';

export default function FormField({ label, hint, required, error, counter, children }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      {hint && (
        <p className="text-xs text-gray-500 mb-2 leading-relaxed">{hint}</p>
      )}
      {children}
      {counter && (
        <p className="text-xs text-gray-400 mt-1 text-right">{counter}</p>
      )}
      <FieldError message={error} />
    </div>
  );
}
