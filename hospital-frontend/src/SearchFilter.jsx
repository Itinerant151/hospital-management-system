import { useEffect, useState } from 'react';

// Generic search box: filters `data` by substring match against `fields`
// and reports the filtered array back to the parent via `onFiltered`.
// Usage:
//   const [filtered, setFiltered] = useState(patients);
//   <SearchFilter data={patients} fields={['name', 'diagnosis']} onFiltered={setFiltered} />
//   // then render `filtered` instead of `patients`
function SearchFilter({ data, fields, onFiltered, placeholder }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      onFiltered(data);
      return;
    }
    onFiltered(
      data.filter((item) => fields.some((f) => String(item[f] ?? '').toLowerCase().includes(q)))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, data]);

  return (
    <div className="search-filter">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder || 'Search...'}
        aria-label={placeholder || 'Search'}
      />
    </div>
  );
}

export default SearchFilter;
