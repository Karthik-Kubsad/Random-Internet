import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Bookmark, Compass, Heart, Info, X, ArrowRight, Send, Globe2, Download } from 'lucide-react';
import { destinations } from './destinations';
import './reference-features.css';

const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };

function Network({ active }) {
  const canvasRef = useRef(null);
  const pointer = useRef({ x: -1000, y: -1000 });
  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
    let width = 0, height = 0, frame = 0, raf = 0, portal = null;
    let nodes = [];
    const labels = [ ['▶','YouTube'], ['●','Memes'], ['W','Wikipedia'], ['↗','Web'], ['✳','Reels'], ['⌂','India'], ['◈','Games'], ['♫','Songs'], ['＋','Ideas'] ];
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = width * dpr; canvas.height = height * dpr; canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      portal = document.querySelector('.portal')?.getBoundingClientRect() || null;
      const count = Math.max(58, Math.min(170, Math.floor(width * height / 8500)));
      nodes = Array.from({length: count}, (_, i) => ({ x:Math.random()*width, y:Math.random()*height, ox:Math.random()*width, oy:Math.random()*height, r:Math.random()*1.35+.65, phase:Math.random()*7, speed:.0004+Math.random()*.0009, label:i%9===0 ? labels[Math.floor(Math.random()*labels.length)] : null }));
    };
    const onMove = e => { pointer.current = {x:e.clientX,y:e.clientY}; };
    const onLeave = () => { pointer.current = {x:-1000,y:-1000}; };
    window.addEventListener('resize', resize); window.addEventListener('pointermove', onMove); window.addEventListener('blur', onLeave); resize();
    const draw = () => {
      frame++; ctx.clearRect(0,0,width,height);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const step = reduced ? 0.12 : (activeRef.current ? 2.3 : 1.5);
      // Keep a generous clear halo around the doorway, even while it pulses.
      const box = document.querySelector('.portal')?.getBoundingClientRect();
      if (box) portal = box;
      const pcx = portal ? portal.left + portal.width / 2 : width / 2;
      const pcy = portal ? portal.top + portal.height / 2 : height / 2;
      const clearRadius = portal ? Math.max(portal.width, portal.height) * .66 + 24 : 175;
      nodes.forEach((n,i) => {
        n.x += (n.ox + Math.sin(frame*n.speed+n.phase)*24 - n.x)*.006*step;
        n.y += (n.oy + Math.cos(frame*n.speed+n.phase)*22 - n.y)*.006*step;
        const dx=pointer.current.x-n.x, dy=pointer.current.y-n.y, distance=Math.hypot(dx,dy);
        // Nearby nodes drift after the cursor; the portal exclusion below wins.
        if (!reduced && distance<220 && distance>0) { const pull=(220-distance)*.015*step; n.x += dx/distance*pull; n.y += dy/distance*pull; }
        const pdx=n.x-pcx, pdy=n.y-pcy, pd=Math.hypot(pdx,pdy);
        if (pd<clearRadius && pd>0) { n.x=pcx+pdx/pd*clearRadius; n.y=pcy+pdy/pd*clearRadius; }
        for(let j=i+1;j<nodes.length;j++) {
          const m=nodes[j], d=Math.hypot(n.x-m.x,n.y-m.y);
          // Reject a whole strand when it would cut through the button halo.
          const vx=m.x-n.x, vy=m.y-n.y, len2=vx*vx+vy*vy;
          const t=len2?Math.max(0,Math.min(1,((pcx-n.x)*vx+(pcy-n.y)*vy)/len2)):0;
          const gap=Math.hypot(n.x+vx*t-pcx,n.y+vy*t-pcy);
          if(d<172 && gap>clearRadius) { ctx.beginPath(); ctx.moveTo(n.x,n.y); ctx.lineTo(m.x,m.y); ctx.strokeStyle=`rgba(185,188,193,${(1-d/172)*.19})`; ctx.lineWidth=.75; ctx.stroke();
            if (!reduced && (i*7+j*13)%22===0) { const t=(frame*.0026*step + (i%5)/5)%1; const px=n.x+(m.x-n.x)*t, py=n.y+(m.y-n.y)*t; ctx.beginPath();ctx.arc(px,py,1.35,0,Math.PI*2);ctx.fillStyle='rgba(237,75,66,.8)';ctx.fill(); }
          }
        }
        const pulse=(Math.sin(frame*.018+n.phase)+1)/2;
        const near=distance<220 ? .8 : 0;
        ctx.beginPath(); ctx.arc(n.x,n.y,n.r+(pulse>.96?1.2:0)+near,0,Math.PI*2); ctx.fillStyle=`rgba(223,225,228,${.28+pulse*.25+near*.35})`; ctx.fill();
        if(n.label && width>680) {
          const [icon,name]=n.label; const ox=(n.ox/width-.5)*20, oy=(n.oy/height-.5)*15;
          const x=n.x+15+ox, y=n.y+oy;
          ctx.fillStyle='rgba(16,17,18,.62)';ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1;
          ctx.beginPath();ctx.roundRect(x,y-13,84,25,7);ctx.fill();ctx.stroke();
          ctx.fillStyle='rgba(244,244,244,.65)';ctx.font='10px Inter, sans-serif';ctx.fillText(`${icon}  ${name}`,x+9,y+3);
        }
      });
      raf=requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(resize); const portalElement=document.querySelector('.portal'); if(portalElement)observer.observe(portalElement);
    draw(); return ()=>{cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('pointermove',onMove);window.removeEventListener('blur',onLeave);};
  }, []);
  return <canvas ref={canvasRef} className="network" aria-hidden="true" />;
}

