# Self-Loan Tracker

**Track whether borrowing against your investments is keeping pace with the market — and how much you're saving versus a bank loan.**

Most people with investment portfolios don't realise they can borrow against them instead of going to a bank. Your investments keep compounding. Your repayments go back to your own wealth. The bank gets nothing.

The problem: there's no easy way to know if you're actually winning. Is the market outrunning your repayments? Are you ahead or behind? This tool answers that question.

---

## What it does

- **Tracks every drawdown** — log each time you take money from your portfolio with the date and amount
- **Live market data** — pulls real-time S&P 500 price via free API, or enter manually
- **Break-even calculator** — shows the exact monthly repayment needed to keep pace with your expected return rate
- **Gap tracking** — real-time difference between what you've repaid and what your portfolio would be worth untouched
- **Bank loan comparison** — calculates what you would have paid a bank at standard personal loan rates, so you can see exactly what you're saving

---

## Privacy first

Your financial data never leaves your device.

- Runs entirely in your browser — no server, no backend
- All data stored in `localStorage` on your machine only
- No account, no sign-up, no tracking
- Single HTML file — inspect every line of code yourself

---

## Getting started

**Option 1 — Use it directly (no setup)**

👉 **[Open the tracker](https://your-username.github.io/self-loan-tracker)**

**Option 2 — Run locally**

1. Download `tracker.html`
2. Open it in any browser
3. Done

---

## Setup (2 minutes)

The tracker uses free market data from [Alpha Vantage](https://www.alphavantage.co/support/#api-key).

1. Get a free API key at [alphavantage.co](https://www.alphavantage.co/support/#api-key) — takes 30 seconds, no credit card
2. Paste the key into the Settings panel inside the tracker
3. Hit "Refresh Price" — live data loads instantly

If you'd prefer not to use an API key, you can enter the current index price manually at any time.

---

## How to use it

**1. Log your drawdowns**
Each time you take money from your portfolio, add a drawdown entry with the date, amount, and the index price on that day.

**2. Set your target return**
In Settings, enter your expected annual return rate (e.g. 10% for a broad market index fund). This is used to calculate your break-even monthly repayment.

**3. Log repayments**
As you pay money back, log each repayment. The tracker updates your gap in real time.

**4. Read the dashboard**
- **Green gap** — you're ahead. Your repayments are outpacing the market.
- **Red gap** — you're behind. The market has grown faster than your repayments.
- **Bank savings** — the running total of interest you haven't paid to a bank.

---

## The strategy explained

A self-loan (also called a portfolio-backed loan) works like this:

Instead of going to a bank when you need cash, you borrow against your own investment portfolio. The mechanics vary by provider — some offer this as a formal facility, others allow partial withdrawals with a repayment structure you manage yourself.

**Why it can make sense:**
- Your investments keep compounding while you repay
- Every repayment rebuilds your own net worth, not a bank's
- No credit check, no bank approval process
- The "interest cost" is the opportunity cost of the drawn-down amount — which you're paying back to yourself

**The risk:**
If the market grows faster than your repayment rate, the gap widens. You need to track this. That's what this tool is for.

> **This is not financial advice.** Self-loan strategies carry real risk including market volatility and liquidity risk. Speak to a qualified financial adviser before using this strategy.

---

## Roadmap

- [ ] Multiple benchmark support (compare against different indices)
- [ ] CSV export of all transactions
- [ ] Adjustable loan term for break-even calculation
- [ ] Dark / light theme toggle

---

## Contributing

Found a bug or have a feature suggestion? Open an issue — feedback is welcome.

If you're using this tool and finding it useful, a ⭐ on the repo helps others find it.

---

## Licence

MIT — free to use, modify, and share.
