import { describeMemory, memoryEdges, arrangeMemories, OBJECT_TYPES } from './memory-model.mjs';

import {createSpatialState,normalizeSpatialState,moveSpatialObject,resetSpatialLayout,setSpatialObjectType,applySpatialPositions} from './spatial-state.mjs';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = {chat:'❞',experiment:'△',document:'▤',research:'⌕',media:'▧',connection:'✧',book:'▥',image:'▧',video:'▰',audio:'♫',code:'⌘',claim:'✧',folder:'▱',network:'⌘',character:'☺',database:'▰',service:'▣',cloud:'☁',portal:'◎'};
const graphViews = ['skilltree','radialtree'];
const allViews = ['objects',...graphViews,'cards','list'];
const layouts = [['bands','▱','Object bands'],['rooms','◫','Rooms'],['lanes','☷','Lanes'],['radial','◎','Radial'],['grid','▦','Grid']];
const previewCache = new Map();
const PAGE_SIZE = 60;
let sessionSpatial;

function wrappedLines(ctx, text, width, maxLines) {
  // A thumbnail is bounded work even when a captured note is very large.
  const words = String(text).slice(0,2400).replace(/\s+/g,' ').split(' ');
  const lines=[];let line='';
  function clipped(){if(lines.length)lines[lines.length-1]=lines[lines.length-1].slice(0,-2)+'…';return lines;}
  for(let index=0;index<words.length;index++) {
    let word=words[index];
    if(line && ctx.measureText(`${line} ${word}`).width>width){lines.push(line);line='';if(lines.length>=maxLines)return clipped();}
    while(ctx.measureText(word).width>width && word.length>1) {
      let low=1,high=word.length;
      while(low<high){const mid=Math.ceil((low+high)/2);if(ctx.measureText(word.slice(0,mid)).width<=width)low=mid;else high=mid-1;}
      lines.push(word.slice(0,low));word=word.slice(low);if(lines.length>=maxLines)return clipped();
    }
    line=line?`${line} ${word}`:word;
  }
  if(line)lines.push(line);
  return lines.slice(0,maxLines);
}

// A small, exact-content document preview. No invented image or remote fetch.
export function previewFor(node) {
  const key = JSON.stringify([node.id,node.title,node.text,node.type,node.status,node.objectType]);
  if(previewCache.has(key)) return previewCache.get(key);
  const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 600;
  const ctx = canvas.getContext('2d'); if(!ctx) return '';
  const accent = node.type === 'raw' ? '#34749e' : '#7953b5';
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,480,600);
  ctx.fillStyle = node.type === 'raw' ? '#e9f4fa' : '#f0e9fa'; ctx.fillRect(0,0,480,84);
  ctx.fillStyle = accent; ctx.fillRect(0,0,10,600);
  ctx.font = 'bold 32px Arial'; ctx.fillText(icons[node.icon] || '▤',32,53);
  ctx.font = 'bold 18px Arial'; ctx.fillText(node.type === 'raw' ? (OBJECT_TYPES.find(t=>t.id===node.objectType)?.label||'Original note').toUpperCase() : 'INTERPRETATION',86,49);
  ctx.fillStyle = '#262136'; ctx.font = 'bold 32px Arial';
  let y = 130;
  for(const line of wrappedLines(ctx,node.title,410,3)) {ctx.fillText(line,32,y);y+=39;}
  y += 21; ctx.fillStyle = '#e2deea'; ctx.fillRect(32,y,410,2); y += 37;
  ctx.fillStyle = '#625c70'; ctx.font = '22px Arial';
  for(const line of wrappedLines(ctx,node.text,410,Math.max(3,Math.floor((510-y)/31)))) {ctx.fillText(line,32,y);y+=31;}
  ctx.fillStyle = accent; ctx.fillRect(32,545,416,1);
  ctx.font = 'bold 16px Arial'; ctx.fillText(node.type === 'raw' ? 'PRESERVED SOURCE' : String(node.status || 'proposed').toUpperCase(),32,575);
  const url = canvas.toDataURL('image/png');
  if(previewCache.size > 120) previewCache.clear(); previewCache.set(key,url); return url;
}

