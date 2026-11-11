#!/usr/bin/env python3
"""
Articulate Video Lesson pipeline.

Reads lesson specs from  pipeline/specs/*.json  and generates:
  - video-lessons/lessons/<slug>.html   (self-contained interactive lesson)
  - video-lessons/index.html            (library index, grouped by level)

A spec JSON looks like:
{
  "slug": "elephants-nat-geo-kids",
  "title": "Elephants: Giants of Africa and Asia",
  "level": "A2",
  "grammar": "Present simple: habits and facts",
  "source": "National Geographic Kids",
  "emoji": "🐘",
  "videoId": "lLAyDRLHKXY",
  "questions": [ {"id":"q1","type":"mcq","time":22,"question":"...","options":[...],"correct":0,"explain":"..."} ],
  "vocab": [ {"w":"trunk","d":"the elephant's long nose"} ]
}

Question types:
  mcq     { type, time, question, options[4], correct(index), explain }
  fillgap { type, time, sentence('... _____ ...'), answer, explain }
  order   { type, time, words[shuffled], correct(full sentence), explain }
"""
import json, os, sys, html, glob

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
SPECS_DIR = os.path.join(BASE, 'specs')
LESSONS_DIR = os.path.join(ROOT, 'lessons')
INDEX_PATH = os.path.join(ROOT, 'index.html')

