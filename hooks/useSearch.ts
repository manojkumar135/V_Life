import { useState, useEffect } from "react";

export function useSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // keep this if you want to bind directly in <input>
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 900);

    return () => clearTimeout(handler);
  }, [query]);

  return { query, debouncedQuery, handleChange, setQuery };
}
