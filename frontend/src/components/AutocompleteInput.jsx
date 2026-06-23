import { useState, useRef, useEffect, useMemo } from 'react';
import './AutocompleteInput.css';

function matchQuery(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return (item) => item.toLowerCase().includes(q);
}

function getCurrentToken(value, cursorPos) {
  const before = value.slice(0, cursorPos);
  const lastComma = before.lastIndexOf(',');
  const tokenStart = lastComma >= 0 ? lastComma + 1 : 0;
  return { token: before.slice(tokenStart).trim(), tokenStart, hasPrefix: lastComma >= 0 };
}

function insertSuggestion(value, cursorPos, tokenStart, suggestion, hasPrefix) {
  const before = value.slice(0, tokenStart);
  const after = value.slice(cursorPos);
  const prefix = hasPrefix ? ', ' : '';
  const newVal = before + prefix + suggestion + ', ' + after.replace(/^[\s,]+/, '');
  const newCursor = (before + prefix + suggestion + ', ').length;
  return { value: newVal, cursorPos: newCursor };
}

export default function AutocompleteInput({
  value = '',
  onChange,
  suggestions = [],
  placeholder,
  className = '',
  multiline = false,
  required = false,
  id,
  label,
  disabled = false,
}) {
  const [show, setShow] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query) return [];
    return suggestions.filter(matchQuery(query)).slice(0, 10);
  }, [query, suggestions]);

  useEffect(() => {
    if (filtered.length > 0 && activeIdx >= 0) {
      const el = listRef.current?.children[activeIdx];
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIdx, filtered.length]);

  function handleInput(e) {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    onChange(val);
    const { token } = getCurrentToken(val, pos);
    setQuery(token);
    setShow(token.length > 0 && suggestions.length > 0);
    setActiveIdx(-1);
  }

  function handleKeyDown(e) {
    if (!show || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      selectSuggestion(filtered[activeIdx]);
    } else if (e.key === 'Escape') {
      setShow(false);
      setActiveIdx(-1);
    }
  }

  function selectSuggestion(suggestion) {
    const input = inputRef.current;
    const pos = input?.selectionStart || value.length;
    const { tokenStart, hasPrefix } = getCurrentToken(value, pos);
    const result = insertSuggestion(value, pos, tokenStart, suggestion, hasPrefix);
    onChange(result.value);
    setShow(false);
    setActiveIdx(-1);
    setQuery('');
    setTimeout(() => {
      input?.focus();
      input?.setSelectionRange(result.cursorPos, result.cursorPos);
    }, 0);
  }

  function handleFocus() {
    const input = inputRef.current;
    if (input) {
      const pos = input.selectionStart || value.length;
      const { token } = getCurrentToken(value, pos);
      setQuery(token);
      setShow(token.length > 0 && suggestions.length > 0);
    }
  }

  function handleBlur(e) {
    if (e.relatedTarget?.closest('.ac-dropdown')) return;
    setTimeout(() => setShow(false), 150);
  }

  const Tag = multiline ? 'textarea' : 'input';

  return (
    <div className={'ac-wrapper' + (className ? ' ' + className : '')}>
      <Tag
        ref={inputRef}
        id={id}
        className={(multiline ? 'form-textarea' : 'form-input') + ' ac-input'}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={multiline ? 3 : undefined}
        autoComplete="off"
      />
      {show && filtered.length > 0 && (
        <div className="ac-dropdown" ref={listRef} role="listbox">
          {filtered.map((item, i) => {
            const q = query.toLowerCase();
            const idx = item.toLowerCase().indexOf(q);
            const before = item.slice(0, idx);
            const match = item.slice(idx, idx + q.length);
            const after = item.slice(idx + q.length);
            return (
              <div
                key={item}
                className={'ac-option' + (i === activeIdx ? ' ac-active' : '')}
                onMouseDown={(e) => { e.preventDefault(); selectSuggestion(item); }}
                onMouseEnter={() => setActiveIdx(i)}
                role="option"
                aria-selected={i === activeIdx}
              >
                <span className="ac-icon">+</span>
                <span>{before}<strong>{match}</strong>{after}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