export function readExplorerPreference() {
  try {const p = JSON.parse(localStorage.getItem('astral-travel.explorer') || '{}'); return {view:allViews.includes(p.view)?p.view:'objects',layout:layouts.some(([id])=>id===p.layout)?p.layout:'bands'};}
  catch {return {view:'objects',layout:'bands'};}
}
export function saveExplorerPreference(view,layout) {
  try {localStorage.setItem('astral-travel.explorer',JSON.stringify({view,layout}));} catch { /* Appearance still works in this session. */ }
}

export function createMemoryExplorer(host,{onSelect,onLayout,onView,detailsHtml,onNotice=()=>{}}) {
  let data, renderer = null, generation = 0, destroyed = false, page = 0, contentKey = '', arrangementKey = '', currentView = '', cardZoom = 1, board = null;
  let visibleNodes = [], visibleEdges = [], allEdges = [], arrangement, rendererMode = '', inspectedId = '', graphFormKey = '';
  const SPATIAL_KEY='astral-travel.spatial.v1';
  let spatial=createSpatialState(),history=[];
  if(sessionSpatial)spatial=normalizeSpatialState(sessionSpatial);
  else{try{spatial=normalizeSpatialState(JSON.parse(localStorage.getItem(SPATIAL_KEY)||'null'));}catch{}}
  sessionSpatial=spatial;
  function saveSpatial(next){history.push(spatial);if(history.length>30)history.shift();spatial=next;persistSpatial();}
  function persistSpatial(){sessionSpatial=spatial;try{localStorage.setItem(SPATIAL_KEY,JSON.stringify(spatial));}catch{onNotice('Placement is session-only because browser storage is unavailable.');}}
  function customPositions(){return visibleNodes.some(r=>Object.hasOwn(spatial.layouts[data.layout]||{},r.id));}
  function describe(record){const node=describeMemory(record,data.rawIds.has(record.id)?'raw':'claim');const custom=spatial.objects[node.id];return {...node,objectType:node.type==='raw'&&custom?custom:node.objectType,icon:node.type==='raw'&&custom?custom:node.icon};}
  function moveObject(id,point){
    if(!visibleNodes.some(n=>n.id===id)||!Number.isFinite(point?.x)||!Number.isFinite(point?.z))return;
    let next=spatial;
    // Save the complete visible arrangement so radial selection cannot reshuffle a hand-placed scene.
    for(const [key,value]of arrangement.positions)next=moveSpatialObject(next,data.layout,key,value);
    next=moveSpatialObject(next,data.layout,id,point);saveSpatial(next);
    onSelect(id);refreshPlacementControls();
  }
  function refreshPlacementControls(){
    const undo=host.querySelector('[data-explorer-action="undo-move"]'),reset=host.querySelector('[data-explorer-action="reset-layout"]');
    if(undo)undo.disabled=!history.length;if(reset)reset.disabled=!customPositions();
    const caption=host.querySelector('[data-scene-note]');if(caption)caption.textContent=stageCaption();
  }
  const themeObserver = new MutationObserver(()=>renderer?.setTheme(document.documentElement.dataset.theme || 'light'));
  themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const resizeObserver = new ResizeObserver(()=>{if(currentView==='cards'&&board?.fit)fitCards();});
  resizeObserver.observe(host);

  function inspector() {
    const node = data.records.find(r=>r.id===data.selectedId);
    const pane = host.querySelector('.visual-inspector'); if(!pane || !node) return;
    if(inspectedId!==node.id)pane.scrollTop=0;inspectedId=node.id;
    const described = describe(node),position=arrangement.positions.get(node.id);
    const active=document.activeElement?.dataset?.nudge;
    const objectControls=`<div class="object-controls"><label for="object-form">OBJECT FORM</label><select id="object-form" aria-label="Object form" ${described.type==='claim'?'disabled':''}>${described.type==='claim'?'<option>Interpretation tablet</option>':`<option value="">Automatic · ${escapeHtml(OBJECT_TYPES.find(t=>t.id===describeMemory(node,'raw').objectType)?.label||'Document')}</option>${OBJECT_TYPES.filter(t=>t.id!=='claim').map(t=>`<option value="${t.id}" ${spatial.objects[node.id]===t.id?'selected':''}>${escapeHtml(t.icon)} ${escapeHtml(t.label)}</option>`).join('')}`}</select>${currentView==='objects'&&position?`<div class="object-position"><span>Move on floor <small>X ${position.x.toFixed(1)} · Z ${position.z.toFixed(1)}</small></span><div role="group" aria-label="Move selected object"><button data-nudge="north" aria-label="Move object backward">↑</button><button data-nudge="west" aria-label="Move object left">←</button><button data-nudge="east" aria-label="Move object right">→</button><button data-nudge="south" aria-label="Move object forward">↓</button></div></div>`:''}</div>`;
    pane.innerHTML=`<div class="record-preview"><img src="${previewFor(described)}" alt="Preview of the saved text for ${escapeHtml(node.title)}" width="480" height="600"></div><p class="preview-caption">ACTUAL SAVED TEXT · FULL CONTENT BELOW</p>${objectControls}${detailsHtml(node)}`;
    if(active)host.querySelector(`[data-nudge="${active}"]`)?.focus({preventScroll:true});
  }
  function fitCards() {
    const stage = host.querySelector('.cards-stage'); if(!stage || !board) return;
    board.fit=true;cardZoom = Math.max(.03,Math.min(1,(stage.clientWidth-24)/board.width,(stage.clientHeight-24)/board.height));
    applyCardZoom(); stage.scrollLeft=0;stage.scrollTop=0;
  }
  function applyCardZoom() {
    const inner=host.querySelector('.cards-board'),space=host.querySelector('.cards-space');if(!inner||!space||!board)return;
    inner.style.transform=`scale(${cardZoom})`;space.style.width=`${board.width*cardZoom}px`;space.style.height=`${board.height*cardZoom}px`;
    const label=host.querySelector('[data-zoom-label]');if(label)label.textContent=`${Math.round(cardZoom*100)}%`;
  }
  function renderCards(resetFit = true) {
    const stage=host.querySelector('.cards-stage');if(!stage)return;
    const oldScroll=[stage.scrollLeft,stage.scrollTop];const focusedId=document.activeElement?.dataset?.memorySelect;
    const positions=arrangement.positions, values=[...positions.values()];
    const minX=Math.min(...values.map(p=>p.x)),minZ=Math.min(...values.map(p=>p.z));
    const points=new Map(visibleNodes.map(n=>{const p=positions.get(n.id);return [n.id,{x:(p.x-minX)*64+34,y:(p.z-minZ)*72+55}];}));
    const width=Math.max(240,...[...points.values()].map(p=>p.x+205));
    const height=Math.max(260,...[...points.values()].map(p=>p.y+238));
    board={width,height,fit:resetFit};
    const edges=visibleEdges.map(e=>{const a=points.get(e.from),b=points.get(e.to);if(!a||!b)return '';const hot=e.from===data.selectedId||e.to===data.selectedId;return `<path class="${hot?'edge-active':''}" d="M${a.x+85},${a.y+102} C${a.x+85},${(a.y+b.y)/2+102} ${b.x+85},${(a.y+b.y)/2+102} ${b.x+85},${b.y+102}" fill="none"><title>${escapeHtml(e.type)}</title></path>`;}).join('');
    stage.innerHTML=`<div class="cards-space"><div class="cards-board" style="width:${width}px;height:${height}px"><svg class="card-edges" width="${width}" height="${height}" aria-hidden="true">${edges}</svg>${arrangement.groups.map(g=>{const members=visibleNodes.filter(n=>{const p=positions.get(n.id);return p&&Math.abs(p.x-g.x)<=g.width/2&&Math.abs(p.z-g.z)<=g.depth/2;});const ps=members.map(n=>points.get(n.id));if(!ps.length)return '';return `<span class="card-group-label" style="left:${Math.min(...ps.map(p=>p.x))}px;top:${Math.min(...ps.map(p=>p.y))-28}px">${escapeHtml(g.label)}</span>`;}).join('')}${visibleNodes.map(n=>{const p=points.get(n.id);return `<button class="preview-card ${n.id===data.selectedId?'selected':''}" data-memory-select="${escapeHtml(n.id)}" data-type="${n.type}" aria-label="Inspect ${escapeHtml(n.title)}" aria-pressed="${n.id===data.selectedId}" style="left:${p.x}px;top:${p.y}px"><div class="preview-card-image"><img src="${n.previewUrl}" alt="" width="480" height="600"></div><div class="preview-card-copy"><small>${icons[n.icon]||'▤'} ${n.type==='raw'?'ORIGINAL':escapeHtml(n.status.toUpperCase())}</small><h4>${escapeHtml(n.title)}</h4><p>${escapeHtml(n.text.slice(0,90))}</p></div></button>`;}).join('')}</div></div>`;
    if(resetFit)fitCards();else{applyCardZoom();stage.scrollLeft=oldScroll[0];stage.scrollTop=oldScroll[1];}
    if(focusedId)[...stage.querySelectorAll('[data-memory-select]')].find(b=>b.dataset.memorySelect===focusedId)?.focus({preventScroll:true});
  }
  function footer(total) {
    const ids=new Set(visibleNodes.map(n=>n.id));const outside=allEdges.filter(e=>ids.has(e.from)!==ids.has(e.to)).length;
    return `<div class="stage-footer"><div class="stage-legend"><span><i class="raw-dot"></i> Raw sources</span><span><i class="claim-dot"></i> Processed</span><span>Lines = recorded references</span>${outside?`<span class="outside-connections">${outside} connection${outside===1?'':'s'} outside this view · follow the source trail</span>`:''}</div><div class="explorer-pagination"><span>${page*PAGE_SIZE+1}–${Math.min((page+1)*PAGE_SIZE,total)} of ${total}</span>${total>PAGE_SIZE?`<button class="scene-control" data-explorer-action="previous" ${page===0?'disabled':''} aria-label="Previous memories">←</button><button class="scene-control" data-explorer-action="next" ${(page+1)*PAGE_SIZE>=total?'disabled':''} aria-label="Next memories">→</button>`:''}</div></div>`;
  }
  function toolbar() {
    const graph=graphViews.includes(data.view);
    const arrange=graph?`<span class="graph-style-title">${data.view==='skilltree'?'⌘ Branching skill tree':'◎ Radial tree'}</span><span class="graph-style-origin">Inspired by Graph Gallery</span>`:`<span class="arrange-label">ARRANGE</span><div class="layout-options" role="group" aria-label="Memory arrangement">${layouts.map(([id,icon,label])=>`<button data-memory-layout="${id}" class="${data.layout===id?'active':''}" aria-pressed="${data.layout===id}"><span aria-hidden="true">${icon}</span> ${label}</button>`).join('')}</div>`;
    return `<div class="arrange-bar">${arrange}<div class="camera-tools">${graph?'':`<button class="scene-control" data-explorer-action="undo-move" aria-label="Undo arrangement change" title="Undo arrangement change" ${history.length?'':'disabled'}>↶</button><button class="scene-control" data-explorer-action="reset-layout" aria-label="Reset arrangement" title="Return this arrangement to its automatic layout" ${customPositions()?'':'disabled'}>↺ <span>Reset</span></button>`}<button class="scene-control" data-explorer-action="fit" title="Fit all visible memories" aria-label="Fit all memories">⛶ <span>Fit</span></button><button class="scene-control" data-explorer-action="focus" title="Focus selected memory" aria-label="Focus selected memory">◎</button><button class="scene-control" data-explorer-action="zoom-out" aria-label="Zoom out">−</button><span data-zoom-label></span><button class="scene-control" data-explorer-action="zoom-in" aria-label="Zoom in">＋</button></div></div>`;
  }
  function stageCaption() {
    if(graphViews.includes(currentView))return `${currentView==='skilltree'?'Follow real connections through branching lanes':'Explore real connections around a central memory'} · Drag the background to pan · scroll to zoom · select an object to inspect`;
    const arrangementDescriptions={bands:'Clouds → networks → data → folders → sources → people',rooms:'Grouped by topic',lanes:'Sources → interpretations',radial:'Selected memory at the center',grid:'An even grid for scanning'};
    return `${rendererMode==='compatibility'&&currentView==='objects'?'Compatibility 3D · ':''}${customPositions()?'Your arrangement · saved on this device':arrangementDescriptions[data.layout]} · ${currentView==='objects'?'Drag an object to move · drag empty space to orbit · scroll to zoom':'Select a preview to inspect it · zoom for larger cards'}`;
  }
  function renderList() {
    const oldTop=host.querySelector('.memory-list')?.scrollTop||0;const focusedId=document.activeElement?.dataset?.memorySelect;
    host.querySelector('.visual-pane').innerHTML=`<div class="memory-list visual-memory-list">${visibleNodes.map(n=>`<button class="memory-item ${n.id===data.selectedId?'selected':''}" data-memory-select="${escapeHtml(n.id)}" aria-pressed="${n.id===data.selectedId}"><img class="list-preview" src="${n.previewUrl}" alt="" width="45" height="56"><div class="list-item-copy"><h4>${escapeHtml(n.title)}</h4><p>${escapeHtml(n.text)}</p><small>${icons[n.icon]||'▤'} ${n.type==='raw'?'Raw source':`${escapeHtml(n.status)} interpretation`} · ${escapeHtml(n.category)}</small></div></button>`).join('')}</div>${footer(data.records.length)}`;
    host.querySelector('.memory-list').scrollTop=oldTop;if(focusedId)[...host.querySelectorAll('[data-memory-select]')].find(b=>b.dataset.memorySelect===focusedId)?.focus({preventScroll:true});
  }
  function sceneOptions(stage, onError) {
    return {nodes:visibleNodes,edges:visibleEdges,positions:arrangement.positions,groups:arrangement.groups,selectedId:data.selectedId,onSelect,onMove:moveObject,onReady:()=>stage.querySelector('.stage-loading')?.remove(),onError};
  }
  async function mount3D() {
    const ticket=++generation, stage=host.querySelector('.object-stage');rendererMode='native';
    try {
      const {mountObjects3D}=await import('./objects-3d.mjs');
      if(destroyed||ticket!==generation||!stage?.isConnected)return;
      renderer=mountObjects3D(stage,sceneOptions(stage,()=>showFallback(ticket,stage)));
      renderer.setTheme(document.documentElement.dataset.theme||'light');
    } catch(error) {if(!destroyed&&ticket===generation)showFallback(ticket,stage);}
  }
  async function showFallback(ticket,stage) {
    if(destroyed||ticket!==generation||!stage?.isConnected||rendererMode==='compatibility')return;
    rendererMode='compatibility';renderer?.destroy();renderer=null;
    stage.innerHTML='<div class="stage-loading">Opening compatibility 3D…</div>';
    try {
      const {mountCompatibility3D}=await import('./objects-css3d.mjs');
      if(destroyed||ticket!==generation||!stage.isConnected)return;
      renderer=mountCompatibility3D(stage,sceneOptions(stage,()=>showCardsFallback(ticket,stage)));
      renderer.setTheme(document.documentElement.dataset.theme||'light');
      const caption=host.querySelector('[data-scene-note]');if(caption)caption.textContent=stageCaption();
    } catch(error) {showCardsFallback(ticket,stage);}
  }
  async function mountGraph() {
    const ticket=++generation,stage=host.querySelector('.graph-style-stage');rendererMode='graph';
    try {
      const {mountGraphStyle}=await import('./graph-styles.mjs');
      if(destroyed||ticket!==generation||!stage?.isConnected)return;
      renderer=mountGraphStyle(stage,{style:currentView,nodes:visibleNodes,edges:visibleEdges,selectedId:data.selectedId,onSelect,onReady:()=>stage.querySelector('.stage-loading')?.remove(),onError:()=>showCardsFallback(ticket,stage)});
      renderer.setTheme(document.documentElement.dataset.theme||'light');
    }catch(error){showCardsFallback(ticket,stage);}
  }
  function showCardsFallback(ticket,stage) {
    if(destroyed||ticket!==generation||!stage?.isConnected)return;
    renderer?.destroy();renderer=null;
    stage.innerHTML='<div class="stage-fallback"><span aria-hidden="true">▤</span><h4>Open the same memories as cards.</h4><p>This browser could not start the visual view. Your records and sources are ready in the card view.</p><button class="button small primary" data-explorer-action="cards">Open cards</button></div>';
  }
  function update(next) {
    if(destroyed)return;
    data=next;
    const nextKey=JSON.stringify(next.records.map(r=>[r.id,r.title,r.text,r.status,r.rawIds,r.tags]))+JSON.stringify(next.links);
    if(contentKey!==nextKey){page=0;allEdges=memoryEdges(next.allRecords||next.records,next.links);}
    page=Math.min(page,Math.max(0,Math.ceil(next.records.length/PAGE_SIZE)-1));
    const selectedIndex=next.records.findIndex(r=>r.id===next.selectedId);
    if(selectedIndex>=0&&(selectedIndex<page*PAGE_SIZE||selectedIndex>=(page+1)*PAGE_SIZE))page=Math.floor(selectedIndex/PAGE_SIZE);
    const visible=next.records.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
    visibleNodes=visible.map(r=>{const node=describe(r);return {...node,previewUrl:previewFor(node)};});
    visibleEdges=memoryEdges(visible,next.links);
    arrangement=arrangeMemories(visibleNodes,visibleEdges,next.layout,next.selectedId);
    arrangement.positions=applySpatialPositions(arrangement.positions,spatial,next.layout);
    if(customPositions())arrangement.groups=[];
    const nextArrangementKey=`${next.layout}|${page}|${JSON.stringify([...arrangement.positions])}|${JSON.stringify(spatial.objects)}`;
    const changed=currentView!==next.view||contentKey!==nextKey||!host.querySelector('.memory-explorer');
    const layoutChanged=arrangementKey!==nextArrangementKey;
    const nextFormKey=JSON.stringify(spatial.objects),formsChanged=graphFormKey!==nextFormKey;graphFormKey=nextFormKey;
    const shouldFit=arrangementKey.split('|')[0]!==next.layout||arrangementKey.split('|')[1]!==String(page)||!customPositions();
    contentKey=nextKey;arrangementKey=nextArrangementKey;currentView=next.view;
    if(!next.records.length) {generation++;renderer?.destroy();renderer=null;host.innerHTML='<div class="empty-state"><span>⌕</span><h4>No memories found</h4><p>Try another word, choose a different layer, or add your first memory.</p></div>';return;}
    if(changed) {
      generation++;renderer?.destroy();renderer=null;
      host.innerHTML=`<div class="memory-explorer"><section class="visual-pane" aria-label="Memory ${currentView==='objects'?'3D objects':currentView}">${currentView==='list'?'':`${toolbar()}${currentView==='objects'?'<div class="object-stage" aria-label="Interactive 3D memory scene"><div class="stage-loading">Opening your memory objects…</div></div>':graphViews.includes(currentView)?'<div class="graph-style-stage" aria-label="Interactive memory graph"><div class="stage-loading">Connecting your memories…</div></div>':'<div class="cards-stage" tabindex="0" aria-label="Memory card canvas"></div>'}<div class="scene-record-picker"><label for="scene-memory-select">Inspect a memory</label><select id="scene-memory-select" aria-label="Inspect a memory">${visibleNodes.map(n=>`<option value="${escapeHtml(n.id)}" ${n.id===data.selectedId?'selected':''}>${escapeHtml(n.title)}</option>`).join('')}</select></div><p class="stage-caption" data-scene-note>${stageCaption()}</p>${footer(next.records.length)}`}</section><aside class="detail-panel visual-inspector" aria-label="Selected memory"></aside></div>`;
      if(currentView==='objects')mount3D();
      if(graphViews.includes(currentView))mountGraph();
    }
    if(currentView==='cards')renderCards(changed||layoutChanged);
    if(currentView==='list')renderList();
    if(!changed&&currentView==='objects'&&renderer) {
      renderer.update(layoutChanged?{nodes:visibleNodes,edges:visibleEdges,positions:arrangement.positions,groups:arrangement.groups,selectedId:next.selectedId}:{selectedId:next.selectedId});
      if(layoutChanged&&shouldFit)renderer.fit();
    }
    if(!changed&&graphViews.includes(currentView)&&renderer)renderer.update(formsChanged?{nodes:visibleNodes,edges:visibleEdges,selectedId:next.selectedId}:{selectedId:next.selectedId});
    host.querySelectorAll('[data-memory-layout]').forEach(b=>{b.classList.toggle('active',b.dataset.memoryLayout===next.layout);b.setAttribute('aria-pressed',String(b.dataset.memoryLayout===next.layout));});
    const caption=host.querySelector('[data-scene-note]');if(caption)caption.textContent=stageCaption();
    if(!changed&&currentView!=='list'){const oldFooter=host.querySelector('.stage-footer');if(oldFooter)oldFooter.outerHTML=footer(next.records.length);}
    const picker=host.querySelector('#scene-memory-select');if(picker){picker.innerHTML=visibleNodes.map(n=>`<option value="${escapeHtml(n.id)}" ${n.id===data.selectedId?'selected':''}>${escapeHtml(n.title)}</option>`).join('');}
    inspector();refreshPlacementControls();
  }
  function click(event) {
    const nudge=event.target.closest('[data-nudge]')?.dataset.nudge;
    if(nudge){const p=arrangement.positions.get(data.selectedId);if(p){const offsets={north:[0,-.5],south:[0,.5],east:[.5,0],west:[-.5,0]},[x,z]=offsets[nudge];moveObject(data.selectedId,{x:Math.max(-100,Math.min(100,p.x+x)),y:0,z:Math.max(-100,Math.min(100,p.z+z))});}return;}

    const selected=event.target.closest('[data-memory-select]');if(selected){onSelect(selected.dataset.memorySelect);return;}
    const layout=event.target.closest('[data-memory-layout]');if(layout){onLayout(layout.dataset.memoryLayout);return;}
    const action=event.target.closest('[data-explorer-action]')?.dataset.explorerAction;if(!action)return;
    if(action==='undo-move'){if(history.length){spatial=history.pop();persistSpatial();update(data);onNotice('Arrangement change undone.');}return;}
    if(action==='reset-layout'){saveSpatial(resetSpatialLayout(spatial,data.layout));update(data);renderer?.fit();onNotice('Automatic arrangement restored. Undo is available.');return;}
    if(action==='cards'){onView('cards');return;}
    if(action==='previous'||action==='next'){page+=action==='next'?1:-1;page=Math.max(0,Math.min(page,Math.ceil(data.records.length/PAGE_SIZE)-1));onSelect(data.records[page*PAGE_SIZE].id);return;}
    if(currentView==='objects'||graphViews.includes(currentView)) {if(action==='fit')renderer?.fit();if(action==='focus')renderer?.focus(data.selectedId);if(action==='zoom-in')renderer?.zoom(1);if(action==='zoom-out')renderer?.zoom(-1);}
    if(currentView==='cards') {
      if(action==='fit'){fitCards();return;}
      if(action==='focus'){host.querySelector('.preview-card.selected')?.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});return;}
      if(action==='zoom-in'||action==='zoom-out'){board.fit=false;cardZoom=Math.max(.03,Math.min(2,cardZoom*(action==='zoom-in'?1.2:1/1.2)));applyCardZoom();}
    }
  }
  function choose(event){
    if(event.target.id==='scene-memory-select')onSelect(event.target.value);
    if(event.target.id==='object-form'&&data.rawIds.has(data.selectedId)){
      saveSpatial(setSpatialObjectType(spatial,data.selectedId,event.target.value||null));update(data);
      host.querySelector('#object-form')?.focus({preventScroll:true});
    }
  }
  host.addEventListener('click',click);host.addEventListener('change',choose);
  return {update,fit(){if(currentView==='objects'||graphViews.includes(currentView))renderer?.fit();else if(currentView==='cards')fitCards();},destroy(){destroyed=true;generation++;renderer?.destroy();renderer=null;themeObserver.disconnect();resizeObserver.disconnect();host.removeEventListener('click',click);host.removeEventListener('change',choose);}};
}
