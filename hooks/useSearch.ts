import { useState } from "react";

export function useSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return { query, handleChange, setQuery };
}