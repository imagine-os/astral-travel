import {createDemoWorkspace,ingest,addClaim,verifyClaim,dream,review,search,createScenario,backlinks,scheduleResearch,getResearchQueue,completeResearch,exportWorkspace,importWorkspace,validateWorkspace,LIMITS} from './lib/core.mjs';

import {addExampleMemories} from './lib/examples.mjs';
import {EXAMPLE_PACKS,createExampleWorkspace} from './lib/example-packs.mjs';

import {createMemoryExplorer,readExplorerPreference,saveExplorerPreference} from './explorer.mjs';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=(v,n=38)=>String(v).length>n?String(v).slice(0,n-1)+'…':String(v);
const KEY='astral-travel.workspace.v0.1';
let workspaceKey=KEY,activeExample=null;
const workspaceSessions=new Map();
function freshSample(){const sample=createDemoWorkspace();addExampleMemories(sample);return sample;}
let ws, storageMessage='Stored locally', loadError='', storageBlocked=false;
try{const saved=localStorage.getItem(KEY);ws=saved?validateWorkspace(saved):freshSample();if(!saved)localStorage.setItem(KEY,exportWorkspace(ws));}catch(error){ws=freshSample();storageBlocked=true;storageMessage='Recovery mode · export to keep';loadError='Saved workspace could not be loaded. The sample is open in a temporary session. Your stored file remains untouched until you explicitly import or reset.';}
const appearance=readExplorerPreference();
let mode='memory',view=appearance.view,layout=appearance.layout,filter='all',query='',selected=ws.claims[0]?.id||ws.raw[0]?.id,toastTimer,explorer;
const content=$('#workspace-content');
const modes={memory:['Memory palace','Every idea has a place. Every insight has a source.'],dreams:['The dream room','Discover possible connections. Keep the useful ones.'],research:['The next question','A queue for knowledge that deserves another look.'],scenarios:['Lucid Lab','Explore possibilities in a space of their own.'],activity:['The trail behind you','A readable history of what changed.']};
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4200);}
function persist(){if(storageBlocked){$('#storage-status').textContent=storageMessage;return;}try{localStorage.setItem(workspaceKey,exportWorkspace(ws));storageMessage='Stored locally';}catch{storageMessage='Session only · export to keep';toast('Browser storage is full or unavailable. Export to keep your changes.');}$('#storage-status').textContent=storageMessage;}
function activateWorkspace(id,{initial=false}={}){
 if(id!==null&&!EXAMPLE_PACKS.some(pack=>pack.id===id))return;
 workspaceSessions.set(workspaceKey,{ws,storageMessage,storageBlocked,loadError});
 const nextKey=id?`${KEY}.example.${id}`:KEY;
 let session=workspaceSessions.get(nextKey);
 if(!session){
  session={ws:null,storageMessage:'Stored locally',storageBlocked:false,loadError:''};
  try{const saved=localStorage.getItem(nextKey);session.ws=saved?validateWorkspace(saved):createExampleWorkspace(id);}
  catch{session.ws=id?createExampleWorkspace(id):freshSample();session.storageBlocked=true;session.storageMessage='Recovery mode · export to keep';session.loadError='This saved workspace could not be loaded. A temporary sample is open; its stored file remains untouched until you explicitly reset.';}
 }
 ({ws,storageMessage,storageBlocked,loadError}=session);workspaceKey=nextKey;activeExample=id;
 mode='memory';query='';filter='all';selected=ws.raw[0]?.id||ws.claims[0]?.id;
 const url=new URL(location.href);if(id)url.searchParams.set('example',id);else url.searchParams.delete('example');
 history.replaceState(null,'',url);
 persist();if(!initial){render();$(id?`[data-example="${id}"]`:'[data-action="my-memories"]')?.focus({preventScroll:true});if(loadError)toast(loadError);else toast(id?'Example opened. Your own memories are saved separately.':'Your saved memories are open.');}
}
function exampleChooser(){
 const personal=activeExample?workspaceSessions.get(KEY)?.ws:ws;
 const count=personal?personal.raw.length+personal.claims.length:0;
 const pack=EXAMPLE_PACKS.find(item=>item.id===activeExample);
 return `<section class="example-library" aria-label="Example collections"><div class="example-library-intro"><strong>${pack?'Explore this example':'Explore a larger world'}</strong><span>${pack?'Changes here are saved separately from your memories.':`Your saved workspace has ${count} memories. Try a collection below.`}</span></div><div class="example-options"><button data-action="my-memories" aria-pressed="${!activeExample}" class="example-option personal-option"><span aria-hidden="true">⌂</span><span>My memories</span><b>${count}</b></button>${EXAMPLE_PACKS.map(item=>`<button data-action="open-example" data-example="${item.id}" aria-pressed="${activeExample===item.id}" class="example-option" title="${esc(item.description)}"><span aria-hidden="true">${item.icon}</span><span>${esc(item.title)}</span><b>${item.count}</b></button>`).join('')}</div></section>`;
}
function change(fn,message){const before=exportWorkspace(ws);try{const result=fn();exportWorkspace(ws);persist();render();if(message)toast(message);return result;}catch(error){ws=validateWorkspace(before);toast(error.message);return null;}}
function record(id){return ws.raw.find(r=>r.id===id)||ws.claims.find(r=>r.id===id)||ws.scenarios.find(r=>r.id===id);}
function kind(r){return ws.raw.some(item=>item.id===r.id)?'raw':ws.scenarios.some(item=>item.id===r.id)?'scenario':'claim';}
function navigate(next,scroll=false){mode=next;render();if(scroll)$('#lab').scrollIntoView({behavior:'smooth'});}
function render(){
 if(mode!=='memory'){explorer?.destroy();explorer=null;}
 const pack=EXAMPLE_PACKS.find(item=>item.id===activeExample);
 $('#view-title').textContent=mode==='memory'&&pack?pack.title:modes[mode][0];$('#view-subtitle').textContent=pack?'Example workspace · fictional starting data · saved separately':modes[mode][1];
 const importButton=$('[data-action="import"]');importButton.disabled=Boolean(activeExample);importButton.title=activeExample?'Open My memories to import a workspace.':'Import a workspace file';$('#view-toggle').hidden=mode!=='memory';
 $('#mode-nav').querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});
 $('#memory-count').textContent=ws.raw.length+ws.claims.length;$('#dream-count').textContent=ws.dreams.filter(d=>d.status==='proposed').length;
 $('#storage-status').textContent=storageMessage;
 if(mode==='memory')renderMemory();if(mode==='dreams')renderDreams();if(mode==='research')renderResearch();if(mode==='scenarios')renderScenarios();if(mode==='activity')renderActivity();
}
function memoryRecords(){const types=filter==='all'?['raw','claim']:[filter];return query.trim()?search(ws,query,{types,limit:1000}).map(r=>r.record):[...(types.includes('raw')?ws.raw:[]),...(types.includes('claim')?ws.claims:[])];}
function renderMemory(){
 explorer?.destroy();explorer=null;
 const records=memoryRecords();if(!records.some(r=>r.id===selected))selected=records[0]?.id;
 content.innerHTML=`${exampleChooser()}<div class="search-row"><button ${activeExample?'hidden':''} class="examples-button" data-action="add-examples" title="Add fictional examples without replacing your memories">＋ Add examples</button><label class="search-field"><span aria-hidden="true">⌕</span><input id="memory-search" aria-label="Search memories" placeholder="Search ideas, sources, and connections…" value="${esc(query)}" maxlength="10000"></label><select id="memory-filter" class="filter-select" aria-label="Memory layer"><option value="all" ${filter==='all'?'selected':''}>All memory</option><option value="raw" ${filter==='raw'?'selected':''}>Raw sources</option><option value="claim" ${filter==='claim'?'selected':''}>Processed</option></select></div><div class="memory-result-line"><span id="memory-result-summary" role="status" aria-live="polite"></span><button data-action="clear-filters" id="clear-memory-filters" hidden>Clear filters ×</button></div><div id="memory-results"></div>`;
 explorer=createMemoryExplorer($('#memory-results'),{workspaceKey,onSelect:selectMemory,onLayout:next=>{layout=next;saveExplorerPreference(view,layout);renderMemoryResults();},onView:setMemoryView,detailsHtml:details,onNotice:toast});
 renderMemoryResults(records);
}
function setMemoryView(next){
 if(!['objects','skilltree','radialtree','cards','list'].includes(next))return;
 view=next;saveExplorerPreference(view,layout);renderMemoryResults();
}
function selectMemory(id){
 if(!record(id))return;
 selected=id;
 if(mode!=='memory'){mode='memory';query='';filter='all';render();return;}
 if(!memoryRecords().some(r=>r.id===id)){query='';filter='all';renderMemory();return;}
 renderMemoryResults();
}
function renderMemoryResults(records=memoryRecords()){
 const total=ws.raw.length+ws.claims.length;
 $('#memory-result-summary').textContent=query.trim()||filter!=='all'?`${records.length} matching of ${total} memories`:`${total} memories · ${activeExample?'example collection':'your saved workspace'}`;
 $('#clear-memory-filters').hidden=!query.trim()&&filter==='all';
 if(!records.some(r=>r.id===selected))selected=records[0]?.id;
 $('#view-toggle').querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-pressed',String(b.dataset.view===view));});
 explorer?.update({records,allRecords:[...ws.raw,...ws.claims],links:ws.links,rawIds:new Set(ws.raw.map(r=>r.id)),selectedId:selected,view,layout});
}
function details(r){
 if(!r)return '<p class="empty-detail">Select a memory to inspect its sources.</p>';
 const type=kind(r);
 const rawIds=r.rawIds||[];
 return `<span class="detail-kicker">${type==='raw'?'RAW / ORIGINAL SOURCE':`PROCESSED / ${esc(r.status).toUpperCase()}`}</span><h4>${esc(r.title)}</h4><p class="detail-text">${esc(r.text)}</p><div class="tag-list">${(r.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>${r.sourceUrl?`<a class="source-link" href="${esc(r.sourceUrl)}" target="_blank" rel="noreferrer">Open original source ↗</a>`:''}<div class="detail-divider"></div><small>${type==='raw'?'BACKLINKS & INTERPRETATIONS':'BASED ON ORIGINAL SOURCES'}</small>${type==='raw'?rawBacklinks(r.id):rawIds.map(id=>`<button class="source-link" data-record="${esc(id)}">◈ ${esc(record(id)?.title||id)} ↗</button>`).join('')}${type==='raw'?`<button class="source-link" data-action="derive" data-id="${esc(r.id)}">＋ Add an interpretation</button>`:r.status!=='verified'?`<button class="source-link" data-action="verify" data-id="${esc(r.id)}">Review this claim ↗</button>`:`<p class="empty-detail">Reviewed by ${esc(r.review?.reviewer||'a person')}. A recorded review is not independent proof.</p>`}<div class="detail-id">${esc(r.contentHash||r.id)}</div>`;
}
function rawBacklinks(id){const claims=ws.claims.filter(c=>c.rawIds.includes(id));const links=ws.links.filter(l=>l.fromId===id||l.toId===id).map(l=>record(l.fromId===id?l.toId:l.fromId)).filter(Boolean);const related=[...new Map([...claims,...links].map(r=>[r.id,r])).values()];return related.length?related.map(r=>`<button class="source-link" data-record="${esc(r.id)}">✧ ${esc(r.title)} ↗</button>`).join(''):'<p class="empty-detail">No connections yet. Try a dream cycle to find a possible link.</p>';}
function renderDreams(){content.innerHTML=`<div class="pane"><div class="pane-intro"><p>Look across your original notes for shared ideas. Every suggestion stays a proposal until you review it.</p><button class="button small primary" data-action="dream">✧ Run a dream cycle</button></div><div class="pane-banner">LOCAL HEURISTICS · Shared tags and keywords suggest a connection. They don’t establish a fact.</div><div class="item-grid">${ws.dreams.length?ws.dreams.slice().sort((a,b)=>(b.status==='proposed')-(a.status==='proposed')||(b.signals?.heuristicScore||0)-(a.signals?.heuristicScore||0)).map(d=>`<article class="insight-card"><small class="${esc(d.status)}">${esc(d.status.toUpperCase())} / CONNECTION</small><h4>${esc(d.title)}</h4><p>${esc(d.text)}</p><div class="tag-list">${(d.signals?.sharedTags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>${d.rawIds.map(id=>`<button class="source-link" data-record="${esc(id)}">◈ ${esc(record(id)?.title)} ↗</button>`).join('')}${d.status==='proposed'?`<div class="card-actions"><button data-action="accept-dream" data-id="${esc(d.id)}">Keep connection</button><button class="reject" data-action="reject-dream" data-id="${esc(d.id)}">Dismiss</button></div>`:`<p>${d.status==='accepted'?'Saved as an inferred connection, with sources.':'Dismissed. The original memories remain intact.'}</p>`}</article>`).join(''):'<div class="empty-state"><span>✧</span><h4>Let your ideas meet.</h4><p>Run your first dream cycle. We’ll look for overlap between the memories in your workspace.</p></div>'}</div></div>`;}
function renderResearch(){const tasks=getResearchQueue(ws,{includeCompleted:true});content.innerHTML=`<div class="pane"><div class="pane-intro"><p>Keep a visible list of what needs checking, when it is due, and what you found.</p><button class="button small primary" data-action="add-research">＋ Add question</button></div><div class="pane-banner">A RESEARCH QUEUE · This alpha does not browse the web or run background jobs.</div>${tasks.length?tasks.map(t=>`<article class="research-row"><div><h4>${esc(t.title)}</h4><p>${esc(t.query)}</p><small>${t.status==='completed'?'COMPLETED':t.isDue?'DUE FOR REVIEW':'UPCOMING'} · ${new Date(t.dueAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</small>${t.note?`<p>${esc(t.note)}</p>`:''}</div>${t.status!=='completed'?`<button class="button small ghost" data-action="complete-research" data-id="${esc(t.id)}">Record review ↗</button>`:''}</article>`).join(''):'<div class="empty-state"><span>◎</span><h4>A good question is a beginning.</h4><p>Add something you want to verify, revisit, or understand.</p></div>'}</div>`;}
function renderScenarios(){content.innerHTML=`<div class="pane"><div class="pane-banner">SIMULATION SPACE · Templates for thinking, not predictions. Nothing here becomes evidence.</div><form id="scenario-form" class="scenario-form"><label class="form-label" for="scenario-prompt">What if…?</label><textarea class="form-input" id="scenario-prompt" name="prompt" required maxlength="10000" placeholder="What if our design studio offered a 48-hour approval service?"></textarea><div class="scenario-options"><div class="scenario-choice"><label><input type="radio" name="mode" value="grounded" checked> Grounded</label><label><input type="radio" name="mode" value="speculative"> Speculative / fantastical</label></div><button class="button small primary" type="submit">Create a scenario ↗</button></div></form><div class="scenario-list">${ws.scenarios.slice().reverse().map(s=>`<article class="scenario-card"><small>${esc(s.mode.toUpperCase())} / TEMPLATE · NOT A PREDICTION</small><h4>${esc(s.prompt)}</h4><p>${esc(s.output)}</p>${(s.contextRawIds||[]).length?`<div class="detail-divider"></div><small>CONTEXT USED</small>${s.contextRawIds.map(id=>`<button class="source-link" data-record="${esc(id)}">◈ ${esc(record(id)?.title)} ↗</button>`).join('')}`:''}</article>`).join('')}</div></div>`;}
function renderActivity(){content.innerHTML=`<div class="pane"><div class="pane-intro"><p>Captures, reviews, dreams, and scenarios. This local log makes the memory’s changes visible.</p></div>${ws.events.slice().reverse().slice(0,80).map(e=>`<div class="activity-item"><span>◷</span><div>${esc(e.action.replaceAll('.',' / '))}<small>${esc(record(e.entityId)?.title||e.detail||short(e.entityId,35))} · ${new Date(e.createdAt).toLocaleString()}</small></div></div>`).join('')||'<div class="empty-state"><p>Your first capture starts the story.</p></div>'}</div>`;}
function openModal(title,body){$('#modal-title').textContent=title;$('#modal-content').innerHTML=body;$('#modal').showModal();}
function closeModal(){$('#modal').close();}
function addModal(){openModal('Give a thought a place.',`<form id="add-form"><p class="modal-copy">Your original text is preserved. Tags help the dream engine find connections.</p><label class="form-label" for="add-title">Title</label><input class="form-input" id="add-title" name="title" required maxlength="300" placeholder="An idea worth keeping"><label class="form-label" for="add-text">Original text</label><textarea class="form-input" id="add-text" name="text" rows="5" required maxlength="250000" placeholder="A note, a conversation, something you noticed…"></textarea><label class="form-label" for="add-tags">Tags, separated by commas</label><input class="form-input" id="add-tags" name="tags" maxlength="1000" placeholder="design, customers, ideas"><label class="form-label" for="add-url">Source URL (optional)</label><input type="url" class="form-input" id="add-url" name="sourceUrl" placeholder="https://"><div class="form-error" role="alert"></div><div class="modal-actions"><button class="button ghost" type="button" data-action="close-modal">Cancel</button><button class="button primary" type="submit">Save memory ↗</button></div></form>`);}
function confirmImport(parsed,originKey){if(activeExample||workspaceKey!==originKey){toast('Import paused: return to My memories and choose the file again.');return;}let incoming;try{incoming=importWorkspace(parsed);exportWorkspace(incoming);}catch(error){toast(`Import rejected: ${error.message}`);return;}openModal('Open this workspace?',`<div class="modal-copy"><p>This file contains <strong>${incoming.raw.length} sources, ${incoming.claims.length} interpretations, and ${incoming.scenarios.length} scenarios.</strong></p><p>It will replace the workspace in this browser. Export your current workspace first if you want to keep it. Imported claims require a fresh review.</p></div><div class="modal-actions"><button class="button ghost" data-action="export">Export current</button><button class="button primary" id="confirm-import">Open imported workspace</button></div>`);$('#confirm-import').addEventListener('click',()=>{if(activeExample||workspaceKey!==originKey){closeModal();toast('Workspace changed. Choose the import file again in My memories.');return;}ws=incoming;storageBlocked=false;loadError='';selected=null;query='';filter='all';mode='memory';persist();render();closeModal();toast('Workspace imported. Verification states reset for review.');},{once:true});}
function exportFile(){const blob=new Blob([exportWorkspace(ws)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`astral-workspace-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Workspace exported. Keep this file as your backup.');}
const actions={
 'open-example':el=>activateWorkspace(el.dataset.example),
 'my-memories':()=>activateWorkspace(null),
 'clear-filters':()=>{query='';filter='all';renderMemory();$('#memory-search').focus();},
 'add-examples':()=>{query='';filter='all';mode='memory';const result=change(()=>addExampleMemories(ws),null);if(result)toast(result.added?`${result.added} example records added. Your existing memories are preserved.`:'These examples are already in your workspace.');},
 'add':addModal,'close-modal':closeModal,'export':exportFile,'import':()=>{if(!activeExample)$('#import-file').click();},
 'dream':()=>{const result=change(()=>dream(ws,{limit:6}),null);if(result===null)return;const n=result.length;toast(n?`${n} connection${n===1?'':'s'} proposed. Explore the sources before keeping them.`:'No new overlaps found. Add memories with related tags or ideas.');},
 'accept-dream':el=>change(()=>review(ws,el.dataset.id,'accept'),'Connection kept as an inference—not a verified fact.'),
 'reject-dream':el=>change(()=>review(ws,el.dataset.id,'reject'),'Suggestion dismissed. Sources preserved.'),
 'reset':()=>{openModal('Start the sample again?',`<div class="modal-copy"><p>${activeExample?'This restarts only the open example collection. Your own memories remain saved separately. Export first to keep changes made to this example.':'This replaces your saved memories with the fictional studio sample. Export first to keep your own memories.'}</p></div><div class="modal-actions"><button class="button ghost" data-action="export">Export current</button><button class="button primary" data-action="confirm-reset">Reset sample</button></div>`);},
 'confirm-reset':()=>{ws=activeExample?createExampleWorkspace(activeExample):freshSample();storageBlocked=false;loadError='';query='';filter='all';selected=ws.claims[0]?.id;mode='memory';persist();render();closeModal();toast('Fresh sample workspace is ready.');},
 'derive':el=>openModal('Add an interpretation',`<form id="derive-form" data-id="${esc(el.dataset.id)}"><p class="modal-copy">An interpretation references this source and starts as a proposal.</p><label class="form-label" for="claim-title">Title</label><input class="form-input" id="claim-title" name="title" required maxlength="300"><label class="form-label" for="claim-text">What do you take from it?</label><textarea class="form-input" id="claim-text" name="text" rows="4" required maxlength="250000"></textarea><div class="form-error" role="alert"></div><div class="modal-actions"><button class="button primary" type="submit">Save interpretation</button></div></form>`),
 'verify':el=>openModal('Review this claim',`<form id="verify-form" data-id="${esc(el.dataset.id)}"><p class="modal-copy">Read the original sources first. This records your review; it does not establish independent truth.</p><label class="form-label" for="reviewer">Your name</label><input class="form-input" id="reviewer" name="reviewer" required maxlength="200"><label class="form-label" for="review-note">Review note</label><textarea class="form-input" id="review-note" name="note" rows="3" maxlength="10000"></textarea><div class="form-error" role="alert"></div><div class="modal-actions"><button class="button primary" type="submit">Record my review</button></div></form>`),
 'add-research':()=>openModal('A question worth following',`<form id="research-form"><label class="form-label" for="research-title">Question title</label><input class="form-input" id="research-title" name="title" required maxlength="300"><label class="form-label" for="research-query">What will you check?</label><textarea class="form-input" id="research-query" name="query" rows="3" required maxlength="10000" placeholder="Look for evidence, including anything that might change your mind."></textarea><label class="form-label" for="research-date">Review date</label><input type="date" class="form-input" id="research-date" name="date" value="${new Date().toLocaleDateString('en-CA')}"><div class="form-error" role="alert"></div><div class="modal-actions"><button class="button primary" type="submit">Add to queue</button></div></form>`),
 'complete-research':el=>openModal('Record the review',`<form id="complete-form" data-id="${esc(el.dataset.id)}"><p class="modal-copy">What did you check? Add any original evidence separately as a memory.</p><label class="form-label" for="complete-note">Review note</label><textarea class="form-input" id="complete-note" name="note" required rows="4" maxlength="10000"></textarea><div class="form-error" role="alert"></div><div class="modal-actions"><button class="button primary" type="submit">Mark reviewed</button></div></form>`),
 'versions':()=>openModal('Version history',`<div class="release"><span>SEPTEMBER 26, 2026 · BIGGER WORLDS TO EXPLORE</span><h3>v0.6.0 — Choose your collection</h3><p>Open the 48-node Creative studio, 96-node Research observatory, or 144-node Lucid world atlas. The example switcher keeps each collection separate from My memories, with direct links, clear result counts, and room for 160 nodes on one graph page.</p></div><div class="release"><span>SEPTEMBER 26, 2026 · ROOM FOR MORE</span><h3>v0.5.1 — A lighter object collection</h3><p>Lightweight sphere and cylinder geometry keeps the larger collection responsive in the compatibility 3D renderer. The new forms, saved placements, and separate graph styles stay available.</p></div><div class="release"><span>SEPTEMBER 26, 2026 · MORE THAN A DIFFERENT ARRANGEMENT</span><h3>v0.5.0 — A world of objects</h3><p>Folders, characters, networks, databases, services, clouds, and portals bring the collection to 17 distinct forms and 48 fictional example memories. Objects 3D, branching Skill Tree, and Radial Tree are now separate graph styles inspired by Graph Gallery. Move objects, follow connections, or explore source previews—all in light and dark.</p></div><div class="release"><span>SEPTEMBER 25, 2026 · MAKE IT YOUR SPACE</span><h3>v0.4.0 — Objects with character</h3><p>Books, photo frames, video slates, audio cassettes, code terminals, conversations, research notebooks, and experiment boards join your original pages and interpretation tablets. Add richer examples, drag objects into place, choose a form, undo a move, or reset an arrangement. Positions are saved locally, separately from your source records.</p></div><div class="release"><span>SEPTEMBER 25, 2026 · CLOSER TO YOUR IDEAS</span><h3>v0.3.2 — Room to explore</h3><p>Closer camera framing makes saved previews easier to recognize. The expanded desktop workspace keeps its controls and inspector in view, and keyboard focus follows rearranged objects.</p></div><div class="release"><span>SEPTEMBER 25, 2026 · MORE WAYS IN</span><h3>v0.3.1 — Keep exploring</h3><p>An automatic compatibility 3D view keeps the objects available when WebGL is disabled. Full view fills your browser window, with keyboard focus handling and Escape to return.</p></div><div class="release"><span>SEPTEMBER 25, 2026 · RECOGNIZABLE MEMORIES</span><h3>v0.3.0 — Give ideas a shape</h3><p>Real 3D document objects with previews of your saved text. Switch between Objects 3D, Cards, and List, and arrange the same records into Rooms, Lanes, Radial, or Grid. Orbit, zoom, fit, inspect source trails, and keep your preferred view. Light and dark throughout.</p></div><div class="release"><span>SEPTEMBER 25, 2026 · A VISUAL STORY</span><h3>v0.2.0 — In the light</h3><p>Light by default, with a complete dark theme and a saved appearance switch. Six original illustrations tell the story from capture to improvement. The website and repository now share the same visual guide, with clear labels for what works today and what comes next.</p></div><div class="release"><span>SEPTEMBER 25, 2026 · LAUNCH REFINEMENT</span><h3>v0.1.1 — A clearer first dream</h3><p>Dream proposals now show the strongest matches first. Added real product screenshots and the release verification record.</p><a href="https://github.com/imagine-os/astral-travel/blob/main/CHANGELOG.md" target="_blank" rel="noreferrer">View release notes ↗</a></div><div class="release" style="margin-top:14px"><span>SEPTEMBER 25, 2026 · FOUNDATION RELEASE</span><h3>v0.1.0 — First light</h3><p>The first working Astral Travel release.</p><ul><li>Local memory engine and CLI</li><li>Source records, interpretations, and backlinks</li><li>Reviewable connection suggestions</li><li>Research queue and isolated scenario templates</li><li>Browser playground, import, and export</li><li>MCP tools for local AI clients</li><li>Open research, architecture, and roadmap</li></ul><a href="https://github.com/imagine-os/astral-travel/blob/main/CHANGELOG.md" target="_blank" rel="noreferrer">Read the full changelog ↗</a><a href="https://github.com/imagine-os/astral-travel/commits/main/" target="_blank" rel="noreferrer">Browse every saved change ↗</a></div>`),
 'expand-workspace':()=>toggleExpandedWorkspace(),
 'help':()=>openModal('Your first minute in Astral',`<div class="modal-copy"><ol><li><strong>Explore Memory.</strong> Choose a 48, 96, or 144-node example above the search field. My memories returns to your saved workspace. Explore Objects 3D, Skill tree, Radial tree, Cards, or List; each shows the same records. Select an object to inspect its original text and source trail; Fit restores an overview.</li><li><strong>Add a thought.</strong> Try a note about design or customer feedback. Give it a related tag.</li><li><strong>Run a dream cycle.</strong> Open Dreams. Check the sources, then keep or dismiss a suggested connection.</li><li><strong>Imagine a possibility.</strong> Open Lucid Lab. Write a “what if” and choose grounded or speculative.</li><li><strong>Take it with you.</strong> Export your workspace. Or clone the repo and use the CLI or MCP server.</li></ol><p>Everything in this playground stays in this browser. Clearing site data removes the local copy. There are no model calls or web research jobs in this alpha.</p></div>`),
 'copy-install':async()=>{const command='git clone https://github.com/imagine-os/astral-travel.git\ncd astral-travel\nnode bin/astral.mjs init --demo\nnode bin/astral.mjs dream\nnpm start';try{await navigator.clipboard.writeText(command);toast('Quick-start commands copied.');}catch{openModal('Quick-start commands',`<textarea class="form-input" rows="7" readonly>${esc(command)}</textarea>`);}}
};
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');if(button){const action=actions[button.dataset.action];if(action)action(button);return;}
 const modeButton=event.target.closest('[data-mode]');if(modeButton){navigate(modeButton.dataset.mode,!modeButton.closest('#mode-nav'));return;}
 const viewButton=event.target.closest('[data-view]');if(viewButton){setMemoryView(viewButton.dataset.view);return;}
 const recordButton=event.target.closest('[data-record]');if(recordButton){selectMemory(recordButton.dataset.record);return;}
 const personaButton=event.target.closest('[data-persona]');if(personaButton)renderPersona(personaButton.dataset.persona);
});
document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('#modal').open){event.preventDefault();navigate('memory',true);$('#memory-search').focus();}});
content.addEventListener('input',event=>{if(event.target.id==='memory-search'){query=event.target.value;renderMemoryResults();}});
content.addEventListener('change',event=>{if(event.target.id==='memory-filter'){filter=event.target.value;renderMemoryResults();}});
document.addEventListener('submit',event=>{
 const form=event.target;if(!['add-form','derive-form','verify-form','research-form','complete-form','scenario-form'].includes(form.id))return;event.preventDefault();const data=Object.fromEntries(new FormData(form));const before=exportWorkspace(ws);
 try{
  if(form.id==='add-form'){const raw=ingest(ws,{...data,tags:data.tags.split(',').map(t=>t.trim()).filter(Boolean)});selected=raw.id;mode='memory';query='';filter='all';toast('Original memory preserved.');}
  if(form.id==='derive-form'){const claim=addClaim(ws,{...data,rawIds:[form.dataset.id]});selected=claim.id;toast('Interpretation saved with its original source.');}
  if(form.id==='verify-form'){verifyClaim(ws,form.dataset.id,data);toast('Your review is recorded.');}
  if(form.id==='research-form'){scheduleResearch(ws,{title:data.title,query:data.query,dueAt:data.date?new Date(`${data.date}T12:00:00`).toISOString():new Date().toISOString()});toast('Question added to the research queue.');}
  if(form.id==='complete-form'){completeResearch(ws,form.dataset.id,{note:data.note});toast('Research review recorded.');}
  if(form.id==='scenario-form'){createScenario(ws,{prompt:data.prompt,mode:data.mode});toast('Scenario created in its own space.');}
  exportWorkspace(ws);persist();render();if($('#modal').open)closeModal();
 }catch(error){ws=validateWorkspace(before);const errorEl=form.querySelector('.form-error');if(errorEl)errorEl.textContent=error.message;else toast(error.message);}
});
$('#import-file').addEventListener('change',async event=>{const originKey=workspaceKey,file=event.target.files[0];event.target.value='';if(!file||activeExample)return;if(file.size>LIMITS.importBytes){toast('This alpha accepts workspace files up to 20 MiB.');return;}try{confirmImport(await file.text(),originKey);}catch(error){toast(error.message);}});
$('#modal').addEventListener('click',event=>{if(event.target===$('#modal')){const rect=$('#modal').getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeModal();}});
const personas={
 builders:{label:'FOR DEVELOPERS',title:'Small core. Big possibilities.',body:'A readable JavaScript engine, a file-backed CLI, and local MCP tools. Inspect every source and decision. Bring the model you want when the adapter layer arrives.',link:'Explore the engine',url:'https://github.com/imagine-os/astral-travel/blob/main/docs/engine.md'},
 vibecoders:{label:'FOR VIBECODERS',title:'Give your next build a memory.',body:'Keep project decisions, customer feedback, and your best ideas together. Start in the playground, then use the local MCP server with your coding agent.',link:'Connect your tools',url:'https://github.com/imagine-os/astral-travel/blob/main/docs/mcp.md'},
 owners:{label:'FOR BUSINESS OWNERS',title:'Connect what your business knows.',body:'Bring meeting notes and customer observations into one visible workspace. Trace an insight to its source, queue the next question, and rehearse a business idea.',link:'Try the studio example',url:'#lab'},
 curious:{label:'FOR CURIOUS MINDS',title:'A little structure. A lot of possibility.',body:'Collect an observation. Follow a connection. Ask a stranger question. Your imagination gets its own room, and your original knowledge stays intact.',link:'Enter Lucid Lab',url:'#lab'}
};
function renderPersona(key){const p=personas[key];document.querySelectorAll('[data-persona]').forEach(b=>{b.classList.toggle('active',b.dataset.persona===key);b.setAttribute('aria-selected',String(b.dataset.persona===key));});$('#persona-panel').innerHTML=`<small>${p.label}</small><h3>${p.title}</h3><p>${p.body}</p><a class="inline-link" ${key==='curious'?'data-mode="scenarios"':''} href="${p.url}" ${p.url.startsWith('https')?'target="_blank" rel="noreferrer"':''}>${p.link} ↗</a>`;}
const requestedExample=new URL(location.href).searchParams.get('example');
if(EXAMPLE_PACKS.some(pack=>pack.id===requestedExample))activateWorkspace(requestedExample,{initial:true});
render();renderPersona('builders');if(loadError)toast(loadError);


let expandedFocus=null;const inertBefore=new Map();
function toggleExpandedWorkspace(force){
 const space=$('#workspace'),open=typeof force==='boolean'?force:!space.classList.contains('workspace-expanded');
 const button=space.querySelector('[data-action="expand-workspace"]');
 if(open){
  expandedFocus=document.activeElement;
  for(let node=space;node?.parentElement&&node.parentElement!==document.documentElement;node=node.parentElement){
   for(const sibling of node.parentElement.children){if(sibling===node||['SCRIPT','STYLE','DIALOG'].includes(sibling.tagName)||sibling.id==='toast')continue;inertBefore.set(sibling,sibling.inert);sibling.inert=true;}
  }
  space.setAttribute('role','dialog');space.setAttribute('aria-modal','true');space.setAttribute('aria-label','Expanded memory workspace');
 }else{
  for(const [element,previous]of inertBefore)element.inert=previous;inertBefore.clear();space.removeAttribute('role');space.removeAttribute('aria-modal');space.removeAttribute('aria-label');
 }
 space.classList.toggle('workspace-expanded',open);document.body.classList.toggle('workspace-is-expanded',open);
 button.setAttribute('aria-label',open?'Exit full view':'Expand workspace');button.innerHTML=open?'↙ <span>Exit full view</span>':'⛶ <span>Full view</span>';
 if(open)button.focus({preventScroll:true});else expandedFocus?.focus({preventScroll:true});
 requestAnimationFrame(()=>explorer?.fit());
}
document.addEventListener('keydown',event=>{
 if(!$('#workspace').classList.contains('workspace-expanded')||$('#modal').open)return;
 if(event.key==='Escape'){event.preventDefault();toggleExpandedWorkspace(false);}
 if(event.key==='Tab'){
  const controls=[...$('#workspace').querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter(e=>!e.disabled&&e.getClientRects().length);
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }
});