LESSON_TEMPLATE = r'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; media-src 'self' blob: https://www.youtube.com; frame-src https://www.youtube.com; object-src 'none'; frame-ancestors 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>@@TITLE@@ — Articulate Video Lesson</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#0b1220;--card:#16223c;--line:rgba(255,255,255,.09);--text:#f5f8ff;--dim:#9fb0d0;--yellow:#ffd23f;--cyan:#22d3ee;--green:#34d399;--red:#f87171;--violet:#a78bfa}
*{box-sizing:border-box;margin:0;padding:0}
body{background:radial-gradient(1200px 600px at 50% -10%,#1b2a4d 0%,var(--bg) 55%);color:var(--text);font-family:'Nunito',system-ui,sans-serif;line-height:1.6;min-height:100vh;padding:20px}
.app{max-width:960px;margin:0 auto}
header{margin-bottom:16px}
h1{font-family:'Baloo 2',system-ui,sans-serif;font-size:clamp(1.5rem,4vw,2.3rem);font-weight:800;letter-spacing:-.02em}
.meta{color:var(--dim);font-size:.9rem;margin-top:4px}
.meta .tag{display:inline-block;background:rgba(255,210,63,.15);color:var(--yellow);font-weight:700;border-radius:99px;padding:2px 10px;margin-right:6px;font-size:.78rem;text-transform:uppercase;letter-spacing:.04em}
.progress{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}
.progress .seg{height:8px;flex:1;min-width:12px;border-radius:99px;background:rgba(255,255,255,.08)}
.progress .seg.ok{background:var(--green)}.progress .seg.bad{background:var(--red)}
.stage{position:relative;border-radius:20px;overflow:hidden;background:#000;border:1px solid var(--line);box-shadow:0 20px 60px rgba(0,0,0,.45)}
.video-wrap{aspect-ratio:16/9;width:100%}
.video-wrap iframe{width:100%;height:100%;border:0;display:block}
.overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(6,10,22,.80);backdrop-filter:blur(6px)}
.overlay.show{display:flex}
.q-card{width:100%;max-width:660px;max-height:100%;overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.5)}
.q-badge{display:inline-block;font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;background:rgba(34,211,238,.15);color:var(--cyan);padding:4px 10px;border-radius:99px;margin-bottom:10px}
.q-text{font-family:'Baloo 2',system-ui,sans-serif;font-size:1.22rem;font-weight:700;margin-bottom:14px;line-height:1.35}
.opts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.opt{text-align:left;font-family:inherit;font-size:.98rem;font-weight:700;color:var(--text);background:rgba(255,255,255,.05);border:2px solid var(--line);border-radius:12px;padding:14px;cursor:pointer;transition:.15s}
.opt:hover{background:rgba(255,255,255,.1);border-color:var(--cyan)}
.opt.correct{border-color:var(--green);background:rgba(52,211,153,.15);color:var(--green)}
.opt.wrong{border-color:var(--red);background:rgba(248,113,113,.15);color:var(--red)}
.opt:disabled{cursor:default}
.fillrow{display:flex;gap:10px;flex-wrap:wrap}
.fillrow input{flex:1;min-width:160px;font-family:inherit;font-size:1.05rem;color:var(--yellow);background:rgba(255,255,255,.05);border:2px solid var(--yellow);border-radius:12px;padding:12px 14px;outline:none}
.fillrow input:disabled{opacity:.6}
.check-btn,.big-btn{font-family:'Baloo 2',system-ui,sans-serif;font-size:1rem;font-weight:800;color:#0b1220;background:var(--yellow);border:0;border-radius:12px;padding:12px 20px;cursor:pointer;transition:.15s}
.check-btn:hover,.big-btn:hover{filter:brightness(1.08)}
.order-answer{min-height:56px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:rgba(255,255,255,.04);border:2px dashed var(--line);border-radius:12px;padding:10px;margin-bottom:10px}
.order-bank{display:flex;flex-wrap:wrap;gap:8px}
.word{font-family:inherit;font-size:.95rem;font-weight:700;color:var(--text);background:rgba(167,139,250,.15);border:2px solid rgba(167,139,250,.5);border-radius:10px;padding:9px 13px;cursor:pointer;transition:.15s}
.word:hover{background:rgba(167,139,250,.28)}
.word.used{opacity:.35;cursor:not-allowed}
.in-answer{background:rgba(52,211,153,.15);border-color:rgba(52,211,153,.6)}
.fb{margin-top:12px;font-weight:700;border-radius:12px;padding:12px 14px;font-size:.95rem}
.fb.ok{background:rgba(52,211,153,.15);color:var(--green)}
.fb.bad{background:rgba(248,113,113,.15);color:var(--red)}
.q-actions{margin-top:16px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
.start-screen,.end-screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(6,10,22,.92);text-align:center;padding:20px}
.start-screen.hide,.end-screen.hide{display:none}
.end-screen h2{font-family:'Baloo 2',system-ui,sans-serif;font-size:2rem}
.stars{font-size:1.6rem;letter-spacing:.05em;line-height:1.4}
.list{margin-top:22px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px}
.list h2{font-family:'Baloo 2',system-ui,sans-serif;font-size:1.1rem;margin-bottom:10px}
.list ol{margin-left:20px;color:var(--dim);font-size:.9rem}
.list li{margin-bottom:6px}
.list .st-ok{color:var(--green)}.list .st-bad{color:var(--red)}
.vocab{margin-top:18px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px}
.vocab h2{font-family:'Baloo 2',system-ui,sans-serif;font-size:1.1rem;margin-bottom:10px}
.vocab ul{margin-left:20px;color:var(--dim);font-size:.9rem;columns:2}
.vocab li{margin-bottom:6px}
.vocab .w{color:var(--cyan);font-weight:700}
.teacher{margin-top:18px;color:var(--dim);font-size:.85rem;text-align:center}
@media(max-width:560px){.opts{grid-template-columns:1fr}.q-text{font-size:1.08rem}.vocab ul{columns:1}}
</style>
</head>
<body>
<div class="app">
  <header>
    <h1>@@EMOJI@@ @@TITLE@@</h1>
    <p class="meta"><span class="tag">@@LEVEL@@</span>@@SOURCE@@ · <span id="qcount">@@QCOUNT@@</span> questions · Grammar: @@GRAMMAR@@</p>
    <div class="progress" id="progress"></div>
  </header>
  <div class="stage">
    <div class="video-wrap"><div id="player"></div></div>
    <div class="overlay" id="overlay">
      <div class="q-card">
        <span class="q-badge" id="qbadge"></span>
        <div class="q-text" id="qtext"></div>
        <div id="qbody"></div>
        <div id="qfeedback"></div>
        <div class="q-actions" id="qactions"></div>
      </div>
    </div>
    <div class="start-screen" id="startScreen">
      <div style="font-size:3rem">@@EMOJI@@</div>
      <h2>Ready to watch and learn?</h2>
      <p style="color:var(--dim);max-width:440px">Watch the video and answer the questions. The video pauses when a question appears — press Continue to keep watching.</p>
      <button class="big-btn" id="startBtn">▶ Start lesson</button>
    </div>
    <div class="end-screen hide" id="endScreen">
      <h2>🎉 Lesson complete!</h2>
      <div class="stars" id="endStars"></div>
      <p id="endText"></p>
      <button class="big-btn" onclick="location.reload()">↻ Play again</button>
    </div>
  </div>
  <section class="list">
    <h2>Questions in this lesson</h2>
    <ol id="qlist"></ol>
  </section>
  @@VOCAB_BLOCK@@
  <p class="teacher">Grammar target: @@GRAMMAR@@ · Level @@LEVEL@@ · Questions generated from the real video dialogue.</p>
</div>
<script>
var LESSON = { videoId: '@@VIDEO_ID@@', questions: @@QUESTIONS@@ };
(function(){
  var QS = LESSON.questions;
  var player = null, active = null, results = {}, orderAnswer = [], orderBank = [];
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function norm(s){ return String(s).toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim(); }
  function fmt(t){ t=Math.round(t); var m=Math.floor(t/60), s=t%60; return m+':'+(s<10?'0':'')+s; }
  function buildList(){
    var ol=document.getElementById('qlist'); ol.innerHTML='';
    QS.forEach(function(q,i){
      var li=document.createElement('li'); li.id='li-'+q.id;
      var label=q.type==='mcq'?q.question:(q.type==='fillgap'?q.sentence.replace(/_____/g,'______'):q.correct);
      q._label=label; li.textContent=(i+1)+'. '+label+'  ·  '+fmt(q.time); ol.appendChild(li);
    });
    document.getElementById('qcount').textContent=QS.length;
  }
  function buildProgress(){
    var p=document.getElementById('progress'); p.innerHTML='';
    QS.forEach(function(q){ var s=document.createElement('div'); s.className='seg'; s.id='seg-'+q.id; p.appendChild(s); });
  }
  function updateList(i,ok){
    var q=QS[i], li=document.getElementById('li-'+q.id);
    if(li){ li.innerHTML=(ok?'<span class="st-ok">✔ </span>':'<span class="st-bad">✘ </span>')+esc(q._label); }
    var seg=document.getElementById('seg-'+q.id); if(seg){ seg.classList.add(ok?'ok':'bad'); }
  }
  function loadAPI(){ var t=document.createElement('script'); t.src='https://www.youtube.com/iframe_api'; document.head.appendChild(t); }
  window.onYouTubeIframeAPIReady=function(){
    player=new YT.Player('player',{videoId:LESSON.videoId,width:'100%',height:'100%',playerVars:{rel:0,modestbranding:1,playsinline:1},events:{onReady:function(){},onStateChange:function(e){ if(e.data===YT.PlayerState.ENDED){ showEnd(); } }}});
  };
  document.getElementById('startBtn').addEventListener('click',function(){
    document.getElementById('startScreen').classList.add('hide');
    if(player&&player.playVideo){ player.playVideo(); }
  });
  setInterval(function(){
    if(!player||!player.getCurrentTime||player.getPlayerState()!==YT.PlayerState.PLAYING) return;
    if(active!==null) return;
    var t=player.getCurrentTime();
    for(var i=0;i<QS.length;i++){ var q=QS[i]; if(results[q.id]===undefined&&t>=q.time&&t<q.time+30){ ask(i); return; } }
  },250);
  function ask(i){
    var q=QS[i]; active=i; orderAnswer=[]; orderBank=[];
    player.pauseVideo();
    document.getElementById('qbadge').textContent=q.type.toUpperCase()+' · '+fmt(q.time);
    var text=q.type==='mcq'?q.question:(q.type==='fillgap'?q.sentence:'Put the words in the correct order.');
    document.getElementById('qtext').innerHTML=esc(text).replace(/_____/g,'<span style="color:var(--yellow)">______</span>');
    document.getElementById('qfeedback').innerHTML=''; document.getElementById('qactions').innerHTML='';
    renderBody(q); document.getElementById('overlay').classList.add('show');
  }
  function renderBody(q){
    var body=document.getElementById('qbody'); body.innerHTML='';
    if(q.type==='mcq'){
      var d=document.createElement('div'); d.className='opts';
      q.options.forEach(function(o,i){ var b=document.createElement('button'); b.className='opt'; b.textContent=o; b.onclick=function(){ checkMcq(i,b); }; d.appendChild(b); });
      body.appendChild(d);
    } else if(q.type==='fillgap'){
      var r=document.createElement('div'); r.className='fillrow';
      var inp=document.createElement('input'); inp.id='fillinput'; inp.type='text'; inp.placeholder='Type your answer…'; inp.autocomplete='off';
      var btn=document.createElement('button'); btn.className='check-btn'; btn.textContent='Check';
      btn.onclick=function(){ checkFill(inp); };
      inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ checkFill(inp); } });
      r.appendChild(inp); r.appendChild(btn); body.appendChild(r); setTimeout(function(){ inp.focus(); },50);
    } else {
      var ans=document.createElement('div'); ans.className='order-answer'; ans.id='orderAnswer';
      var bank=document.createElement('div'); bank.className='order-bank'; bank.id='orderBank';
      body.appendChild(ans); body.appendChild(bank);
      var words=q.words.slice();
      for(var i=words.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=words[i];words[i]=words[j];words[j]=tmp; }
      words.forEach(function(w){ orderBank.push({text:w,used:false}); });
      renderOrder();
      var actions=document.getElementById('qactions');
      var clear=document.createElement('button'); clear.className='big-btn'; clear.textContent='Clear';
      clear.style.background='rgba(255,255,255,.12)'; clear.style.color='#fff';
      clear.onclick=function(){ orderAnswer=[]; orderBank.forEach(function(o){ o.used=false; }); renderOrder(); };
      var check=document.createElement('button'); check.className='check-btn'; check.textContent='Check'; check.onclick=checkOrder;
      actions.appendChild(clear); actions.appendChild(check);
    }
  }
  function renderOrder(){
    var ans=document.getElementById('orderAnswer'), bank=document.getElementById('orderBank'); if(!ans||!bank) return;
    ans.innerHTML=''; bank.innerHTML='';
    if(!orderAnswer.length){ ans.innerHTML='<span style="color:var(--dim);font-size:.9rem">Click the words below to build the sentence.</span>'; }
    orderAnswer.forEach(function(o){ var b=document.createElement('button'); b.className='word in-answer'; b.textContent=o.text;
      b.onclick=function(){ var idx=orderAnswer.indexOf(o); if(idx>-1){ orderAnswer.splice(idx,1); } o.used=false; renderOrder(); }; ans.appendChild(b); });
    orderBank.forEach(function(o){ var b=document.createElement('button'); b.className='word'+(o.used?' used':''); b.textContent=o.text;
      b.onclick=function(){ if(o.used) return; o.used=true; orderAnswer.push(o); renderOrder(); }; bank.appendChild(b); });
  }
  function checkMcq(i,btn){
    var q=QS[active], ok=(i===q.correct);
    document.querySelectorAll('#qbody .opt').forEach(function(o,j){ o.disabled=true; if(j===q.correct){ o.classList.add('correct'); } });
    if(!ok){ btn.classList.add('wrong'); }
    finish(ok, ok?'✅ Correct! '+esc(q.explain||''):'❌ Not quite. The answer is “'+esc(q.options[q.correct])+'”. '+esc(q.explain||''));
  }
  function checkFill(inp){
    var q=QS[active], v=inp.value.trim(); if(!v){ inp.focus(); return; }
    var ok=norm(v)===norm(q.answer); inp.disabled=true;
    finish(ok, ok?'✅ Correct!':'❌ The answer is “'+esc(q.answer)+'”.');
  }
  function checkOrder(){
    var q=QS[active];
    var guess=orderAnswer.map(function(o){ return o.text; }).join(' ').replace(/\s+$/,'');
    var target=String(q.correct).replace(/\s+$/,'');
    var ok=guess===target;
    finish(ok, ok?'✅ Correct!':'❌ The sentence is: “'+esc(q.correct)+'”.');
  }
  function finish(ok,msg){
    var q=QS[active]; results[q.id]=ok;
    document.getElementById('qfeedback').innerHTML='<div class="fb '+(ok?'ok':'bad')+'">'+msg+'</div>';
    var actions=document.getElementById('qactions'); actions.innerHTML='';
    var btn=document.createElement('button'); btn.id='continueBtn'; btn.className='big-btn'; btn.textContent='Continue ▶';
    btn.onclick=function(){ document.getElementById('overlay').classList.remove('show'); active=null; if(player&&player.playVideo){ player.playVideo(); } };
    actions.appendChild(btn); updateList(active,ok);
  }
  function showEnd(){
    if(active!==null){ document.getElementById('overlay').classList.remove('show'); active=null; }
    var total=QS.length, done=0, correct=0;
    QS.forEach(function(q){ if(results[q.id]!==undefined){ done++; if(results[q.id]){ correct++; } } });
    var stars=''; QS.forEach(function(q){ stars+=(results[q.id]===true)?'⭐':'☆'; });
    document.getElementById('endStars').textContent=stars;
    document.getElementById('endText').textContent='You got '+correct+' out of '+done+' questions right.'+(done<total?' ('+(total-done)+' not reached)':'');
    document.getElementById('endScreen').classList.remove('hide');
  }
  buildList(); buildProgress(); loadAPI();
})();
</script>
</body>
</html>
'''

INDEX_TEMPLATE = r'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; media-src 'self'; object-src 'none'; frame-ancestors 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Video Lessons — Articulate English</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#0b1220;--card:#16223c;--line:rgba(255,255,255,.09);--text:#f5f8ff;--dim:#9fb0d0;--yellow:#ffd23f;--cyan:#22d3ee;--green:#34d399;--violet:#a78bfa}
*{box-sizing:border-box;margin:0;padding:0}
body{background:radial-gradient(1200px 600px at 50% -10%,#1b2a4d 0%,var(--bg) 55%);color:var(--text);font-family:'Nunito',system-ui,sans-serif;line-height:1.6;min-height:100vh;padding:24px}
.wrap{max-width:1100px;margin:0 auto}
header{margin-bottom:22px}
h1{font-family:'Baloo 2',system-ui,sans-serif;font-size:clamp(1.7rem,4vw,2.6rem);font-weight:800;letter-spacing:-.02em}
.sub{color:var(--dim);margin-top:6px;max-width:640px}
.lvl{font-family:'Baloo 2',system-ui,sans-serif;font-size:1.3rem;margin:26px 0 12px;color:var(--yellow);letter-spacing:.02em}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
.card{display:block;text-decoration:none;color:var(--text);background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;transition:.18s}
.card:hover{transform:translateY(-3px);border-color:var(--cyan);box-shadow:0 16px 40px rgba(0,0,0,.4)}
.thumb{font-size:2.2rem;margin-bottom:8px}
.card h3{font-family:'Baloo 2',system-ui,sans-serif;font-size:1.08rem;font-weight:700;margin-bottom:6px}
.card .g{color:var(--cyan);font-size:.82rem;font-weight:700;margin-bottom:4px}
.card .m{color:var(--dim);font-size:.8rem;margin-bottom:10px}
.cta{display:inline-block;color:var(--yellow);font-weight:800;font-size:.85rem}
.note{margin-top:26px;color:var(--dim);font-size:.82rem;text-align:center}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>🎬 Video Lessons</h1>
    <p class="sub">Watch real nature videos, answer questions, and learn English. Each lesson targets one grammar point from the test-english.com A2 / B1 syllabus. @@COUNT@@ lessons.</p>
    <p class="sub" style="margin-top:10px"><a href="request.html" style="color:var(--yellow);font-weight:800;text-decoration:none">+ Request a lesson &rarr;</a> <span style="opacity:.8">&middot; We'll email you when it's live.</span></p>
  </header>
  @@CARDS@@
  <p class="note">Made with the Articulate Video Lesson pipeline · Questions are generated from the real video dialogue.</p>
</div>
</body>
</html>
'''


