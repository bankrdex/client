import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { formatPct, formatRelative, formatTokenAmount, formatUsd } from "./format";
import { isValidMnemonic, quoteSwap } from "./engine";
import { portfolioChange, portfolioUsd, useWallet } from "./store";
import { TOKEN_LIST, TOKENS, type TokenId } from "./tokens";

type View =
  | "home"
  | "send"
  | "receive"
  | "buy"
  | "swap"
  | "activity"
  | "collectibles"
  | "backup"
  | "token";

const CSS = `
.fcw{color:#efeaf8;font-family:ui-sans-serif,system-ui,sans-serif;padding:8px 0 32px}
.fcw *{box-sizing:border-box}
.fcw button{cursor:pointer;font:inherit;color:inherit}
.fcw input,.fcw textarea{font:inherit;color:inherit}
.fcw-center{text-align:center;padding:24px 16px 8px}
.fcw-muted{color:#9b93ab;font-size:13px}
.fcw-total{font-size:36px;font-weight:650;letter-spacing:-.03em;margin:4px 0}
.fcw-gain{color:#3ddc97} .fcw-loss{color:#ff6b7a}
.fcw-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:20px 16px}
.fcw-action{display:flex;flex-direction:column;align-items:center;gap:8px;background:#1a1822;border:0;border-radius:16px;padding:12px 4px;font-size:12px;font-weight:600}
.fcw-action i{width:44px;height:44px;border-radius:999px;background:#8a63d2;display:grid;place-items:center;font-style:normal;font-size:18px}
.fcw-row{display:flex;align-items:center;gap:12px;width:100%;background:transparent;border:0;text-align:left;padding:12px 16px}
.fcw-row:hover{background:#16141c}
.fcw-icon{width:36px;height:36px;border-radius:999px;display:grid;place-items:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0}
.fcw-grow{flex:1;min-width:0}
.fcw-between{display:flex;justify-content:space-between;gap:8px}
.fcw-h{display:flex;justify-content:space-between;align-items:center;padding:16px 16px 4px}
.fcw-h h2{margin:0;font-size:14px}
.fcw-link{background:0;border:0;color:#8a63d2;font-size:13px;padding:0}
.fcw-back{background:0;border:0;color:#9b93ab;padding:8px 16px;font-size:13px}
.fcw-pad{padding:16px}
.fcw-field{width:100%;background:#1a1822;border:1px solid #2a2733;border-radius:16px;padding:12px 14px;outline:none}
.fcw-field:focus{border-color:#8a63d2}
.fcw-chip{background:#1a1822;border:0;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:600}
.fcw-chip.on{background:#8a63d2;color:#fff}
.fcw-amount{width:100%;background:transparent;border:0;font-size:44px;font-weight:650;outline:none;padding:8px 0}
.fcw-primary{width:100%;border:0;border-radius:999px;background:#8a63d2;color:#fff;font-weight:650;padding:14px;margin-top:20px}
.fcw-primary:disabled{opacity:.4}
.fcw-warn{margin:16px;padding:12px;border-radius:12px;background:#2a2030;color:#d7c6f0;font-size:12px;line-height:1.45}
.fcw-nft{width:100%;aspect-ratio:1;border-radius:16px;display:grid;place-items:center;font-weight:700;font-size:22px;color:#fff}
.fcw-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px 16px}
.fcw-qr{width:220px;height:220px;margin:16px auto;background:#fff;border-radius:16px;display:grid;place-items:center;color:#111;font-size:12px;text-align:center;padding:16px;word-break:break-all}
.fcw-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
`;

function Icon({ token, size = 36 }: { token: (typeof TOKEN_LIST)[number]; size?: number }) {
  return (
    <span
      className="fcw-icon"
      style={{ width: size, height: size, background: token.colorVar }}
    >
      {token.symbol.slice(0, 3)}
    </span>
  );
}

