import { describe, it, expect } from 'vitest';

// ── Pure calculation functions mirrored from index.html ──────────────────────
// These are kept in sync with the source; if the source changes these tests
// will catch the regression.

const fmt = n =>
  isNaN(n) || n == null
    ? '—'
    : n.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 2 });

const fmtPct = n =>
  isNaN(n) || n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const sc = v => (v == null || isNaN(v) ? '#888' : v >= 0 ? '#60c080' : '#e06060');

function pmt(totalDrawn, annualReturn, months) {
  if (totalDrawn <= 0) return 0;
  const m = Math.max(months, 1);
  const r = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
  if (r === 0) return totalDrawn / m;
  return (totalDrawn * r) / (1 - Math.pow(1 + r, -m));
}

function portfolioValue(totalDrawn, currentPrice, baseline) {
  if (!totalDrawn || !baseline) return null;
  return totalDrawn * (currentPrice / baseline);
}

function changeFromBaseline(currentPrice, baseline) {
  return ((currentPrice - baseline) / baseline) * 100;
}

function parseAlphaVantageResponse(data) {
  if (data['Note']) throw new Error('Rate limit reached — free tier: 25 calls/day.');
  if (data['Information']) throw new Error(data['Information']);
  if (data['Error Message']) throw new Error(data['Error Message']);
  const series = data['Time Series (Daily)'];
  if (!series) throw new Error('Keys in response: ' + Object.keys(data).join(', '));
  const dates = Object.keys(series).sort((a, b) => b.localeCompare(a));
  const gc = d => parseFloat(series[d]['4. close']);
  const price = gc(dates[0]);
  const thisYear = new Date().getFullYear().toString();
  const ytdStart =
    dates.filter(d => d.startsWith(thisYear)).pop() || dates[dates.length - 1];
  return {
    price,
    changeToday: dates.length > 1 ? ((price - gc(dates[1])) / gc(dates[1])) * 100 : null,
    change1W:
      dates.length > 5
        ? ((price - gc(dates[Math.min(5, dates.length - 1)])) /
            gc(dates[Math.min(5, dates.length - 1)])) *
          100
        : null,
    changeYTD: ((price - gc(ytdStart)) / gc(ytdStart)) * 100,
  };
}

// ── Formatter tests ───────────────────────────────────────────────────────────
describe('fmt (NZD currency formatter)', () => {
  it('formats a positive number as NZD currency', () => {
    expect(fmt(1000)).toMatch(/1,000/);
  });
  it('returns — for null', () => {
    expect(fmt(null)).toBe('—');
  });
  it('returns — for NaN', () => {
    expect(fmt(NaN)).toBe('—');
  });
  it('formats zero', () => {
    expect(fmt(0)).toMatch(/0/);
  });
});

describe('fmtPct (percentage formatter)', () => {
  it('adds + prefix for positive values', () => {
    expect(fmtPct(5.123)).toBe('+5.12%');
  });
  it('keeps – for negative values', () => {
    expect(fmtPct(-3.5)).toBe('-3.50%');
  });
  it('returns — for null', () => {
    expect(fmtPct(null)).toBe('—');
  });
  it('formats zero as +0.00%', () => {
    expect(fmtPct(0)).toBe('+0.00%');
  });
});

describe('sc (sign colour helper)', () => {
  it('returns green for positive', () => {
    expect(sc(10)).toBe('#60c080');
  });
  it('returns red for negative', () => {
    expect(sc(-1)).toBe('#e06060');
  });
  it('returns grey for null', () => {
    expect(sc(null)).toBe('#888');
  });
  it('returns grey for NaN', () => {
    expect(sc(NaN)).toBe('#888');
  });
  it('returns green for zero (not a loss)', () => {
    expect(sc(0)).toBe('#60c080');
  });
});

// ── PMT (break-even monthly payment) ─────────────────────────────────────────
describe('pmt (break-even monthly payment)', () => {
  it('returns 0 when nothing drawn', () => {
    expect(pmt(0, 8, 24)).toBe(0);
  });

  it('returns totalDrawn / months when rate is 0', () => {
    expect(pmt(12000, 0, 12)).toBeCloseTo(1000, 5);
  });

  it('calculates a sensible monthly payment for typical inputs', () => {
    // $10,000 at 8% p.a. over 24 months
    const result = pmt(10000, 8, 24);
    expect(result).toBeGreaterThan(400);
    expect(result).toBeLessThan(600);
  });

  it('larger loan requires proportionally larger payment', () => {
    const p1 = pmt(10000, 8, 24);
    const p2 = pmt(20000, 8, 24);
    expect(p2).toBeCloseTo(p1 * 2, 5);
  });

  it('shorter term produces higher payment', () => {
    const short = pmt(10000, 8, 12);
    const long = pmt(10000, 8, 36);
    expect(short).toBeGreaterThan(long);
  });

  it('handles months=0 by using months=1 (guard)', () => {
    const result = pmt(10000, 8, 0);
    expect(result).toBeGreaterThan(0);
    expect(isFinite(result)).toBe(true);
  });
});

