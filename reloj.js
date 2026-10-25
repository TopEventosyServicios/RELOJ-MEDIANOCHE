(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const options = window.COTILLON || {};
  const fallbackDate = Date.parse('2026-10-31T13:00:00+01:00');
  const parsed = Date.parse(options.fechaAnuncio);
  const deadline = Number.isFinite(parsed) ? parsed : fallbackDate;
  let zone = options.zonaHoraria || 'Europe/Madrid';
  try { new Intl.DateTimeFormat('es-ES', { timeZone: zone }).format(); }
  catch { zone = 'Europe/Madrid'; }
  const deadlineDate = new Date(deadline);
  const dateLabel = new Intl.DateTimeFormat('es-ES', { timeZone: zone, weekday: 'long', day: 'numeric', month: 'long' }).format(deadlineDate);
  const year = new Intl.DateTimeFormat('es-ES', { timeZone: zone, year: 'numeric' }).format(deadlineDate);
  const hourLabel = new Intl.DateTimeFormat('es-ES', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false }).format(deadlineDate);
  $('date-day').textContent = dateLabel.toLocaleUpperCase('es-ES');
  $('date-hour').textContent = `${year} · ${hourLabel} H · HORA PENINSULAR`;

  const clock = $('clock'), discover = $('discover'), body = document.body;
  let state = 'locked', progress = 0, animation = 0, revealTimer = 0, drag = null;
  const clamp = n => Math.max(0, Math.min(1, n));
  function setProgress(p) {
    progress = clamp(p);
    $('hour-hand').setAttribute('transform', `rotate(${305 + progress * 55} 300 300)`);
    $('minute-hand').setAttribute('transform', `rotate(${60 + progress * 660} 300 300)`);
    $('progress-ring').setAttribute('stroke-dashoffset', (1828.407 * (1 - progress)).toFixed(3));
    const total = Math.round(1330 + progress * 110);
    const time = `${String(Math.floor(total / 60) % 24).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
    $('clock-time').textContent = time;
    clock.setAttribute('aria-valuenow', Math.round(progress * 100));
    clock.setAttribute('aria-valuetext', progress === 1 ? 'Medianoche. El secreto está descubierto.' : `${time}. Sigue girando hasta medianoche.`);
    clock.dataset.progress = progress.toFixed(3);
  }
  function updateCountdown() {
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    const values = [Math.floor(remaining/86400), Math.floor(remaining/3600)%24, Math.floor(remaining/60)%60, remaining%60];
    ['days','hours','minutes','seconds'].forEach((id, i) => {
      const value = String(values[i]).padStart(2,'0');
      if ($(id).textContent !== value) $(id).textContent = value;
    });
    const expired = remaining === 0;
    body.classList.toggle('expired', expired);
    $('expiry-notice').hidden = !expired;
    let url;
    try { url = new URL(options.enlaceAnuncio); } catch { url = null; }
    const hasLink = expired && url && ['https:','http:'].includes(url.protocol) && !url.username && !url.password;
    $('announcement-link').hidden = !hasLink;
    if (hasLink) $('announcement-link').href = url.href;
    $('reveal').dataset.deadline = deadlineDate.toISOString();
    $('reveal').dataset.expired = String(expired);
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateCountdown(); });

  function midnight() {
    if (state === 'striking' || state === 'revealed') return;
    state = 'striking'; clock.setAttribute('aria-disabled','true'); setProgress(1);
    discover.disabled=true;discover.textContent='EL SECRETO ESTÁ A PUNTO DE REVELARSE';
    body.classList.add('striking');
    burstGold(()=>{
      state='revealed';body.classList.add('revealed');
      $('teaser').hidden=true;$('reveal').hidden=false;
      discover.hidden=true;$('replay').hidden=false;$('tiny-note').hidden=true;
      $('hint').textContent='LA MEDIANOCHE GUARDA EL COMIENZO';
      updateCountdown();
      $('live').textContent=`La cuenta atrás ha comenzado. El ${dateLabel} de ${year}, a las ${hourLabel}, información sobre las entradas y una sorpresa.`;
      $('reveal-title').focus({preventScroll:true});
      if(innerWidth<=900)$('experience').scrollIntoView({behavior:'instant',block:'start'});
    });
  }
  function advance() {
    if (state !== 'locked') return;
    drag = null;
    state = 'winding'; discover.disabled = true; discover.textContent = 'LAS DOCE ESTÁN CADA VEZ MÁS CERCA';
    if (motion.matches) { midnight(); return; }
    const from = progress, started = performance.now(), duration = 2000 * (1 - from) + 300;
    function frame(now) {
      const t = clamp((now - started) / duration), eased = t < .5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
      setProgress(from + (1 - from) * eased);
      if (t < 1) animation = requestAnimationFrame(frame); else { animation = 0; midnight(); }
    }
    animation = requestAnimationFrame(frame);
  }
  discover.addEventListener('click', advance);
  const angleAt = e => {
    const r = clock.getBoundingClientRect();
    return Math.atan2(e.clientY - r.top - r.height/2, e.clientX - r.left - r.width/2) * 180 / Math.PI;
  };
  clock.addEventListener('pointerdown', e => {
    if (state !== 'locked' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { id: e.pointerId, angle: angleAt(e), moved: 0, x: e.clientX, y: e.clientY };
    clock.setPointerCapture(e.pointerId);
  });
  clock.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId || state !== 'locked') return;
    const angle = angleAt(e); let delta = angle - drag.angle;
    if (delta > 180) delta -= 360; if (delta < -180) delta += 360;
    drag.angle = angle; drag.moved = Math.max(drag.moved, Math.hypot(e.clientX-drag.x,e.clientY-drag.y));
    const r = clock.getBoundingClientRect(), radius = Math.hypot(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2);
    if (radius > r.width * .10 && Math.abs(delta) < 100) {
      setProgress(progress + delta / 270);
      if (progress >= .997) { drag = null; midnight(); }
    }
  });
  clock.addEventListener('pointerup', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const tap = drag.moved < 9; drag = null;
    if (clock.hasPointerCapture(e.pointerId)) clock.releasePointerCapture(e.pointerId);
    if (tap) advance();
  });
  clock.addEventListener('pointercancel', () => { drag = null; });
  clock.addEventListener('lostpointercapture', () => { drag = null; });
  clock.addEventListener('keydown', e => {
    if (state !== 'locked') return;
    if (['Enter',' '].includes(e.key)) { e.preventDefault(); advance(); }
    else if (['ArrowRight','ArrowUp','ArrowLeft','ArrowDown','Home','End'].includes(e.key)) {
      e.preventDefault();
      setProgress(e.key === 'End' ? 1 : e.key === 'Home' ? 0 : progress + (['ArrowRight','ArrowUp'].includes(e.key) ? .1 : -.1));
      if (progress >= .997) midnight();
    }
  });
  $('replay').addEventListener('click', () => {
    cancelAnimationFrame(animation); clearTimeout(revealTimer); stopGold();
    state = 'locked'; drag = null; body.classList.remove('revealed','striking');
    $('reveal').hidden = true; $('teaser').hidden = false; $('replay').hidden = true;
    discover.hidden = false; discover.disabled = false;
    discover.innerHTML = 'DESCUBRIR EL SECRETO <span aria-hidden="true">↗</span>';
    $('tiny-note').hidden = false;
    $('hint').innerHTML = '<span aria-hidden="true">↻</span> GIRA LAS AGUJAS HASTA LAS DOCE';
    clock.removeAttribute('aria-disabled'); setProgress(0);
    $('live').textContent = 'El reloj está listo para descubrir de nuevo el secreto.';
    clock.focus({ preventScroll: true });
    if (innerWidth <= 900) $('experience').scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth' });
  });

  function downloadText(text, filename, mime) {
    const url = URL.createObjectURL(new Blob([text], { type: mime })), link = document.createElement('a');
    link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function icsDate(d) { return d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'); }
  $('calendar').addEventListener('click', () => {
    const text = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//TOP EVENTOS//Cotillon 26-27//ES','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:cotillon-anuncio-${deadline}@topeventos`,`DTSTAMP:${icsDate(new Date())}`,`DTSTART:${icsDate(deadlineDate)}`,`DTEND:${icsDate(new Date(deadline+15*60*1000))}`,'SUMMARY:Cotillón 26/27 - El anuncio de TOP EVENTOS','DESCRIPTION:Información sobre las entradas y una sorpresa. Consulta las novedades de TOP EVENTOS.','END:VEVENT','END:VCALENDAR',''].join('\r\n');
    downloadText(text, 'Fecha-Cotillon-26-27.ics', 'text/calendar;charset=utf-8');
    $('share-status').textContent = 'Fecha preparada para tu calendario.';
  });
  $('share').addEventListener('click', async () => {
    const url = new URL(location.href); url.hash = ''; url.search = '';
    const info = { title: 'El secreto de medianoche · Cotillón 26/27', text: 'Lleva las agujas a las doce y descubre lo que viene. TOP EVENTOS.', url: url.href };
    try {
      if (navigator.share) { await navigator.share(info); $('share-status').textContent = ''; }
      else if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(url.href); $('share-status').textContent = 'Enlace copiado. Ya puedes compartirlo.'; }
      else $('share-status').textContent = `Copia este enlace: ${url.href}`;
    } catch (error) {
      if (error.name !== 'AbortError') $('share-status').textContent = `Puedes compartir este enlace: ${url.href}`;
    }
  });

  const goldCanvas=$('gold'),goldBackup=$('gold-backup');
  let goldContext=null;
  try{goldContext=goldCanvas.getContext('2d',{alpha:true});}catch{}
  let goldFrame=0,goldWatchdog=0,goldLimit=0,goldStillTimer=0;
  let goldReady=null,goldRunning=false,goldPaused=false,goldForced=false;
  let goldElapsed=0,goldLast=0,goldWidth=0,goldHeight=0,goldFrames=0;
  let goldOrigin=[0,0],goldFlakes=[],goldSprites=[];
  function notifyGoldReady(){const ready=goldReady;goldReady=null;clearTimeout(goldWatchdog);if(ready)ready();}
  function stopGold(){
    cancelAnimationFrame(goldFrame);clearTimeout(goldWatchdog);clearTimeout(goldLimit);clearTimeout(goldStillTimer);
    goldFrame=0;goldRunning=false;goldPaused=false;goldReady=null;
    if(goldContext){goldContext.setTransform(1,0,0,1,0,0);goldContext.clearRect(0,0,goldCanvas.width,goldCanvas.height);}
    goldCanvas.hidden=true;goldBackup.hidden=true;goldCanvas.dataset.active='false';
  }
  function prepareGoldSprites(){
    if(goldSprites.length)return true;
    try{
      for(let i=0;i<24;i++){
        const size=1+(i%8)*.5,c=document.createElement('canvas');c.width=c.height=24;
        const p=c.getContext('2d',{alpha:true});if(!p)return false;
        p.shadowColor='#f2d585';p.shadowBlur=5;p.fillStyle=i<8?'#f8df99':i<16?'#c6a35f':'#e6bf6d';
        p.fillRect(12-size/2,12-size*.32,size,size*.64);goldSprites.push(c);
      }
      return true;
    }catch{return false;}
  }
  function sizeGold(){
    if(goldRunning||!goldContext)return;
    goldWidth=Math.max(1,innerWidth);goldHeight=Math.max(1,innerHeight);
    // El lienzo no supera 0,5 megapíxeles, incluso en pantallas Retina.
    const ratio=Math.min(1.25,720/goldWidth,960/goldHeight,Math.sqrt(500000/(goldWidth*goldHeight)));
    goldCanvas.width=Math.round(goldWidth*ratio);goldCanvas.height=Math.round(goldHeight*ratio);
    goldContext.setTransform(goldCanvas.width/goldWidth,0,0,goldCanvas.height/goldHeight,0,0);
  }
  function stillGold(){
    cancelAnimationFrame(goldFrame);goldRunning=false;goldCanvas.hidden=true;goldBackup.hidden=false;
    goldCanvas.dataset.active='true';goldCanvas.dataset.mode='still';
    notifyGoldReady();goldStillTimer=setTimeout(stopGold,8000);
  }
  function paintGold(t){
    const p=goldContext;p.clearRect(0,0,goldWidth,goldHeight);
    const displacement=(1-Math.exp(-.9*t))/.9;
    for(const f of goldFlakes){
      if(t>=f.life)continue;
      const alpha=Math.min(1,t/.1)*Math.min(1,(f.life-t)/1.5)*(.57+Math.sin(f.phase+t*3)*.23);
      const x=Math.round(goldOrigin[0]+f.vx*displacement),y=Math.round(goldOrigin[1]+f.vy*t+7.5*t*t);
      p.save();p.translate(x,y);p.rotate(f.spin+t*.8);p.globalAlpha=alpha;
      p.scale(1,Math.max(.24,Math.abs(Math.cos(f.phase+t*2))));p.drawImage(goldSprites[f.sprite],-12,-12);p.restore();
    }
    goldFrames++;if(goldFrames%8===0)goldCanvas.dataset.frames=String(goldFrames);
  }
  function drawGold(now){
    if(!goldRunning||goldPaused)return;
    if(now-goldLast<32){goldFrame=requestAnimationFrame(drawGold);return;}
    const dt=Math.min((now-goldLast)/1000,.05);goldLast=now;goldElapsed+=dt;
    try{paintGold(goldElapsed);}catch{stillGold();return;}
    if(goldElapsed>=1.05)notifyGoldReady();
    if(goldElapsed<8)goldFrame=requestAnimationFrame(drawGold);else{notifyGoldReady();stopGold();}
  }
  function burstGold(onReady,forceAnimation=false){
    stopGold();goldReady=onReady||null;goldForced=forceAnimation;goldCanvas.dataset.frames='0';
    if((motion.matches&&!forceAnimation)||!goldContext||!prepareGoldSprites()){stillGold();return;}
    sizeGold();goldCanvas.hidden=false;goldCanvas.dataset.active='true';goldCanvas.dataset.mode='animated';
    const r=clock.getBoundingClientRect();
    goldOrigin=[Math.max(20,Math.min(goldWidth-20,r.left+r.width/2)),Math.max(40,Math.min(goldHeight-40,r.top+r.height/2))];
    let seed=26272026;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    goldFlakes=Array.from({length:130},()=>{const a=random()*Math.PI*2,speed=45+random()*210;return {vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-45,sprite:Math.floor(random()*24),spin:random()*6.3,phase:random()*6.3,life:3+random()*5};});
    goldElapsed=.08;goldFrames=0;goldRunning=true;goldPaused=false;goldLast=performance.now();
    goldCanvas.dataset.count='130';goldCanvas.dataset.pixels=String(goldCanvas.width*goldCanvas.height);
    try{paintGold(goldElapsed);}catch{stillGold();return;}
    goldWatchdog=setTimeout(notifyGoldReady,5000);
    goldLimit=setTimeout(()=>{notifyGoldReady();stopGold();},16000);
    goldFrame=requestAnimationFrame(drawGold);
  }
  function pauseGold(){
    if(!goldRunning||goldPaused)return;goldPaused=true;
    cancelAnimationFrame(goldFrame);clearTimeout(goldWatchdog);clearTimeout(goldLimit);
  }
  function resumeGold(){
    if(!goldRunning||!goldPaused||document.hidden)return;
    goldPaused=false;goldLast=performance.now();
    if(goldReady)goldWatchdog=setTimeout(notifyGoldReady,5000);
    goldLimit=setTimeout(()=>{notifyGoldReady();stopGold();},16000);
    goldFrame=requestAnimationFrame(drawGold);
  }
  $('gold-replay').addEventListener('click',()=>burstGold(null,true));
  document.addEventListener('visibilitychange',()=>document.hidden?pauseGold():resumeGold());
  addEventListener('pagehide',pauseGold);addEventListener('pageshow',resumeGold);
  addEventListener('resize',sizeGold,{passive:true});
  motion.addEventListener('change',()=>{
    if(motion.matches){
      if(goldRunning&&!goldForced)stillGold();
      if(state==='winding'){cancelAnimationFrame(animation);midnight();}
    }
  });
  setTimeout(prepareGoldSprites,0);

  setProgress(0);
})();