export default function App() {
  const [journey,setJourney]=useState(()=>read('ri_journey',[]));
  const [favorites,setFavorites]=useState(()=>read('ri_favorites',[]));
  const [count,setCount]=useState(()=>read('ri_count',47));
  const [catalog,setCatalog]=useState(destinations);
  const [retired,setRetired]=useState([]);
  const [suggestions,setSuggestions]=useState(()=>read('ri_suggestions',[]));
  const [suggestion,setSuggestion]=useState({title:'',url:'',note:''});
  const [catalogLimit,setCatalogLimit]=useState(40);
  const [panel,setPanel]=useState(null);
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState('');
  const [last,setLast]=useState(null);
  const persist=(key,value)=>{ try { localStorage.setItem(key,JSON.stringify(value)); } catch { /* Keep the experience usable when browser storage is unavailable. */ } };
  useEffect(()=>{
    let cancelled=false;
    fetch(`${import.meta.env.BASE_URL}catalog/featured.json`)
      .then(response=>{ if(!response.ok) throw new Error('Catalog unavailable'); return response.json(); })
      .then(data=>{
        if(cancelled || !Array.isArray(data)) return;
        const valid=data.filter(item=>item && item.safe===true && item.active===true && typeof item.id==='string' && typeof item.title==='string' && typeof item.domain==='string' && (()=>{ try { return new URL(item.url).protocol==='https:'; } catch { return false; } })());
        if(valid.length) setCatalog(valid);
      })
      .catch(()=>{});
    return ()=>{ cancelled=true; };
  },[]);
  useEffect(()=>{
    let cancelled=false;
    fetch(`${import.meta.env.BASE_URL}catalog/retired.json`).then(response=>response.ok?response.json():[]).then(data=>{if(!cancelled&&Array.isArray(data))setRetired(data.filter(item=>item&&item.active===false));}).catch(()=>{});
    return ()=>{cancelled=true;};
  },[]);
  useEffect(()=>persist('ri_journey',journey),[journey]);
  useEffect(()=>persist('ri_favorites',favorites),[favorites]);
  useEffect(()=>persist('ri_count',count),[count]);
  useEffect(()=>persist('ri_suggestions',suggestions),[suggestions]);
  const openDestination=useCallback((destination)=>{
    const approved=catalog.find(item=>item.id===destination?.id && item.safe && item.active && item.reviewed) || destinations.find(item=>item.id===destination?.id && item.safe && item.active && item.reviewed);
    if(!approved) return;
    window.open(approved.url,'_blank','noopener,noreferrer');
    setJourney(current=>[approved,...current.filter(item=>item.id!==approved.id)].slice(0,30));
    setCount(current=>current+1); setLast(approved); setBusy(true);
    window.setTimeout(()=>setBusy(false),850);
  },[catalog]);
  const goRandom=()=>{
    if(busy)return;
    const recent=new Set(journey.slice(0,6).map(d=>d.id));
    // The large crawl is useful for breadth, but the hand-checked collection
    // should define the fun first-click experience.
    const available=catalog.filter(d=>d.safe&&d.active);
    const checked=available.filter(d=>d.reviewed===true);
    const destinationsPool=checked.length?checked:available;
    const pool=destinationsPool.filter(d=>!recent.has(d.id));
    const choices=pool.length?pool:destinationsPool;
    const weightOf=item=>['video','post','game'].includes(item.type)?4:item.category==='opportunities'?1.3:item.category==='memes'?3:item.category==='music'?2.5:1;
    let ticket=Math.random()*choices.reduce((sum,item)=>sum+weightOf(item),0);
    let pick=choices[0];
    for(const item of choices){ticket-=weightOf(item);if(ticket<0){pick=item;break;}}
    if(pick) openDestination(pick);
  };
  const toggleFavorite=(item)=>{
    const exists=favorites.some(f=>f.id===item.id);
    setFavorites(current=>exists?current.filter(f=>f.id!==item.id):[item,...current]);
    setToast(exists?'Removed from favorites':'Saved to favorites');setTimeout(()=>setToast(''),1800);
  };
  const saveSuggestion=(event)=>{
    event.preventDefault();
    let url;
    try { url=new URL(suggestion.url); } catch { setToast('Enter a complete HTTPS link');setTimeout(()=>setToast(''),1800);return; }
    if(url.protocol!=='https:'||url.username||url.password){setToast('Only public HTTPS links can be suggested');setTimeout(()=>setToast(''),1800);return;}
    const entry={title:suggestion.title.trim()||url.hostname,url:url.href,note:suggestion.note.trim(),savedAt:new Date().toISOString()};
    setSuggestions(current=>[entry,...current].slice(0,100));setSuggestion({title:'',url:'',note:''});setToast('Suggestion saved on this device');setTimeout(()=>setToast(''),2200);
  };
  const exportSuggestions=()=>{
    const file=new Blob([JSON.stringify(suggestions,null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(file);link.download='random-internet-suggestions.json';link.click();window.setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  };
  const reviewedCatalog=catalog.filter(item=>item.reviewed===true);
  const listItems=panel==='journey'?journey:panel==='favorites'?favorites:panel==='catalog'?reviewedCatalog.slice(0,catalogLimit):panel==='archive'?retired:[];
  const panelTitles={about:'A little about this place',journey:'Your Journey',favorites:'Favorites',catalog:'The sites of Random Internet',archive:'The places we lost',suggest:'Suggest a place'};
  const panelKickers={about:'THE IDEA',journey:'YOUR TRAIL',favorites:'SAVED PLACES',catalog:'LITTLE CORNERS OF THE INTERNET',archive:'THE RELICS',suggest:'ADD TO THE COLLECTION'};
  return <main className={busy?'app app--active':'app'}>
    <Network active={busy}/><div className="vignette" aria-hidden="true" />
    <header className="topbar">
      <a className="brand" href="#home" onClick={e=>e.preventDefault()}><span className="brand-mark">r.</span><span>Random Internet</span></a>
      <nav aria-label="Main navigation">
        <button onClick={()=>setPanel('journey')}><Compass size={15}/> <span>Your Journey</span></button>
        <button onClick={()=>setPanel('favorites')}><Heart size={15}/> <span>Favorites</span></button>
        <button onClick={()=>setPanel('about')}><Info size={15}/> <span>About</span></button>
      </nav>
    </header>
    <section className="hero" id="home">
      <div className="eyebrow"><span className="status-dot"/> AN OPEN TAB TO ANYWHERE</div>
      <h1>RANDOM<br/><span>INTERNET</span></h1>
      <button className={busy?'portal portal--pulse':'portal'} onPointerMove={event=>{const r=event.currentTarget.getBoundingClientRect();event.currentTarget.style.setProperty('--tilt-x',`${((event.clientY-r.top)/r.height-.5)*-9}deg`);event.currentTarget.style.setProperty('--tilt-y',`${((event.clientX-r.left)/r.width-.5)*9}deg`)}} onPointerLeave={event=>{event.currentTarget.style.setProperty('--tilt-x','0deg');event.currentTarget.style.setProperty('--tilt-y','0deg')}} onClick={goRandom} aria-label="Take me somewhere on the internet">
        <span className="portal-ring"/><span className="portal-inner"><ArrowUpRight size={23} strokeWidth={1.6}/><span>TAKE ME<br/>SOMEWHERE</span></span>
      </button>
      <div className="discoveries"><span className="discoveries-line"/> <span>Internet discoveries: <strong>{count}</strong></span></div>
    </section>
    <footer className="footer"><span className="foot-note">A tiny doorway to the internet.</span><div><span className="foot-coord">EST. FOR THE CURIOUS</span><button onClick={()=>setPanel('about')}>About &amp; safety <ArrowRight size={13}/></button></div></footer>
    {panel&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setPanel(null)}}>
      <section className="drawer" role="dialog" aria-modal="true" aria-labelledby="panel-title">
        <div className="drawer-top"><div><div className="drawer-kicker">RANDOM INTERNET / {panelKickers[panel]}</div><h2 id="panel-title">{panelTitles[panel]}</h2></div><button className="close" aria-label="Close" onClick={()=>setPanel(null)}><X size={19}/></button></div>
        {panel==='about'&&<div className="about-copy"><p className="about-lede">One button. A whole lot of internet.</p><p>Random Internet borrows The Useless Web’s delightful one-click leap into the unknown, then opens a much wider collection of specific videos, products, posts, and pages.</p><div className="about-links"><button onClick={()=>{setCatalogLimit(40);setPanel('catalog')}}><Globe2 size={15}/> Read about the sites <ArrowRight size={14}/></button><button onClick={()=>setPanel('archive')}><Bookmark size={15}/> The sites we lost <ArrowRight size={14}/></button><button onClick={()=>setPanel('suggest')}><Send size={15}/> Suggest a place <ArrowRight size={14}/></button></div><div className="safety-card"><div className="safety-icon"><Bookmark size={17}/></div><div><h3>Curated with care</h3><p>We only open destinations from approved sources. No arbitrary links, automatic downloads, adult content, gambling, piracy, scams, or suspicious shorteners. We don’t bypass logins or scrape and rehost content.</p></div></div><p className="muted-note">Public posts may change or be removed, and external websites are outside our control. Their own terms and privacy policies apply when you visit.</p></div>}
        {(panel==='journey'||panel==='favorites'||panel==='catalog'||panel==='archive')&&<div className="list-wrap">{listItems.length===0?<div className="empty-state"><div className="empty-orbit"><span/></div><p>{panel==='journey'?'Your path starts with a single click.':panel==='favorites'?'Keep the places you want to find again.':panel==='archive'?'No retired places are in this collection yet.':'The collection is ready for its first imported links.'}</p><span>Nothing here yet</span></div>:<><div className="destination-list">{listItems.map((item,index)=><article className="destination-row" key={item.id}><div className="row-number">{String(index+1).padStart(2,'0')}</div><div className="row-info"><strong>{item.title}</strong><span>{item.domain}</span></div>{panel!=='archive'&&<button className="row-fav" onClick={()=>toggleFavorite(item)} aria-label={favorites.some(f=>f.id===item.id)?'Remove favorite':'Save favorite'}><Heart size={16} fill={favorites.some(f=>f.id===item.id)?'currentColor':'none'}/></button>}{panel!=='archive'&&<button className="row-open" onClick={()=>openDestination(item)} aria-label={`Visit ${item.title}`}><ArrowUpRight size={16}/></button>}</article>)}</div>{panel==='catalog'&&catalogLimit<reviewedCatalog.length&&<button className="more-sites" onClick={()=>setCatalogLimit(value=>value+40)}>More sites <span>{Math.min(catalogLimit,reviewedCatalog.length)} of {reviewedCatalog.length.toLocaleString()}</span></button>}</>}</div>}
        {panel==='suggest'&&<div className="about-copy suggestion-copy"><p className="about-lede">Know a corner we should visit?</p><p>Suggest a public link for a future collection update. Suggestions stay on this device and are not added to the random pool automatically.</p><form className="suggestion-form" onSubmit={saveSuggestion}><label>Site name<input maxLength="120" value={suggestion.title} onChange={event=>setSuggestion(current=>({...current,title:event.target.value}))} placeholder="A curious little website" /></label><label>Public HTTPS link<input required type="url" value={suggestion.url} onChange={event=>setSuggestion(current=>({...current,url:event.target.value}))} placeholder="https://example.com" /></label><label>Why should it be here?<textarea maxLength="500" rows="3" value={suggestion.note} onChange={event=>setSuggestion(current=>({...current,note:event.target.value}))} placeholder="What makes it worth a visit?" /></label><button className="submit-suggestion" type="submit"><Send size={14}/> Save suggestion</button></form>{suggestions.length>0&&<div className="suggestion-export"><span>{suggestions.length} suggestion{suggestions.length===1?'':'s'} saved locally</span><button onClick={exportSuggestions}><Download size={14}/> Export</button></div>}</div>}
        <div className="drawer-bottom"><span>{panel==='suggest'?'SAVED ONLY ON THIS DEVICE':'YOUR JOURNEY STAYS ON THIS DEVICE'}</span><span>{panel==='suggest'?'REVIEW BEFORE IMPORT':'NO ACCOUNT NEEDED'}</span></div>
        <div className="drawer-bottom"><span>YOUR JOURNEY STAYS ON THIS DEVICE</span><span>NO ACCOUNT NEEDED</span></div>
      </section>
    </div>}
    {toast&&<div className="toast"><Heart size={14} fill="currentColor"/>{toast}</div>}
    <span className="screen-reader">{last?`Last discovery: ${last.title}`:''}</span>
  </main>;
}

