# Quant V2 — iPhone research prototype

Requirements: Node.js 20+ (recommended 22+). No npm dependencies.

## Local run

```bash
npm test
npm start
```

Open http://localhost:3000 on the host computer. For iPhone on same Wi-Fi, bind is already 0.0.0.0; use the computer's LAN IP and port 3000, subject to firewall.

## Deploy using Codex

1. Unzip and commit project to a private GitHub repository.
2. Open the repository in Codex and ask: "Run npm test, start the app, verify /api/health and /api/backtest?symbol=SPY, then fix any errors. Do not substitute simulated prices if the provider fails."
3. Deploy to a Node-compatible host (e.g. Render web service). Build command: `npm test`; start command: `npm start`; runtime Node 22; service listens on `process.env.PORT`.
4. Visit HTTPS deployment URL on iPhone Safari; Share > Add to Home Screen.

## Limitations

- Uses Yahoo Finance chart endpoint (unofficial, subject to throttling and changes); real historical data only when the endpoint succeeds. Provider access and completeness must be verified at deployment.
- Signals from adjusted daily closes; trades approximated at the following day's adjusted close (not directly executable). Costs: 5 bps fees + 5 bps slippage per side.
- One ETF backtested at a time. No persistent paper brokerage ledger, order entry, or real-time execution yet.
- UI displays A$1,000 target paper budget, but backtest starts with illustrative US$650; **FX conversion is not implemented**.
- A 10% drawdown halt is checked once per day and can exceed threshold. No leverage, no shorting. Backtests do not predict future results.
- Historical adjusted prices may be retrospectively revised by the provider. Dividend treatment is an approximation; no taxes or cash distributions ledger.