export function WalletApp() {
  const bootstrap = useWallet((s) => s.bootstrap);
  const [view, setView] = useState<View>("home");
  const [tokenId, setTokenId] = useState<TokenId>("eth");

  useEffect(() => {
    void Promise.resolve(useWallet.persist.rehydrate()).then(() => bootstrap());
  }, [bootstrap]);

  return (
    <div className="fcw">
      <style>{CSS}</style>
      {view !== "home" && (
        <button type="button" className="fcw-back" onClick={() => setView("home")}>
          ← Wallet
        </button>
      )}
      {view === "home" && <Home go={setView} openToken={(id) => { setTokenId(id); setView("token"); }} />}
      {view === "send" && <Send />}
      {view === "receive" && <Receive />}
      {view === "buy" && <Buy />}
      {view === "swap" && <Swap />}
      {view === "activity" && <Activity />}
      {view === "collectibles" && <Collectibles />}
      {view === "backup" && <Backup />}
      {view === "token" && <TokenDetail id={tokenId} go={setView} />}
    </div>
  );
}

function Home({
  go,
  openToken,
}: {
  go: (v: View) => void;
  openToken: (id: TokenId) => void;
}) {
  const balances = useWallet((s) => s.balances);
  const txs = useWallet((s) => s.txs);
  const collectibles = useWallet((s) => s.collectibles);
  const total = portfolioUsd(balances);
  const change = portfolioChange(balances);
  const visible = TOKEN_LIST.filter((t) => (balances[t.id] ?? 0) > 0).sort(
    (a, b) => (balances[b.id] ?? 0) * b.priceUsd - (balances[a.id] ?? 0) * a.priceUsd,
  );

  return (
    <>
      <div className="fcw-center">
        <div className="fcw-muted">Total balance</div>
        <div className="fcw-total">{formatUsd(total)}</div>
        <div className={change >= 0 ? "fcw-gain" : "fcw-loss"}>{formatPct(change)} today</div>
      </div>
      <div className="fcw-actions">
        {([
          ["send", "↑", "Send"],
          ["receive", "↓", "Receive"],
          ["buy", "$", "Buy"],
          ["swap", "⇄", "Swap"],
        ] as const).map(([v, i, l]) => (
          <button key={v} type="button" className="fcw-action" onClick={() => go(v)}>
            <i>{i}</i>
            {l}
          </button>
        ))}
      </div>
      <div className="fcw-h">
        <h2>Tokens</h2>
        <button type="button" className="fcw-link" onClick={() => go("activity")}>
          Activity
        </button>
      </div>
      {visible.map((t) => {
        const amt = balances[t.id] ?? 0;
        return (
          <button key={t.id} type="button" className="fcw-row" onClick={() => openToken(t.id)}>
            <Icon token={t} />
            <span className="fcw-grow">
              <span className="fcw-between">
                <strong>{t.symbol}</strong>
                <strong>{formatUsd(amt * t.priceUsd)}</strong>
              </span>
              <span className="fcw-between fcw-muted">
                <span>
                  {formatTokenAmount(amt)} · {t.chainLabel}
                </span>
                <span className={t.change24h >= 0 ? "fcw-gain" : "fcw-loss"}>
                  {formatPct(t.change24h)}
                </span>
              </span>
            </span>
          </button>
        );
      })}
      <div className="fcw-h">
        <h2>Collectibles</h2>
        <button type="button" className="fcw-link" onClick={() => go("collectibles")}>
          All
        </button>
      </div>
      <div className="fcw-grid">
        {collectibles.slice(0, 3).map((n) => (
          <div key={n.id} className="fcw-nft" style={{ background: n.color }}>
            {n.mark}
          </div>
        ))}
      </div>
      <div className="fcw-h">
        <h2>Recent</h2>
        <button type="button" className="fcw-link" onClick={() => go("backup")}>
          Settings
        </button>
      </div>
      {txs.slice(0, 4).map((tx) => (
        <div key={tx.id} className="fcw-row">
          <span className="fcw-grow">
            <span className="fcw-between">
              <strong>{tx.title}</strong>
              <span className={tx.usd >= 0 ? "fcw-gain" : "fcw-loss"}>
                {formatUsd(tx.usd)}
              </span>
            </span>
            <span className="fcw-muted">
              {tx.subtitle} · {formatRelative(tx.ts)} · {tx.status}
            </span>
          </span>
        </div>
      ))}
      <p className="fcw-warn">
        Local demo wallet. Recovery phrase lives in this browser only. Not for mainnet
        funds. Swap, buy, sell, and send update the in-client ledger.
      </p>
    </>
  );
}