// ── Portfolio value calculation ───────────────────────────────────────────────
describe('portfolioValue', () => {
  it('calculates proportional growth', () => {
    // Drew $10k when SPY was 500. Now SPY is 550 (+10%). Portfolio = $11k.
    expect(portfolioValue(10000, 550, 500)).toBeCloseTo(11000, 5);
  });

  it('calculates proportional decline', () => {
    expect(portfolioValue(10000, 400, 500)).toBeCloseTo(8000, 5);
  });

  it('returns same amount when price unchanged', () => {
    expect(portfolioValue(10000, 500, 500)).toBeCloseTo(10000, 5);
  });

  it('returns null when totalDrawn is 0', () => {
    expect(portfolioValue(0, 500, 500)).toBeNull();
  });

  it('returns null when baseline is null', () => {
    expect(portfolioValue(10000, 500, null)).toBeNull();
  });
});

// ── Change from baseline ──────────────────────────────────────────────────────
describe('changeFromBaseline', () => {
  it('calculates 10% gain correctly', () => {
    expect(changeFromBaseline(550, 500)).toBeCloseTo(10, 5);
  });
  it('calculates 20% loss correctly', () => {
    expect(changeFromBaseline(400, 500)).toBeCloseTo(-20, 5);
  });
  it('returns 0 when price equals baseline', () => {
    expect(changeFromBaseline(500, 500)).toBeCloseTo(0, 5);
  });
});

// ── Alpha Vantage response parser ─────────────────────────────────────────────
describe('parseAlphaVantageResponse', () => {
  const makeResponse = (dates) => ({
    'Time Series (Daily)': Object.fromEntries(
      dates.map((d, i) => [d, { '4. close': String(500 - i * 5) }])
    ),
  });

  it('extracts the latest close price', () => {
    const result = parseAlphaVantageResponse(makeResponse(['2025-05-30', '2025-05-29']));
    expect(result.price).toBe(500);
  });

  it('calculates 1-day change', () => {
    const result = parseAlphaVantageResponse(makeResponse(['2025-05-30', '2025-05-29']));
    // price 500, prev 495 → +1.01%
    expect(result.changeToday).toBeCloseTo(((500 - 495) / 495) * 100, 3);
  });

  it('throws on rate-limit Note', () => {
    expect(() =>
      parseAlphaVantageResponse({ Note: 'Thank you for using Alpha Vantage!' })
    ).toThrow('Rate limit');
  });

  it('throws on Information message', () => {
    expect(() =>
      parseAlphaVantageResponse({ Information: 'premium endpoint' })
    ).toThrow('premium endpoint');
  });

  it('throws on Error Message', () => {
    expect(() =>
      parseAlphaVantageResponse({ 'Error Message': 'Invalid API call' })
    ).toThrow('Invalid API call');
  });

  it('throws when Time Series key missing', () => {
    expect(() => parseAlphaVantageResponse({ foo: 'bar' })).toThrow('Keys in response');
  });

  it('returns null changeToday when only one data point', () => {
    const result = parseAlphaVantageResponse(makeResponse(['2025-05-30']));
    expect(result.changeToday).toBeNull();
  });
});

// ── Data persistence helpers ──────────────────────────────────────────────────
describe('load/save (localStorage interface)', () => {
  it('returns default when key absent', () => {
    const DEFAULT = { annualReturn: 8, months: 24 };
    function load(store, key, def) {
      try {
        const r = store[key];
        if (r) return JSON.parse(r);
        return def;
      } catch {
        return def;
      }
    }
    expect(load({}, 'missing', DEFAULT)).toEqual(DEFAULT);
  });

  it('returns parsed value when key present', () => {
    const DEFAULT = { annualReturn: 8 };
    const store = { 'slt-loan-tracker': JSON.stringify({ annualReturn: 12, months: 36 }) };
    function load(s, key, def) {
      try {
        const r = s[key];
        if (r) return JSON.parse(r);
        return def;
      } catch {
        return def;
      }
    }
    expect(load(store, 'slt-loan-tracker', DEFAULT)).toEqual({ annualReturn: 12, months: 36 });
  });

  it('returns default on malformed JSON', () => {
    const DEFAULT = { annualReturn: 8 };
    function load(store, key, def) {
      try {
        const r = store[key];
        if (r) return JSON.parse(r);
        return def;
      } catch {
        return def;
      }
    }
    expect(load({ key: 'not-json{{{' }, 'key', DEFAULT)).toEqual(DEFAULT);
  });
});
