// Chip de usuario en el margen superior derecho (se inyecta en el encabezado del tablero)
const esc = (s) => String(s).replace(/[<>&"']/g, '');

export function chipHtml(name, isAdmin) {
  return `
<style>
#hk-user{display:inline-flex;align-items:center;gap:9px;padding:4px 11px;border:1px solid var(--border,#475569);border-radius:14px;background:var(--surf2,#273549);color:var(--text,#CBD5E1);font:700 .74rem/1 'Rajdhani',system-ui,sans-serif;letter-spacing:.5px;white-space:nowrap;flex-shrink:0}
#hk-user .hk-n{max-width:140px;overflow:hidden;text-overflow:ellipsis}
#hk-user a{text-decoration:none;font-weight:700;text-transform:uppercase;font-size:.66rem;letter-spacing:1px}
#hk-user a.hk-adm{color:var(--accent-t,#818CF8)}
#hk-user a.hk-out{color:var(--red,#EF4444)}
#hk-strip{display:flex;justify-content:flex-end;align-items:center;padding:3px 8px;background:var(--bg,#0F172A);flex-shrink:0}
#hk-strip #hk-user{padding:2px 9px;font-size:.66rem}
@media (orientation:landscape) and (max-height:500px){#hk-strip{padding:1px 8px}#hk-strip #hk-user{padding:1px 8px}}
</style>
<script>
(function(){
  var hr=document.querySelector('.hright'), hd=document.querySelector('header');
  if(!hr&&!hd) return;
  var c=document.createElement('div'); c.id='hk-user';
  c.innerHTML='<span class="hk-n">👤 ${esc(name)}</span>${isAdmin ? '<a class="hk-adm" href="/admin">Usuarios</a>' : ''}<a class="hk-out" href="#">Salir</a>';
  if(hr){ hr.appendChild(c); }
  else {
    // celular: en horizontal va dentro del encabezado; en vertical, en una franja fina arriba
    var mq=window.matchMedia('(orientation:landscape) and (max-height:500px)'), st=null;
    var place=function(){
      var ha=hd.querySelector('.header-actions');
      if(mq.matches&&ha){ ha.insertBefore(c,ha.firstChild); if(st) st.style.display='none'; }
      else { if(!st){ st=document.createElement('div'); st.id='hk-strip'; hd.parentNode.insertBefore(st,hd); } st.style.display='flex'; st.appendChild(c); }
      if(window.fitScreen) setTimeout(function(){window.fitScreen(true)},30);
    };
    place();
    if(mq.addEventListener) mq.addEventListener('change',place); else if(mq.addListener) mq.addListener(place);
  }
  c.querySelector('.hk-out').onclick=async function(e){e.preventDefault();try{await fetch('/api/logout',{method:'POST'})}catch(x){}location.href='/login';};
})();
</script>`;
}