function Send() {
  const balances = useWallet((s) => s.balances);
  const send = useWallet((s) => s.send);
  const [to, setTo] = useState("");
  const [tokenId, setTokenId] = useState<TokenId>("usdc");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  const n = Number(amount) || 0;
  return (
    <FormShell title="Send">
      <label className="fcw-muted">To</label>
      <input className="fcw-field" placeholder="0x… or name.eth" value={to} onChange={(e) => setTo(e.target.value)} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        {TOKEN_LIST.filter((t) => balances[t.id] > 0).map((t) => (
          <button key={t.id} type="button" className={`fcw-chip${tokenId === t.id ? " on" : ""}`} onClick={() => setTokenId(t.id)}>
            {t.symbol}
          </button>
        ))}
      </div>
      <input className="fcw-amount" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
      <div className="fcw-muted">
        {formatUsd(n * TOKENS[tokenId].priceUsd)} · available {formatTokenAmount(balances[tokenId])} {TOKENS[tokenId].symbol}
      </div>
      <button
        type="button"
        className="fcw-primary"
        disabled={!to || n <= 0}
        onClick={() => {
          try {
            send({ tokenId, to, amount: n });
            setMsg("Sent");
            setAmount("");
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Failed");
          }
        }}
      >
        Send
      </button>
      {msg && <p className="fcw-muted" style={{ marginTop: 12 }}>{msg}</p>}
    </FormShell>
  );
}

function Receive() {
  const address = useWallet((s) => s.address);
  const sol = useWallet((s) => s.solanaAddress);
  const receiveDemo = useWallet((s) => s.receiveDemo);
  const [chain, setChain] = useState<"evm" | "sol">("evm");
  const [copied, setCopied] = useState(false);
  const value = chain === "evm" ? address ?? "" : sol ?? "";
  return (
    <FormShell title="Receive">
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button type="button" className={`fcw-chip${chain === "evm" ? " on" : ""}`} onClick={() => setChain("evm")}>
          Base / EVM
        </button>
        <button type="button" className={`fcw-chip${chain === "sol" ? " on" : ""}`} onClick={() => setChain("sol")}>
          Solana
        </button>
      </div>
      <div className="fcw-qr">Scan in a real wallet app.<br /><br /><span className="fcw-mono">{value}</span></div>
      <button
        type="button"
        className="fcw-primary"
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setCopied(true);
        }}
      >
        {copied ? "Copied" : "Copy address"}
      </button>
      <button
        type="button"
        className="fcw-chip"
        style={{ marginTop: 12 }}
        onClick={() => receiveDemo("usdc", 25, "demo.eth")}
      >
        Simulate +25 USDC
      </button>
    </FormShell>
  );
}

