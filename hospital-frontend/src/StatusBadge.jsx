function StatusBadge({ status }) {
  const key = (status || 'unknown').toLowerCase();
  return <span className={`badge badge-${key}`}>{status || 'Unknown'}</span>;
}

export default StatusBadge;
