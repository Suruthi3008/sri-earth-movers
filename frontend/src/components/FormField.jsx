export default function FormField({ label, htmlFor, error, children }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <span className="field__error" role="alert">{error}</span>}
    </div>
  );
}