function Buy() {
  const cash = useWallet((s) => s.cashUsd);
  const buy = useWallet((s) => s.buy);
  const [usd, setUsd] = useState("50");
  const [tokenId, setTokenId] = useState<TokenId>("eth");
  const [msg, setMsg] = useState("");
  const n = Number(usd) || 0;
  const token = TOKENS[tokenId];
  return (
    <FormShell title="Buy">
      <p className="fcw-muted">Pay with debit · ••4242 · buying power {formatUsd(cash)}</p>
      <input className="fcw-amount" inputMode="decimal" value={usd} onChange={(e) => setUsd(e.target.value.replace(/[^0-9.]/g, ""))} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[25, 50, 100, 250].map((p) => (
          <button key={p} type="button" className="fcw-chip" onClick={() => setUsd(String(p))}>
            ${p}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {(["eth", "usdc", "degen", "sol"] as TokenId[]).map((id) => (
          <button key={id} type="button" className={`fcw-chip${tokenId === id ? " on" : ""}`} onClick={() => setTokenId(id)}>
            {TOKENS[id].symbol}
          </button>
        ))}
      </div>
      <p className="fcw-muted" style={{ marginTop: 12 }}>
        You get {formatTokenAmount(n / token.priceUsd)} {token.symbol}
      </p>
      <button
        type="button"
        className="fcw-primary"
        disabled={n <= 0}
        onClick={() => {
          try {
            buy(tokenId, n);
            setMsg(`Bought ${token.symbol}`);
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Failed");
          }
        }}
      >
        Buy {token.symbol}
      </button>
      {msg && <p className="fcw-muted" style={{ marginTop: 12 }}>{msg}</p>}
    </FormShell>
  );
}

function Swap() {
  const balances = useWallet((s) => s.balances);
  const swap = useWallet((s) => s.swap);
  const sell = useWallet((s) => s.sell);
  const [from, setFrom] = useState<TokenId>("eth");
  const [to, setTo] = useState<TokenId>("usdc");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  const n = Number(amount) || 0;
  const q = n > 0 ? quoteSwap(from, to, n) : null;
  return (
    <FormShell title="Swap">
      <TokenPick value={from} onChange={setFrom} />
      <input className="fcw-amount" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
      <div className="fcw-muted">Available {formatTokenAmount(balances[from])} {TOKENS[from].symbol}</div>
      <button
        type="button"
        className="fcw-chip"
        style={{ margin: "12px 0" }}
        onClick={() => {
          setFrom(to);
          setTo(from);
        }}
      >
        ⇄ Flip
      </button>
      <TokenPick value={to} onChange={setTo} />
      {q && (
        <p className="fcw-muted">
          You receive {formatTokenAmount(q.out)} {TOKENS[to].symbol} · fee {formatUsd(q.feeUsd)}
        </p>
      )}
      <button
        type="button"
        className="fcw-primary"
        disabled={n <= 0 || from === to}
        onClick={() => {
          try {
            swap(from, to, n);
            setMsg("Swapped");
            setAmount("");
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Failed");
          }
        }}
      >
        Swap {TOKENS[from].symbol} → {TOKENS[to].symbol}
      </button>
      <button
        type="button"
        className="fcw-chip"
        style={{ marginTop: 12 }}
        onClick={() => {
          try {
            sell(from, n);
            setMsg("Sold to USDC");
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Failed");
          }
        }}
      >
        Sell to USDC
      </button>
      {msg && <p className="fcw-muted" style={{ marginTop: 12 }}>{msg}</p>}
    </FormShell>
  );
}

function TokenPick({ value, onChange }: { value: TokenId; onChange: (id: TokenId) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
      {TOKEN_LIST.map((t) => (
        <button key={t.id} type="button" className={`fcw-chip${value === t.id ? " on" : ""}`} onClick={() => onChange(t.id)}>
          {t.symbol}
        </button>
      ))}
    </div>
  );
}

function Activity() {
  const txs = useWallet((s) => s.txs);
  return (
    <FormShell title="Activity">
      {txs.map((tx) => (
        <div key={tx.id} className="fcw-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <span className="fcw-grow">
            <span className="fcw-between">
              <strong>{tx.title}</strong>
              <span className={tx.usd >= 0 ? "fcw-gain" : "fcw-loss"}>{formatUsd(tx.usd)}</span>
            </span>
            <span className="fcw-muted">{tx.subtitle} · {formatRelative(tx.ts)} · {tx.status}</span>
          </span>
        </div>
      ))}
    </FormShell>
  );
}

function Collectibles() {
  const nfts = useWallet((s) => s.collectibles);
  const sendCollectible = useWallet((s) => s.sendCollectible);
  const [to, setTo] = useState("dwr.eth");
  return (
    <FormShell title="Collectibles">
      <div className="fcw-grid" style={{ padding: 0 }}>
        {nfts.map((n) => (
          <button
            key={n.id}
            type="button"
            className="fcw-nft"
            style={{ background: n.color } as CSSProperties}
            onClick={() => sendCollectible(n.id, to)}
            title={`Send ${n.name}`}
          >
            {n.mark}
          </button>
        ))}
      </div>
      <input className="fcw-field" style={{ marginTop: 16 }} value={to} onChange={(e) => setTo(e.target.value)} />
      <p className="fcw-muted">Tap a collectible to send it.</p>
    </FormShell>
  );
}

function Backup() {
  const mnemonic = useWallet((s) => s.mnemonic);
  const address = useWallet((s) => s.address);
  const apps = useWallet((s) => s.connectedApps);
  const createWallet = useWallet((s) => s.createWallet);
  const importWallet = useWallet((s) => s.importWallet);
  const resetDemo = useWallet((s) => s.resetDemo);
  const disconnectApp = useWallet((s) => s.disconnectApp);
  const [reveal, setReveal] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <FormShell title="Backup">
      <p className="fcw-mono">{address}</p>
      <button type="button" className="fcw-chip" style={{ margin: "12px 0" }} onClick={() => setReveal((v) => !v)}>
        {reveal ? "Hide phrase" : "Reveal recovery phrase"}
      </button>
      {reveal && <p className="fcw-warn">{mnemonic}</p>}
      <textarea className="fcw-field" rows={3} placeholder="Import 12 or 24 word phrase" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
      <button
        type="button"
        className="fcw-primary"
        onClick={() => {
          try {
            if (!isValidMnemonic(phrase)) throw new Error("Invalid mnemonic.");
            importWallet(phrase);
            setMsg("Imported");
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Failed");
          }
        }}
      >
        Import
      </button>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="button" className="fcw-chip" onClick={() => createWallet()}>
          New wallet
        </button>
        <button type="button" className="fcw-chip" onClick={() => resetDemo()}>
          Reset demo
        </button>
      </div>
      <h2 style={{ fontSize: 14, marginTop: 24 }}>Connected apps</h2>
      {apps.map((a) => (
        <div key={a.id} className="fcw-between" style={{ padding: "8px 0" }}>
          <span>
            {a.name} · {a.domain}
          </span>
          <button type="button" className="fcw-link" onClick={() => disconnectApp(a.id)}>
            Revoke
          </button>
        </div>
      ))}
      {msg && <p className="fcw-muted">{msg}</p>}
    </FormShell>
  );
}

function TokenDetail({ id, go }: { id: TokenId; go: (v: View) => void }) {
  const token = TOKENS[id];
  const amt = useWallet((s) => s.balances[id] ?? 0);
  return (
    <FormShell title={token.symbol}>
      <div className="fcw-center">
        <Icon token={token} size={56} />
        <div className="fcw-total">{formatUsd(amt * token.priceUsd)}</div>
        <div className="fcw-muted">
          {formatTokenAmount(amt)} {token.symbol} · {token.chainLabel}
        </div>
        <div className={token.change24h >= 0 ? "fcw-gain" : "fcw-loss"}>{formatPct(token.change24h)}</div>
      </div>
      <div className="fcw-actions">
        <button type="button" className="fcw-action" onClick={() => go("send")}><i>↑</i>Send</button>
        <button type="button" className="fcw-action" onClick={() => go("receive")}><i>↓</i>Receive</button>
        <button type="button" className="fcw-action" onClick={() => go("buy")}><i>$</i>Buy</button>
        <button type="button" className="fcw-action" onClick={() => go("swap")}><i>⇄</i>Swap</button>
      </div>
    </FormShell>
  );
}

function FormShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="fcw-pad">
      <h2 style={{ margin: "0 0 16px", fontSize: 22 }}>{title}</h2>
      {children}
    </div>
  );
}

