
// CSVの場所を自動検出しつつ、キャッシュを確実に避ける
const CSV_CANDIDATES = ['data/results.csv', 'results.csv'];
function bust(url){ return url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(); }

async function loadCSVAuto(){
  for (const p of CSV_CANDIDATES) {
    try {
      const res = await fetch(bust(p), {cache:'no-store'});
      if (res.ok) {
        const text = await res.text();
        return { path: p, ...parseCSV(text) };
      }
    } catch (_) { /* 次を試す */ }
  }
  throw new Error('CSVが見つかりません（data/results.csv か results.csv を配置してください）');
}

const BONUS_RACES = new Set(['阪神JF','朝日杯FS','ホープフルS']);
const PARTICIPANTS = ['池田','サノケンジ','王','村山先生','大輔'];

async function loadCSV(path){
  const res = await fetch(path, {cache:'no-store'});
  const text = await res.text();
  return parseCSV(text);
}
function parseCSV(text){
  const lines = text.replace(/\r/g,'').split('\n').filter(l=>l.trim().length>0);
  const header = splitCSVLine(lines[0]);
  const rows = lines.slice(1).map(l=>{
    const cells = splitCSVLine(l);
    const obj = {};
    header.forEach((h,i)=> obj[h] = (cells[i] ?? '').trim());
    return obj;
  });
  return {header, rows};
}
function splitCSVLine(line){
  const out=[]; let cur='', inside=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c === '"'){
      if(inside && line[i+1] === '"'){ cur+='"'; i++; }
      else { inside=!inside; }
    }else if(c === ',' && !inside){
      out.push(cur); cur='';
    }else{
      cur+=c;
    }
  }
  out.push(cur); return out;
}
function baseWinPoints(r){ return BONUS_RACES.has(r) ? 15 : 10; }
function oddsBonus(o){
  const n = Number(o);
  if(!isFinite(n)) return 0;
  if(n >= 50) return 10;
  if(n >= 20) return 5;
  return 0;
}
function scoreFor(pred, first, second, third, odds, raceName){
  if(!pred) return 0;
  if(pred === first) return baseWinPoints(raceName) + oddsBonus(odds);
  if(pred === second) return 3;
  if(pred === third) return 1;
  return 0;
}
function rankNumbers(totals){
  const sorted=[...totals].sort((a,b)=>b.total-a.total);
  const ranks=new Map(); let prev=null, cur=0, idx=0;
  for(const s of sorted){ idx++; if(prev===null || s.total<prev){cur=idx; prev=s.total;} ranks.set(s.name, cur); }
  return ranks;
}
function renderStandings(rows){
  const totals = PARTICIPANTS.map(name => ({
    name,
    total: rows.reduce((sum,r)=> sum + scoreFor(r[name], r['1着'], r['2着'], r['3着'], r['単勝オッズ'], r['レース名']), 0)
  }));
  const ranks = rankNumbers(totals);
  const top3 = [...totals].sort((a,b)=>b.total-a.total).slice(0,3);
  const kpi = top3.map((t,i)=>{
    const cls = i===0?'rank-1': i===1?'rank-2':'rank-3';
    const medal = i===0?'🥇': i===1?'🥈':'🥉';
    return `<div class="pill ${cls}">${medal} <b>${t.name}</b>：<b>${t.total}</b> pt（${ranks.get(t.name)}位）</div>`;
  }).join('');
  const others = totals
    .sort((a,b)=>b.total-a.total)
    .map(t=>`<div class="pill">${ranks.get(t.name)}位 <b>${t.name}</b>：<b>${t.total}</b> pt</div>`)
    .join('');
  document.getElementById('standings').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
      <h2 style="margin:0;font-size:18px">現在順位</h2>
      <span class="tag">CSV自動集計</span>
    </div>
    <div class="kpi" style="margin-top:10px">${kpi}</div>
    <div class="kpi" style="margin-top:10px">${others}</div>
  `;
}
function renderTable(header, rows){
  const tblHead = `
    <thead><tr>
      <th>レース名</th>
      <th>1着</th>
      <th>2着</th>
      <th>3着</th>
      <th class="hide-s">単勝オッズ</th>
      ${PARTICIPANTS.map(n=>`<th>${n}</th>`).join('')}
    </tr></thead>`;
  const body = rows.map(r => {
    const first=r['1着'], second=r['2着'], third=r['3着'], odds=r['単勝オッズ'];
    const tds = PARTICIPANTS.map(n => {
      const pred=r[n]; let cls='';
      if(pred && first && pred===first) cls='match-win';
      else if(pred && second && pred===second) cls='match-2';
      else if(pred && third && pred===third) cls='match-3';
      return `<td class="${cls}">${pred??''}</td>`;
    }).join('');
    return `<tr>
      <td>${r['レース名']||''}</td>
      <td>${first||''}</td>
      <td>${second||''}</td>
      <td>${third||''}</td>
      <td class="hide-s">${odds||''}</td>
      ${tds}
    </tr>`;
  }).join('');
  document.getElementById('table-wrap').innerHTML = `<table class="table">${tblHead}<tbody>${body}</tbody></table>`;
}
async function main(){
  try{
    const {header, rows} = await loadCSV(CSV_PATH);
    renderStandings(rows);
    renderTable(header, rows);
  }catch(e){
    document.getElementById('table-wrap').innerHTML = `<div style="color:#f88">CSVの読み込みに失敗しました：${e}</div>`;
  }
}
async function main(){
  try{
    const {header, rows, path} = await loadCSVAuto();
    const badge = document.querySelector('.tag');
    if (badge) badge.textContent = `${path} 読み込み`;
    renderStandings(rows);
    renderTable(header, rows);
  }catch(e){
    document.getElementById('table-wrap').innerHTML =
      `<div style="color:#f88">CSVの読み込みに失敗しました：${e}</div>`;
  }
}
main();

