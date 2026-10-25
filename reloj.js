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
  $('door-date').textContent = new Intl.DateTimeFormat('es-ES',{timeZone:zone,day:'numeric',month:'long'}).format(deadlineDate).replace(' de ',' ').toLocaleUpperCase('es-ES');
  $('door-weekday').textContent = new Intl.DateTimeFormat('es-ES',{timeZone:zone,weekday:'long'}).format(deadlineDate).toLocaleUpperCase('es-ES');
  $('door-hour').textContent = hourLabel;

  const clock = $('clock'), discover = $('discover'), body = document.body;
  let state = 'locked', progress = 0, animation = 0, revealTimer = 0, drag = null, windingFallback = 0;
  const clamp = n => Math.max(0, Math.min(1, n));
  function setProgress(p) {
    progress = clamp(p);
    body.classList.toggle('doors-ready', progress > .8);
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

  function finishOpening() {
    if(state!=='opening')return;
    clearTimeout(revealTimer);clearTimeout(windingFallback);state='revealed';
    body.classList.add('revealed');body.classList.remove('opening','doors-ready');
    $('teaser').hidden=true;$('reveal').hidden=false;
    discover.hidden=true;$('replay').hidden=false;$('tiny-note').hidden=true;
    $('hint').textContent='LA MEDIANOCHE GUARDA EL COMIENZO';
    updateCountdown();
    $('live').textContent=`El ${dateLabel} de ${year}, a las ${hourLabel}, información sobre las entradas y una sorpresa.`;
    $('reveal-title').focus({preventScroll:true});
    if(innerWidth<=900)$('experience').scrollIntoView({behavior:'instant',block:'start'});
  }
  function midnight() {
    if(state==='opening'||state==='revealed')return;
    cancelAnimationFrame(animation);clearTimeout(windingFallback);state='opening';drag=null;
    clock.setAttribute('aria-disabled','true');setProgress(1);
    discover.disabled=true;discover.textContent='LA MEDIANOCHE ABRE EL SECRETO';
    body.classList.add('opening');
    // El temporizador permite revelar la información aunque el navegador omita las animaciones.
    revealTimer=setTimeout(finishOpening,motion.matches?120:2100);
  }
  document.querySelector('.door-right').addEventListener('animationend',e=>{
    if(e.animationName==='door-right-open'&&state==='opening'){
      clearTimeout(revealTimer);revealTimer=setTimeout(finishOpening,650);
    }
  });
  motion.addEventListener('change',()=>{
    if(motion.matches){
      if(state==='opening')finishOpening();
      else if(state==='winding')midnight();
    }
  });
  addEventListener('pageshow',()=>{if(state==='opening'&&document.hidden===false)finishOpening();});

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
    windingFallback=setTimeout(()=>{if(state==='winding')midnight();},duration+250);
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
    cancelAnimationFrame(animation); clearTimeout(revealTimer);clearTimeout(windingFallback);
    state = 'locked'; drag = null; body.classList.remove('revealed','opening','doors-ready');
    $('reveal').hidden = true; $('teaser').hidden = false; $('replay').hidden = true;
    discover.hidden = false; discover.disabled = false;
    discover.innerHTML = 'DESCUBRIR EL SECRETO <span aria-hidden="true">↗</span>';
    $('tiny-note').hidden = false;
    $('hint').innerHTML = '<span aria-hidden="true">↻</span> GIRA LAS AGUJAS HASTA LAS DOCE';
    clock.removeAttribute('aria-disabled'); setProgress(0);
    $('live').textContent = 'El reloj está listo para descubrir de nuevo el secreto.';
    clock.focus({ preventScroll: true });
    if (innerWidth <= 900) $('experience').scrollIntoView({ behavior: 'instant' });
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

  setProgress(0);
})();
