export default function LoadingScreen({ message = 'Loading…' }) {
  return <div className="loading-screen" role="status">{message}</div>;
}