def esc(s):
    return html.escape(str(s), quote=True)


def load_specs():
    specs = []
    for p in sorted(glob.glob(os.path.join(SPECS_DIR, '*.json'))):
        with open(p, encoding='utf-8') as f:
            specs.append(json.load(f))
    return specs


def build_lesson(spec):
    out = LESSON_TEMPLATE
    out = out.replace('@@TITLE@@', esc(spec['title']))
    out = out.replace('@@LEVEL@@', esc(spec['level']))
    out = out.replace('@@GRAMMAR@@', esc(spec.get('grammar', '')))
    out = out.replace('@@SOURCE@@', esc(spec.get('source', '')))
    out = out.replace('@@EMOJI@@', esc(spec.get('emoji', '🎬')))
    out = out.replace('@@VIDEO_ID@@', spec['videoId'])
    out = out.replace('@@QCOUNT@@', str(len(spec['questions'])))
    qjson = json.dumps(spec['questions'], ensure_ascii=False).replace('<', '\\u003c')
    out = out.replace('@@QUESTIONS@@', qjson)
    vocab = ''.join('<li><span class="w">%s</span> — %s</li>' % (esc(v['w']), esc(v['d']))
                    for v in spec.get('vocab', []))
    out = out.replace('@@VOCAB_BLOCK@@',
                      ('<section class="vocab"><h2>Key words to remember</h2><ul>' + vocab + '</ul></section>') if vocab else '')
    path = os.path.join(LESSONS_DIR, spec['slug'] + '.html')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(out)
    return path


