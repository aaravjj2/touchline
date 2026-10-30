import Script from 'next/script';
export const metadata={title:'Draft Duel · Touchline'};
export default function Home(){return <>
 <a className="skip" href="#main">Skip to game</a>
 <header className="top"><a href="/" aria-label="Touchline Draft Duel home">TOUCHLINE<span className="brand-dot">.</span></a><span className="edition">DRAFT DUEL / TWO PLAYERS</span><a className="rules-link" href="#rules">How to play ↗</a></header>
 <main id="main" tabIndex={-1}>
 <div className="hero"><div><p className="eyebrow"><span className="live-dot"/> ONE FRIEND. ELEVEN PICKS. ONE WINNER.</p><h1>Draft a rivalry<span>.</span></h1><p className="intro">Build your dream XI. Read your rival. Settle it on matchday.</p><p className="hero-meta">Free to play <span>·</span> No accounts <span>·</span> Phone or laptop</p></div><div className="pitch-art" aria-hidden="true"><div className="pitch-lines"><i/><b/><span>YOUR XI<br/><small>vs THEIR XI</small></span></div><div className="hero-ticket">PRIVATE ROOM<span>YOU + ONE FRIEND ↗</span></div></div></div>
 <p id="connection" role="status" aria-live="polite">Connecting to matchday…</p>
 <section id="setup" hidden aria-label="Create or join a game">
 <form id="create"><span className="eyebrow">01 / HOST THE RIVALRY</span><h2>Your room. Your rival.</h2><p>Create a room and send the link to a friend.</p><label>Your team name<input name="name" maxLength={28} required autoComplete="off" defaultValue="Home XI"/></label><button>Create room <span aria-hidden="true">↗</span></button></form>
 <form id="join"><span className="eyebrow">02 / TAKE YOUR PLACE</span><h2>Got an invite?</h2><p>Enter your friend’s room code and build your XI.</p><label>Your team name<input name="name" maxLength={28} required autoComplete="off" defaultValue="Away XI"/></label><label>Room code<input name="code" maxLength={10} required autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="10-character code"/></label><button className="secondary">Join room <span aria-hidden="true">↗</span></button></form>
 <details className="recover-box"><summary>Returning to a game? Recover your seat</summary><form id="resume"><label>Room code<input name="code" maxLength={10} required autoComplete="off"/></label><label>Private seat key<input name="token" maxLength={128} required autoComplete="off"/></label><button>Recover seat</button></form></details>
 </section>
 <section id="room" hidden aria-label="Draft room"/>
 <p id="error" role="alert"/>
 <section id="rules" className="rulebook"><header><span className="eyebrow">THE QUICK BRIEF</span><h2>A rivalry in four moves.</h2></header><ol><li><b>01</b><h3>Bring a friend.</h3><p>Create a room and share its link or code. Both players pick a formation and ready up.</p></li><li><b>02</b><h3>Build your XI.</h3><p>Take turns choosing from six footballers. Each pick fits an open position. Nobody can draft the same person twice.</p></li><li><b>03</b><h3>Make your call.</h3><p>Choose Balanced, Press or Protect. Your approach stays hidden until you both lock it in.</p></li><li><b>04</b><h3>Settle the rivalry.</h3><p>One shared simulated result. Level at full-time? Penalties decide it. Ask for a rematch to go again.</p></li></ol><p className="fine-print">Turn-based draft · statistical match simulation · authored ratings · independent football game. No real-world predictions. First pick and home advantage alternate on rematches.</p></section>
 <footer><strong>YOUR CLUB. YOUR CALL.</strong><p>Rooms last 24 hours. Refresh to reconnect to your saved seat. Keep your private seat key if you switch browsers.</p><p>Built with ChatGPT · Touchline Draft Duel</p></footer>
 </main><Script src="/game.js" strategy="afterInteractive"/>
 </>;}
