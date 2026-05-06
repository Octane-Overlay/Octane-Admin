import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';

const BRIDGE_URL = 'http://127.0.0.1:49124';
const META_ENDPOINT = `${BRIDGE_URL}/meta`;
const POST_DEBOUNCE_MS = 250;
const MAX_LOGO_BYTES = 500_000;
const BEST_OF_OPTIONS = [1, 3, 5, 7, 9];

type Side = 'blue' | 'orange';

type SideMeta = {
  name: string;
  logo: string;
  wins: number;
};

type Meta = {
  bestOf: number;
  blue: SideMeta;
  orange: SideMeta;
};

const DEFAULT_META: Meta = {
  bestOf: 5,
  blue: { name: '', logo: '', wins: 0 },
  orange: { name: '', logo: '', wins: 0 },
};

type Status = 'loading' | 'ready' | 'saving' | 'error';

function App() {
  const [meta, setMeta] = useState<Meta>(DEFAULT_META);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const postTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextPost = useRef(true);

  useEffect(() => {
    let cancelled = false;
    fetch(META_ENDPOINT)
      .then((res) => {
        if (!res.ok) throw new Error(`GET /meta returned ${res.status}`);
        return res.json();
      })
      .then((data: Meta) => {
        if (cancelled) return;
        setMeta({ ...DEFAULT_META, ...data });
        setStatus('ready');
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setErrorMsg(err.message);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (skipNextPost.current) {
      skipNextPost.current = false;
      return;
    }
    if (status === 'loading' || status === 'error') return;

    if (postTimer.current) clearTimeout(postTimer.current);
    postTimer.current = setTimeout(() => {
      setStatus('saving');
      fetch(META_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`POST /meta returned ${res.status}`);
          setStatus('ready');
          setErrorMsg(null);
        })
        .catch((err: Error) => {
          setErrorMsg(err.message);
          setStatus('error');
        });
    }, POST_DEBOUNCE_MS);

    return () => {
      if (postTimer.current) clearTimeout(postTimer.current);
    };
  }, [meta, status]);

  const updateSide = useCallback((side: Side, patch: Partial<SideMeta>) => {
    setMeta((prev) => ({ ...prev, [side]: { ...prev[side], ...patch } }));
  }, []);

  const handleLogoFile = (side: Side, file: File | null | undefined) => {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      alert(
        `Logo too large (${Math.round(file.size / 1024)}KB). Keep it under ${MAX_LOGO_BYTES / 1000}KB.`,
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateSide(side, { logo: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const winsNeeded = Math.ceil(meta.bestOf / 2);

  if (status === 'loading') {
    return (
      <div className="control-panel">
        <h1>Overlay controls</h1>
        <p className="control-hint">Connecting to bridge at <code>{META_ENDPOINT}</code>…</p>
      </div>
    );
  }

  return (
    <div className="control-panel">
      <h1>Overlay controls</h1>
      <p className="control-hint">
        Talking to <code>{META_ENDPOINT}</code>. Changes are saved automatically; the overlay updates live.
      </p>
      <div className="control-status">
        <StatusBadge status={status} error={errorMsg} />
      </div>

      <div className="control-section">
        <label className="control-row">
          <span>Series length</span>
          <select
            value={meta.bestOf}
            onChange={(e) =>
              setMeta((prev) => {
                const bestOf = Number(e.target.value);
                const cap = Math.ceil(bestOf / 2);
                return {
                  ...prev,
                  bestOf,
                  blue: { ...prev.blue, wins: Math.min(prev.blue.wins, cap) },
                  orange: { ...prev.orange, wins: Math.min(prev.orange.wins, cap) },
                };
              })
            }
          >
            {BEST_OF_OPTIONS.map((n) => (
              <option key={n} value={n}>
                Best of {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {(['blue', 'orange'] as const).map((side) => {
        const s = meta[side];
        return (
          <div key={side} className={`control-section control-side control-side-${side}`}>
            <h2>{side === 'blue' ? 'Blue team' : 'Orange team'}</h2>

            <label className="control-row">
              <span>Name</span>
              <input
                type="text"
                value={s.name}
                onChange={(e) => updateSide(side, { name: e.target.value })}
                placeholder={side === 'blue' ? 'Blue' : 'Orange'}
              />
            </label>

            <label className="control-row">
              <span>Logo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleLogoFile(side, e.target.files?.[0])}
              />
            </label>

            {s.logo && (
              <div className="control-logo-preview">
                <img src={s.logo} alt="" />
                <button type="button" onClick={() => updateSide(side, { logo: '' })}>
                  Clear logo
                </button>
              </div>
            )}

            <label className="control-row">
              <span>Series wins</span>
              <div className="control-wins">
                <button
                  type="button"
                  onClick={() => updateSide(side, { wins: Math.max(0, s.wins - 1) })}
                  disabled={s.wins <= 0}
                >
                  −
                </button>
                <span className="control-wins-value">
                  {s.wins} / {winsNeeded}
                </span>
                <button
                  type="button"
                  onClick={() => updateSide(side, { wins: Math.min(winsNeeded, s.wins + 1) })}
                  disabled={s.wins >= winsNeeded}
                >
                  +
                </button>
              </div>
            </label>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status, error }: { status: Status; error: string | null }) {
  if (status === 'saving') return <span className="status-badge status-saving">saving…</span>;
  if (status === 'error') return <span className="status-badge status-error">error: {error ?? 'unknown'}</span>;
  return <span className="status-badge status-ready">saved</span>;
}

export default App;