def build_index(specs):
    by_level = {}
    for s in specs:
        by_level.setdefault(s['level'], []).append(s)
    cards = ''
    for level in sorted(by_level.keys()):
        cards += '<h2 class="lvl">Level %s</h2><div class="grid">' % esc(level)
        for s in by_level[level]:
            cards += ('<a class="card" href="lessons/%s.html">'
                      '<div class="thumb">%s</div>'
                      '<h3>%s</h3>'
                      '<p class="g">🎯 %s</p>'
                      '<p class="m">%s · %d questions</p>'
                      '<span class="cta">Start lesson →</span></a>') % (
                      esc(s['slug']), esc(s.get('emoji', '🎬')), esc(s['title']),
                      esc(s.get('grammar', '')), esc(s.get('source', '')), len(s['questions']))
        cards += '</div>'
    out = INDEX_TEMPLATE.replace('@@CARDS@@', cards).replace('@@COUNT@@', str(len(specs)))
    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        f.write(out)


def main():
    os.makedirs(LESSONS_DIR, exist_ok=True)
    os.makedirs(SPECS_DIR, exist_ok=True)
    specs = load_specs()
    if not specs:
        print('No specs found in', SPECS_DIR)
        return 1
    for s in specs:
        p = build_lesson(s)
        print('built', p, '(%d questions)' % len(s['questions']))
    build_index(specs)
    print('built', INDEX_PATH, '(%d lessons)' % len(specs))
    return 0


if __name__ == '__main__':
    sys.exit(main())
