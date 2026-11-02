(function(){
  window.__themeRan = true;
  var THEME_ORDER=['articulate','ice','lavender','charlime','light'];
  var THEMES={
    articulate:{
      name:'Articulate',
      accent:'#f59e0b',
      bg:'#0d1f22',bg2:'#0f2427',bg3:'#122d33',bgCard:'#142e35',bgCard2:'#0f2629',
      border:'#1a3a3f',borderLight:'#245660',
      text:'#c8e6e8',textMuted:'#7a9ea3',textDim:'#3d6b72',
      accentDim:'rgba(245,158,11,.1)',accentGlow:'rgba(245,158,11,.3)',
      navBg:'rgba(13,31,34,.92)',btnBg:'rgba(255,255,255,.12)',
      bodyClass:'theme-articulate',
      bgImg:'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=1920&q=80',bgAlt:false,
    },
    ice:{
      name:'Ice',
      accent:'#38bdf8',
      bg:'#0c1929',bg2:'#0f1f33',bg3:'#122940',bgCard:'#132a42',bgCard2:'#0f2238',
      border:'#1a3050',borderLight:'#245080',
      text:'#d0e8f8',textMuted:'#7aafc8',textDim:'#3d6b88',
      accentDim:'rgba(56,189,248,.1)',accentGlow:'rgba(56,189,248,.25)',
      navBg:'rgba(12,25,41,.92)',btnBg:'rgba(255,255,255,.12)',
      bodyClass:'theme-ice',
      bgImg:'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1920&q=80',bgAlt:true,
    },
    lavender:{
      name:'Lavender',
      accent:'#a3e635',
      bg:'#1a0f2e',bg2:'#1f1435',bg3:'#251a3d',bgCard:'#261b40',bgCard2:'#1e1333',
      border:'#3a2858',borderLight:'#543a80',
      text:'#e8dcf5',textMuted:'#a898c8',textDim:'#5d4f78',
      accentDim:'rgba(163,230,53,.12)',accentGlow:'rgba(163,230,53,.3)',
      navBg:'rgba(26,15,46,.92)',btnBg:'rgba(255,255,255,.12)',
      bodyClass:'theme-lavender',
      bgImg:'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80',bgAlt:false,
    },
    charlime:{
      name:'Char-Lime',
      accent:'#a3e635',
      bg:'#1c1c1c',bg2:'#232323',bg3:'#2a2a2a',bgCard:'#2d2d2d',bgCard2:'#252525',
      border:'#3a3a3a',borderLight:'#555555',
      text:'#e8e8e8',textMuted:'#a0a0a0',textDim:'#585858',
      accentDim:'rgba(163,230,53,.12)',accentGlow:'rgba(163,230,53,.25)',
      navBg:'rgba(28,28,28,.95)',btnBg:'rgba(255,255,255,.12)',
      bodyClass:'theme-charlime',
      bgImg:null,
    },
    light:{
      name:'Light',
      accent:'#0d9488',
      bg:'#f8fafc',bg2:'#f1f5f9',bg3:'#e2e8f0',bgCard:'#ffffff',bgCard2:'#f8fafc',
      border:'#cbd5e1',borderLight:'#94a3b8',
      text:'#1e293b',textMuted:'#475569',textDim:'#94a3b8',
      accentDim:'rgba(13,148,136,.1)',accentGlow:'rgba(13,148,136,.25)',
      navBg:'rgba(248,250,252,.92)',btnBg:'rgba(0,0,0,.06)',
      bodyClass:'theme-light',
      bgImg:null,
    }
  };
  var idx=0;
  /* Icon per theme — the deck pattern: swap the SVG's innerHTML on cycle.
     Keyed by theme NAME so it survives reordering THEME_ORDER. */
  var themeIcons={
    articulate:'<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    ice:'<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    lavender:'<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
    charlime:'<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    light:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93 1.41 1.41"/>'
  };
  function applyTheme(key){
    var t=THEMES[key];
    if(!t)return;
    var r=document.documentElement;
    r.style.setProperty('--bg',t.bg);
    r.style.setProperty('--bg2',t.bg2);
    r.style.setProperty('--bg3',t.bg3);
    r.style.setProperty('--bg-card',t.bgCard);
    r.style.setProperty('--bg-card2',t.bgCard2);
    r.style.setProperty('--border',t.border);
    r.style.setProperty('--border-light',t.borderLight);
    r.style.setProperty('--text',t.text);
    r.style.setProperty('--text-muted',t.textMuted);
    r.style.setProperty('--text-dim',t.textDim);
    r.style.setProperty('--accent',t.accent);
    r.style.setProperty('--accent-dim',t.accentDim);
    r.style.setProperty('--accent-glow',t.accentGlow);
    r.style.setProperty('--btn-bg',t.btnBg);
    document.body.className=t.bodyClass;
    var icon=document.getElementById('themeIcon');
    if(icon&&themeIcons[key])icon.innerHTML=themeIcons[key];
    var cycleBtn=document.getElementById('themeCycleBtn');
    if(cycleBtn)cycleBtn.setAttribute('aria-label','Cycle color theme (current: '+t.name+')');
    var nav=document.querySelector('.nav');
    if(nav)nav.style.background=t.navBg;
    if(t.bgImg){
          var overlay=document.getElementById('bgOverlay');
          if(overlay){
            overlay.style.backgroundImage='url('+t.bgImg+')';
            /* Full opacity: the 58-90% scrim in body::after now does the
               dimming. The old .15 here fought the rebuilt stack. */
            overlay.style.opacity='1';
            /* restart the Ken Burns drift cleanly on theme change, and
               alternate direction so themes do not all drift identically */
            var alt=t.bgAlt;
            overlay.classList.toggle('kb-alt',!!alt);
            overlay.style.animation='none';
            void overlay.offsetWidth;            /* force reflow to restart */
            overlay.style.animation='';
          }
        }else{
          var overlay=document.getElementById('bgOverlay');
          if(overlay)overlay.style.opacity='0';
        }
  }
  document.addEventListener('click',function(e){
    if(e.target.closest('#themeCycleBtn')){
      idx=(idx+1)%THEME_ORDER.length;
      applyTheme(THEME_ORDER[idx]);
    }
  });
  window.__cycleTheme = function(){ idx = (idx+1) % THEME_ORDER.length; applyTheme(THEME_ORDER[idx]); };
  window.cycleTheme = function(){ idx=(idx+1)%THEME_ORDER.length; applyTheme(THEME_ORDER[idx]); };
  applyTheme('articulate');
  })();