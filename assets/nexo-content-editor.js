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
const initial=()=>original.map(u=>({title:u.title,subtitle:u.subtitle,source:u.source,blocks:u.blocks.map(b=>({title:b[0],text:b[1],image:""})),question:u.check[0],answer:u.check[1],showVisual:true}));
function normalize(u){return {title:u.title||"Sem título",subtitle:u.subtitle||"",source:u.source||"Conteúdo editado no NEXO",blocks:(u.blocks||[]).map(b=>({title:b.title??b[0]??"",text:b.text??b[1]??"",image:b.image||"",fields:Array.isArray(b.fields)?b.fields:undefined})),question:u.question||"",answer:u.answer||"",hiddenFields:Array.isArray(u.hiddenFields)?u.hiddenFields:[],showVisual:u.showVisual!==false}}
function fields(b){if(Array.isArray(b.fields))return b.fields;return [{type:"title",value:b.title||""},{type:"text",value:b.text||""},...(b.image?[{type:"image",value:b.image}]:[])]}
function syncLegacy(b){const f=fields(b);b.fields=f;b.title=f.find(x=>x.type==="title")?.value||"";b.text=f.find(x=>x.type==="text")?.value||"";b.image=f.find(x=>x.type==="image")?.value||""}
window.nexoRenderFields=(unitIndex,blockIndex)=>{const b=units[unitIndex]?.blocks[blockIndex];if(!b)return "";return fields(b).map(x=>x.type==="image"?'<img class="nexo-lesson-uploaded-image" src="'+esc(x.value)+'" alt="Imagem do conteúdo" loading="lazy">':x.type==="title"?'<h3>'+esc(x.value)+'</h3>':'<p>'+esc(x.value).replace(/\r?\n/g,"<br>")+'</p>').join("")};
function moveField(arr,a,b){if(b<0||b>=arr.length)return;const [item]=arr.splice(a,1);arr.splice(b,0,item);mark();draw()}
function apply(){
 lessons.splice(0,lessons.length,...units.map(u=>({title:u.title,subtitle:u.subtitle,source:u.source||"Conteúdo elaborado no NEXO",blocks:u.blocks.map(b=>[b.title,b.text]),check:[u.question||"Releia a unidade e explique o conceito central.",u.answer||"Retome a explicação acima."]})));
 window.nexoLessonImages=units.map(u=>u.blocks.map(b=>b.fields?"":b.image||""));window.nexoShowLessonVisual=units.map(u=>u.showVisual!==false);
 if(document.getElementById("reading-area")){window.lessonIndex=Math.max(0,Math.min(window.lessonIndex,lessons.length-1));renderLessons()}
}
async function load(){
 try{const r=await fetch(api+"?content_key=eq.psicanalise&select=payload",{headers:{apikey:cfg.anonKey}});if(!r.ok)throw Error("HTTP "+r.status);const rows=await r.json();const existing=rows[0]?.payload?.units;
 if(Array.isArray(existing)&&existing.length){units=existing.map(normalize)}else units=initial();apply()
 }catch(e){console.warn("NEXO: erro ao carregar conteúdo",e);units=initial();apply()}
}
function mark(){dirty=true;if(dlg)dlg.querySelector("#nexo-editor-status").textContent="Alterações ainda não publicadas"}
function close(){if(dirty&&!confirm("Descartar alterações não publicadas?"))return;dlg.close();dlg.remove();dlg=null}
function swap(arr,a,b){if(b<0||b>=arr.length)return;[arr[a],arr[b]]=[arr[b],arr[a]];mark();draw()}
function dragSort(handle,items,index,selector){
 const card=handle.closest(selector);if(!card)return;
 let state=null;handle.style.touchAction="none";
 handle.setAttribute("aria-label","Segure e arraste para reorganizar");
 handle.addEventListener("pointerdown",e=>{
  if(e.button!==0)return;
  state={id:e.pointerId,from:index,to:index,lastY:e.clientY};
  handle.setPointerCapture(e.pointerId);card.classList.add("nexo-dragging");
  e.preventDefault();
 });
 handle.addEventListener("pointermove",e=>{
  if(!state||state.id!==e.pointerId)return;
  state.lastY=e.clientY;
  const parent=card.parentElement;
  const siblings=[...parent.children].filter(x=>x.matches(selector));
  const target=siblings.find(x=>x!==card&&e.clientY>=x.getBoundingClientRect().top&&e.clientY<=x.getBoundingClientRect().bottom);
  if(target){
   const rect=target.getBoundingClientRect();
   parent.insertBefore(card,e.clientY<rect.top+rect.height/2?target:target.nextSibling);
   state.to=[...parent.children].filter(x=>x.matches(selector)).indexOf(card);
  }
  const r=dlg.getBoundingClientRect();
  if(e.clientY>r.bottom-65)dlg.scrollTop+=16;
  else if(e.clientY<r.top+65)dlg.scrollTop-=16;
  e.preventDefault();
 });
 handle.addEventListener("pointerup",e=>{
  if(!state||state.id!==e.pointerId)return;
  const {from,to}=state;state=null;card.classList.remove("nexo-dragging");
  if(from!==to&&to>=0&&to<items.length){
   const [item]=items.splice(from,1);items.splice(to,0,item);mark();draw();
  }
 });
 handle.addEventListener("pointercancel",()=>{state=null;card.classList.remove("nexo-dragging");draw()});
}
function open(){
 if(!token()){alert("Ative o acesso administrativo para editar.");return}
 if(dlg){dlg.showModal();return}
 dlg=document.createElement("dialog");dlg.className="nexo-content-editor";
 dlg.innerHTML='<header><h2>Editar Psicanálise</h2><button type="button" data-close>Fechar</button></header><p>Edite as unidades existentes, reorganize assuntos e envie imagens. As mudanças só aparecem para todos depois de tocar em Publicar.</p><div id="nexo-editor-units"></div><button type="button" data-new>+ Criar unidade</button><button type="button" class="nexo-edit-save" data-save>✓ Publicar alterações</button><p role="status" id="nexo-editor-status"></p>';
 document.body.append(dlg);dlg.querySelector("[data-close]").onclick=close;
 dlg.querySelector("[data-new]").onclick=()=>{units.push({title:"Nova unidade",subtitle:"",source:"Conteúdo criado no NEXO",blocks:[],question:"",answer:"",hiddenFields:[]});mark();draw()};
 dlg.querySelector("[data-save]").onclick=publish;draw();dlg.showModal()
}
function draw(){
 const box=dlg.querySelector("#nexo-editor-units");
 box.innerHTML=units.map((u,i)=>'<section class="nexo-edit-unit" data-unit="'+i+'"><div class="nexo-edit-head"><button type="button" class="nexo-drag-handle" data-uhandle>⠿</button><button type="button" data-toggle class="nexo-unit-toggle">Unidade '+(i+1)+' · '+esc(u.title)+'</button><div><button data-delete>Excluir</button></div></div><div class="nexo-edit-details" '+(expandedUnit===i?"":"hidden")+'><label>Título<input data-field="title" value="'+esc(u.title)+'"></label><label>Apresentação<textarea data-field="subtitle">'+esc(u.subtitle)+'</textarea></label><label class="nexo-visual-toggle"><input type="checkbox" data-visual-toggle '+(u.showVisual!==false?'checked':'')+'> Exibir ilustração padrão</label><button type="button" data-remove-visual>Remover ilustração da unidade</button><button type="button" data-restore-visual>Adicionar ilustração padrão novamente</button><h4>Assuntos · arraste para reordenar</h4><div class="nexo-edit-blocks">'+u.blocks.map((b,j)=>'<div class="nexo-edit-block" data-block="'+j+'"><div class="nexo-edit-head"><button type="button" class="nexo-drag-handle" data-bhandle>⠿</button><button type="button" data-btoggle class="nexo-unit-toggle">Assunto '+(j+1)+' · '+esc(b.title)+'</button><div><button data-bdelete>Excluir</button></div></div><div class="nexo-edit-details" '+(expandedBlock===j?"":"hidden")+'><p class="nexo-field-hint">Segure ⠿ para mover cada campo. Adicione ou exclua títulos, textos e imagens.</p><div class="nexo-free-fields">'+fields(b).map((field,k)=>'<div class="nexo-free-field" data-field-index="'+k+'"><div class="nexo-edit-head"><button type="button" class="nexo-drag-handle" data-fhandle>⠿</button><strong>'+({title:"Título",text:"Texto",image:"Imagem"}[field.type]||"Campo")+'</strong><button type="button" data-fdelete>Excluir</button></div>'+(field.type==="image"?'<img src="'+esc(field.value)+'" alt="Imagem do campo" style="max-width:100%;max-height:220px;object-fit:contain"><label>Trocar imagem<input type="file" accept="image/png,image/jpeg,image/webp" data-fupload></label><p class="nexo-upload-status"></p>':field.type==="text"?'<textarea rows="5" data-fvalue>'+esc(field.value)+'</textarea>':'<input data-fvalue value="'+esc(field.value)+'">')+'</div>').join("")+'</div><div class="nexo-add-fields"><button type="button" data-ftitle>+ Título</button><button type="button" data-ftext>+ Texto</button><button type="button" data-fimage>+ Imagem</button></div></div></div>').join("")+'</div><button data-add>+ Novo assunto</button><h4>Verifique a compreensão</h4><label>Pergunta<input data-field="question" value="'+esc(u.question)+'"></label><label>Resposta comentada<textarea data-field="answer">'+esc(u.answer)+'</textarea></label></div></section>').join("");
 box.querySelectorAll("[data-unit]").forEach(el=>{
 const i=+el.dataset.unit;el.querySelector("[data-visual-toggle]").onchange=e=>{units[i].showVisual=e.target.checked;mark()};el.querySelector("[data-remove-visual]").onclick=()=>{if(!confirm("Remover a ilustração padrão desta unidade da publicação?"))return;units[i].showVisual=false;mark();draw()};el.querySelector("[data-restore-visual]").onclick=()=>{units[i].showVisual=true;mark();draw()};el.querySelector("[data-toggle]").onclick=()=>{expandedUnit=expandedUnit===i?-1:i;expandedBlock=-1;draw()};dragSort(el.querySelector("[data-uhandle]"),units,i,"[data-unit]");
 el.querySelectorAll("[data-field]").forEach(field=>{
 field.oninput=()=>{units[i][field.dataset.field]=field.value;if(field.dataset.field==="title")el.querySelector("[data-toggle]").textContent="Unidade "+(i+1)+" · "+field.value;mark()};
 const label=field.closest("label"),name=field.dataset.field;
 if(!label)return;
 if((units[i].hiddenFields||[]).includes(name)){label.hidden=true;return}
 const del=document.createElement("button");del.type="button";del.textContent="Excluir campo";del.className="nexo-remove-single";
 del.onclick=()=>{if(!confirm("Excluir este campo de escrita?"))return;units[i][name]="";units[i].hiddenFields=[...new Set([...(units[i].hiddenFields||[]),name])];mark();draw()};
 label.append(del);
 });
 const missing=(units[i].hiddenFields||[]).filter(name=>["title","subtitle","question","answer"].includes(name));
 if(missing.length){const add=document.createElement("div");add.className="nexo-add-fields";missing.forEach(name=>{
 const btn=document.createElement("button");btn.type="button";btn.textContent="+ "+({title:"Título",subtitle:"Apresentação",question:"Pergunta",answer:"Resposta comentada"}[name]);
 btn.onclick=()=>{units[i].hiddenFields=units[i].hiddenFields.filter(x=>x!==name);mark();draw()};add.append(btn)
 });el.querySelector(".nexo-edit-details")?.append(add)}

 
 
 el.querySelector("[data-delete]").onclick=()=>{if(confirm("Excluir esta unidade do rascunho?")){units.splice(i,1);mark();draw()}};
 el.querySelector("[data-add]").onclick=()=>{units[i].blocks.push({title:"Novo assunto",text:"",image:""});mark();draw()};
 el.addEventListener("dragstart",e=>{if(e.target!==el)return;e.dataTransfer.setData("text/nexo-unit",String(i))});
 el.addEventListener("dragover",e=>{if(e.dataTransfer.types.includes("text/nexo-unit"))e.preventDefault()});
 el.addEventListener("drop",e=>{const a=e.dataTransfer.getData("text/nexo-unit");if(a!==""){e.preventDefault();swap(units,+a,i)}});
 el.querySelectorAll("[data-block]").forEach(block=>{
 const j=+block.dataset.block;block.querySelector("[data-btoggle]").onclick=()=>{expandedBlock=expandedBlock===j?-1:j;draw()};dragSort(block.querySelector("[data-bhandle]"),units[i].blocks,j,"[data-block]");
 const obj=units[i].blocks[j];obj.fields=fields(obj);block.querySelectorAll("[data-field-index]").forEach(fel=>{const k=+fel.dataset.fieldIndex;fel.querySelector("[data-fvalue]")?.addEventListener("input",e=>{obj.fields[k].value=e.target.value;syncLegacy(obj);mark()});fel.querySelector("[data-fdelete]").onclick=()=>{if(!confirm("Excluir este campo?"))return;obj.fields.splice(k,1);syncLegacy(obj);mark();draw()};dragSort(fel.querySelector("[data-fhandle]"),obj.fields,k,"[data-field-index]");fel.querySelector("[data-fupload]")?.addEventListener("change",e=>uploadField(e.target.files?.[0],i,j,k,fel.querySelector(".nexo-upload-status")))});for(const type of ["title","text","image"]){block.querySelector("[data-f"+type+"]").onclick=()=>{obj.fields.push({type,value:""});syncLegacy(obj);mark();draw()}};
 
 
 block.querySelector("[data-bdelete]").onclick=()=>{if(confirm("Excluir este assunto?")){units[i].blocks.splice(j,1);mark();draw()}};
 
 
 block.addEventListener("dragstart",e=>{e.stopPropagation();e.dataTransfer.setData("text/nexo-block",i+":"+j)});
 block.addEventListener("dragover",e=>{if(e.dataTransfer.types.includes("text/nexo-block"))e.preventDefault()});
 block.addEventListener("drop",e=>{e.stopPropagation();const [ui,bj]=(e.dataTransfer.getData("text/nexo-block")||"").split(":");if(+ui===i&&bj!==""){e.preventDefault();swap(units[i].blocks,+bj,j)}});
 })
 })
}
async function uploadField(file,i,j,k,status){
 if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){status.textContent="Use JPG, PNG ou WebP de até 5 MB.";return}
 const jwt=token();if(!jwt){status.textContent="Sessão administrativa indisponível.";return}
 status.textContent="Enviando imagem...";
 try{const extension={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type];const name="editor/"+crypto.randomUUID()+"."+extension;
 const r=await fetch(rootUrl+"/storage/v1/object/"+bucket+"/"+name,{method:"POST",headers:{"apikey":cfg.anonKey,"Authorization":"Bearer "+jwt,"Content-Type":file.type,"x-upsert":"false"},body:file});
 if(!r.ok)throw Error((await r.text()).slice(0,180));
 units[i].blocks[j].fields[k].value=rootUrl+"/storage/v1/object/public/"+bucket+"/"+name;syncLegacy(units[i].blocks[j]);mark();draw();
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