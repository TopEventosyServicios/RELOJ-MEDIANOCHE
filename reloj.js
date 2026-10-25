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

  const ns = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < 60; i++) {
    const tick = document.createElementNS(ns, 'line');
    const major = i % 5 === 0;
    Object.entries({ x1: 300, x2: 300, y1: 58, y2: major ? 75 : 66, stroke: major ? '#dfc385' : '#a38d5b', 'stroke-width': major ? 2 : .7, opacity: major ? .9 : .55, transform: `rotate(${i * 6} 300 300)` }).forEach(([k,v]) => tick.setAttribute(k,v));
    $('ticks').append(tick);
  }
  const romans = ['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
  romans.forEach((label, i) => {
    const a = i * Math.PI / 6, node = document.createElementNS(ns, 'text');
    node.setAttribute('x', 300 + Math.sin(a) * 196);
    node.setAttribute('y', 300 - Math.cos(a) * 196);
    node.textContent = label; $('numerals').append(node);
  });

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
    discover.disabled = true; discover.textContent = 'EL SECRETO ESTÁ A PUNTO DE REVELARSE';
    body.classList.add('striking');
    burstGold();
    revealTimer = setTimeout(() => {
      state = 'revealed'; body.classList.add('revealed');
      $('teaser').hidden = true; $('reveal').hidden = false;
      discover.hidden = true; $('replay').hidden = false; $('tiny-note').hidden = true;
      $('hint').textContent = 'LA MEDIANOCHE GUARDA EL COMIENZO';
      updateCountdown();
      $('live').textContent = `La cuenta atrás ha comenzado. El ${dateLabel} de ${year}, a las ${hourLabel}, información sobre las entradas y una sorpresa.`;
      $('reveal-title').focus({ preventScroll: true });
      if (innerWidth <= 900) $('experience').scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'start' });
    }, motion.matches ? 0 : 850);
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

  const canvas = $('gold'), ctx = canvas.getContext('2d');
  let goldFrame = 0, flakes = [], goldStarted = 0;
  function sizeGold() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth*dpr); canvas.height = Math.round(innerHeight*dpr);
    if (ctx) ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function stopGold() { cancelAnimationFrame(goldFrame); goldFrame = 0; flakes = []; if (ctx) ctx.clearRect(0,0,innerWidth,innerHeight); }
  function burstGold() {
    if (!ctx || motion.matches) return;
    stopGold(); sizeGold();
    const r = clock.getBoundingClientRect(), x = r.left+r.width/2, y = r.top+r.height/2;
    flakes = Array.from({ length: 130 }, () => {
      const a = Math.random()*Math.PI*2, speed = 45+Math.random()*210;
      return { x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-45,size:1+Math.random()*3.5,spin:Math.random()*6.3,phase:Math.random()*6.3,life:3+Math.random()*5 };
    });
    goldStarted = performance.now(); let last = goldStarted;
    function frame(now) {
      const dt = Math.min((now-last)/1000,.04), elapsed=(now-goldStarted)/1000; last=now;
      ctx.clearRect(0,0,innerWidth,innerHeight);
      for (const f of flakes) {
        f.x+=f.vx*dt; f.y+=f.vy*dt; f.vx*=Math.pow(.985,dt*60); f.vy+=15*dt;
        const alpha=clamp((f.life-elapsed)/1.5); if (!alpha) continue;
        ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.spin+elapsed*.8);ctx.globalAlpha=alpha*(.5+Math.sin(f.phase+elapsed*3)*.25);
        ctx.fillStyle=f.size>2.8?'#f8df99':'#c6a35f';ctx.shadowColor='#f2d585';ctx.shadowBlur=7;
        ctx.fillRect(-f.size/2,-f.size/2,f.size,Math.max(.6,f.size*Math.abs(Math.cos(f.phase+elapsed*2))));ctx.restore();
      }
      if (elapsed<8) goldFrame=requestAnimationFrame(frame); else stopGold();
    }
    goldFrame=requestAnimationFrame(frame);
  }
  addEventListener('resize', sizeGold, { passive:true });
  motion.addEventListener('change', () => { if (motion.matches) { stopGold(); if (state === 'winding') {cancelAnimationFrame(animation);midnight();} } });
  setProgress(0);
})();
