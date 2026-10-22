(()=>{
"use strict";
const cfg=window.NEXO_BACKEND;if(!cfg||typeof lessons==="undefined")return;
const rootUrl=cfg.url.replace(/\/$/,"");
const api=rootUrl+"/rest/v1/nexo_editor_content";
const bucket="nexo-lesson-images";
const original=JSON.parse(JSON.stringify(lessons));
let units=[],dlg=null,dirty=false,expandedUnit=0,expandedBlock=-1;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const token=()=>window.NEXO_ADMIN_TOKEN?.();
const initial=()=>original.map(u=>({title:u.title,subtitle:u.subtitle,source:u.source,blocks:u.blocks.map(b=>({title:b[0],text:b[1],image:""})),question:u.check[0],answer:u.check[1]}));
function normalize(u){return {title:u.title||"Sem título",subtitle:u.subtitle||"",source:u.source||"Conteúdo editado no NEXO",blocks:(u.blocks||[]).map(b=>({title:b.title??b[0]??"",text:b.text??b[1]??"",image:b.image||""})),question:u.question||"",answer:u.answer||""}}
function apply(){
 lessons.splice(0,lessons.length,...units.map(u=>({title:u.title,subtitle:u.subtitle,source:u.source||"Conteúdo elaborado no NEXO",blocks:u.blocks.map(b=>[b.title,b.text]),check:[u.question||"Releia a unidade e explique o conceito central.",u.answer||"Retome a explicação acima."]})));
 window.nexoLessonImages=units.map(u=>u.blocks.map(b=>b.image||""));
 if(document.getElementById("reading-area")){window.lessonIndex=Math.max(0,Math.min(window.lessonIndex,lessons.length-1));renderLessons()}
}
async function load(){
 try{const r=await fetch(api+"?content_key=eq.psicanalise&select=payload",{headers:{apikey:cfg.anonKey}});if(!r.ok)throw Error("HTTP "+r.status);const rows=await r.json();const existing=rows[0]?.payload?.units;
 if(Array.isArray(existing)&&existing.length){if(existing.length<original.length){units=[...initial(),...existing.map(normalize)]}else{units=existing.map(normalize)}}else units=initial();apply()
 }catch(e){console.warn("NEXO: erro ao carregar conteúdo",e);units=initial();apply()}
}
function mark(){dirty=true;if(dlg)dlg.querySelector("#nexo-editor-status").textContent="Alterações ainda não publicadas"}
function close(){if(dirty&&!confirm("Descartar alterações não publicadas?"))return;dlg.close();dlg.remove();dlg=null}
function swap(arr,a,b){if(b<0||b>=arr.length)return;[arr[a],arr[b]]=[arr[b],arr[a]];mark();draw()}
function touchMove(handle,arr,index,selector){let active=false;handle.style.touchAction="none";handle.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse")return;active=true;handle.setPointerCapture(e.pointerId)});handle.addEventListener("pointermove",e=>{if(!active)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest(selector);if(!target)return;const dest=Number(selector==="[data-unit]"?target.dataset.unit:target.dataset.block);if(dest!==index&&Number.isInteger(dest)){active=false;swap(arr,index,dest)}});handle.addEventListener("pointerup",()=>active=false);handle.addEventListener("pointercancel",()=>active=false)}
function open(){
 if(!token()){alert("Ative o acesso administrativo para editar.");return}
 if(dlg){dlg.showModal();return}
 dlg=document.createElement("dialog");dlg.className="nexo-content-editor";
 dlg.innerHTML='<header><h2>Editar Psicanálise</h2><button type="button" data-close>Fechar</button></header><p>Edite as unidades existentes, reorganize assuntos e envie imagens. As mudanças só aparecem para todos depois de tocar em Publicar.</p><div id="nexo-editor-units"></div><button type="button" data-new>+ Criar unidade</button><button type="button" class="nexo-edit-save" data-save>Salvar e publicar tudo</button><p role="status" id="nexo-editor-status"></p>';
 document.body.append(dlg);dlg.querySelector("[data-close]").onclick=close;
 dlg.querySelector("[data-new]").onclick=()=>{units.push({title:"Nova unidade",subtitle:"",source:"Conteúdo criado no NEXO",blocks:[],question:"",answer:""});mark();draw()};
 dlg.querySelector("[data-save]").onclick=publish;draw();dlg.showModal()
}
function draw(){
 const box=dlg.querySelector("#nexo-editor-units");
 box.innerHTML=units.map((u,i)=>'<section class="nexo-edit-unit" data-unit="'+i+'"><div class="nexo-edit-head"><button type="button" class="nexo-drag-handle" data-uhandle>⠿</button><button type="button" data-toggle class="nexo-unit-toggle">Unidade '+(i+1)+' · '+esc(u.title)+'</button><div><button data-up>↑</button><button data-down>↓</button><button data-delete>Excluir</button></div></div><div class="nexo-edit-details" '+(expandedUnit===i?"":"hidden")+'><label>Título<input data-field="title" value="'+esc(u.title)+'"></label><label>Apresentação<textarea data-field="subtitle">'+esc(u.subtitle)+'</textarea></label><h4>Assuntos · arraste para reordenar</h4><div class="nexo-edit-blocks">'+u.blocks.map((b,j)=>'<div class="nexo-edit-block" data-block="'+j+'"><div class="nexo-edit-head"><button type="button" class="nexo-drag-handle" data-bhandle>⠿</button><button type="button" data-btoggle class="nexo-unit-toggle">Assunto '+(j+1)+' · '+esc(b.title)+'</button><div><button data-bup>↑</button><button data-bdown>↓</button><button data-bdelete>Excluir</button></div></div><div class="nexo-edit-details" '+(expandedBlock===j?"":"hidden")+'><label>Título<input data-bfield="title" value="'+esc(b.title)+'"></label><label>Explicação<textarea rows="5" data-bfield="text">'+esc(b.text)+'</textarea></label>'+(b.image?'<img src="'+esc(b.image)+'" alt="Ilustração do assunto" style="max-width:100%;max-height:220px;object-fit:contain;border-radius:10px"><button data-image-remove>Remover imagem</button>':'')+'<label>Adicionar imagem do celular<input type="file" accept="image/png,image/jpeg,image/webp" data-upload></label><p class="nexo-upload-status"></p></div></div>').join("")+'</div><button data-add>+ Novo assunto</button><h4>Verifique a compreensão</h4><label>Pergunta<input data-field="question" value="'+esc(u.question)+'"></label><label>Resposta comentada<textarea data-field="answer">'+esc(u.answer)+'</textarea></label></div></section>').join("");
 box.querySelectorAll("[data-unit]").forEach(el=>{
 const i=+el.dataset.unit;el.querySelector("[data-toggle]").onclick=()=>{expandedUnit=expandedUnit===i?-1:i;expandedBlock=-1;draw()};touchMove(el.querySelector("[data-uhandle]"),units,i,"[data-unit]");
 el.querySelectorAll("[data-field]").forEach(field=>field.oninput=()=>{units[i][field.dataset.field]=field.value;mark()});
 el.querySelector("[data-up]").onclick=()=>swap(units,i,i-1);
 el.querySelector("[data-down]").onclick=()=>swap(units,i,i+1);
 el.querySelector("[data-delete]").onclick=()=>{if(confirm("Excluir esta unidade do rascunho?")){units.splice(i,1);mark();draw()}};
 el.querySelector("[data-add]").onclick=()=>{units[i].blocks.push({title:"Novo assunto",text:"",image:""});mark();draw()};
 el.addEventListener("dragstart",e=>{if(e.target!==el)return;e.dataTransfer.setData("text/nexo-unit",String(i))});
 el.addEventListener("dragover",e=>{if(e.dataTransfer.types.includes("text/nexo-unit"))e.preventDefault()});
 el.addEventListener("drop",e=>{const a=e.dataTransfer.getData("text/nexo-unit");if(a!==""){e.preventDefault();swap(units,+a,i)}});
 el.querySelectorAll("[data-block]").forEach(block=>{
 const j=+block.dataset.block;block.querySelector("[data-btoggle]").onclick=()=>{expandedBlock=expandedBlock===j?-1:j;draw()};touchMove(block.querySelector("[data-bhandle]"),units[i].blocks,j,"[data-block]");
 block.querySelectorAll("[data-bfield]").forEach(field=>field.oninput=()=>{units[i].blocks[j][field.dataset.bfield]=field.value;mark()});
 block.querySelector("[data-bup]").onclick=()=>swap(units[i].blocks,j,j-1);
 block.querySelector("[data-bdown]").onclick=()=>swap(units[i].blocks,j,j+1);
 block.querySelector("[data-bdelete]").onclick=()=>{if(confirm("Excluir este assunto?")){units[i].blocks.splice(j,1);mark();draw()}};
 block.querySelector("[data-image-remove]")?.addEventListener("click",()=>{units[i].blocks[j].image="";mark();draw()});
 block.querySelector("[data-upload]").onchange=e=>upload(e.target.files?.[0],i,j,block.querySelector(".nexo-upload-status"));
 block.addEventListener("dragstart",e=>{e.stopPropagation();e.dataTransfer.setData("text/nexo-block",i+":"+j)});
 block.addEventListener("dragover",e=>{if(e.dataTransfer.types.includes("text/nexo-block"))e.preventDefault()});
 block.addEventListener("drop",e=>{e.stopPropagation();const [ui,bj]=(e.dataTransfer.getData("text/nexo-block")||"").split(":");if(+ui===i&&bj!==""){e.preventDefault();swap(units[i].blocks,+bj,j)}});
 })
 })
}
async function upload(file,i,j,status){
 if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){status.textContent="Use JPG, PNG ou WebP de até 5 MB.";return}
 const jwt=token();if(!jwt){status.textContent="Sessão administrativa indisponível.";return}
 status.textContent="Enviando imagem...";
 try{const extension={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type];const name="editor/"+crypto.randomUUID()+"."+extension;
 const r=await fetch(rootUrl+"/storage/v1/object/"+bucket+"/"+name,{method:"POST",headers:{"apikey":cfg.anonKey,"Authorization":"Bearer "+jwt,"Content-Type":file.type,"x-upsert":"false"},body:file});
 if(!r.ok)throw Error((await r.text()).slice(0,180));
 units[i].blocks[j].image=rootUrl+"/storage/v1/object/public/"+bucket+"/"+name;mark();draw();
 }catch(e){status.textContent="Falha no upload: "+e.message}
}
async function publish(){
 const status=dlg.querySelector("#nexo-editor-status"),jwt=token();if(!jwt){status.textContent="Faça login novamente.";return}
 const btn=dlg.querySelector("[data-save]");btn.disabled=true;status.textContent="Publicando...";
 try{const r=await fetch(api+"?on_conflict=content_key",{method:"POST",headers:{"apikey":cfg.anonKey,"Authorization":"Bearer "+jwt,"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({content_key:"psicanalise",payload:{units}})});
 if(!r.ok)throw Error((await r.text()).slice(0,250));dirty=false;status.textContent="Publicado! Conteúdo e imagens disponíveis para leitores.";apply()
 }catch(e){status.textContent="Erro ao publicar: "+e.message}finally{btn.disabled=false}
}
const button=document.createElement("button");button.className="nexo-edit-launch";button.type="button";button.textContent="✎ Editar esta disciplina";button.onclick=open;document.body.append(button);
const sync=()=>{button.hidden=!token()||!document.getElementById("reading-area")};
setInterval(sync,800);sync();load();
})();