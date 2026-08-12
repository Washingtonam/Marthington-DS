import React, { useEffect, useRef, useState } from 'react';

export default function MultiSelect({ options = [], value = [], onChange, placeholder = 'Select...' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const ref = useRef(null);
  const listId = `multiselect-list-${Math.random().toString(36).slice(2,9)}`;

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()) && !value.includes(o));

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const add = (v) => {
    onChange([...(value || []), v]);
    setQuery('');
    setOpen(false);
  };

  const remove = (v) => {
    onChange((value || []).filter(x => x !== v));
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && filtered[highlight]) add(filtered[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Backspace' && query === '') {
      onChange((value || []).slice(0, -1));
    }
  };

  return (
    <div ref={ref} className="relative" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-owns={listId}>
      <div className="flex items-center gap-2 flex-wrap p-2 border rounded" onClick={() => { setOpen(true); ref.current?.querySelector('input')?.focus(); }}>
        {(value || []).map(v => (
          <span key={v} className="px-2 py-1 bg-slate-100 rounded text-sm flex items-center gap-2">
            <span>{v}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); remove(v); }} aria-label={`Remove ${v}`} className="ml-1">✕</button>
          </span>
        ))}
        <input id={`${listId}-input`} aria-controls={listId} aria-autocomplete="list" aria-expanded={open} aria-haspopup="listbox" aria-activedescendant={open && filtered[highlight] ? `${listId}-opt-${highlight}` : undefined} aria-label="service filter" value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onKeyDown={onKey} placeholder={value.length === 0 ? placeholder : ''} className="outline-none flex-1 min-w-[120px]" />
      </div>
      {open && (
        <ul id={listId} role="listbox" aria-labelledby={`${listId}-input`} className="absolute z-40 mt-1 w-full bg-white border rounded max-h-48 overflow-auto">
          {filtered.length === 0 ? (
            <li role="option" aria-disabled="true" className="p-2 text-slate-500">No results</li>
          ) : (
            filtered.map((opt, i) => (
              <li id={`${listId}-opt-${i}`} key={opt} role="option" aria-selected={i === highlight} onMouseEnter={() => setHighlight(i)} onClick={() => add(opt)} className={`p-2 cursor-pointer ${i === highlight ? 'bg-slate-100' : ''}`}>
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
