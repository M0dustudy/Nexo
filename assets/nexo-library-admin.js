(()=>{
"use strict";
const cfg=window.NEXO_BACKEND;if(!cfg)return;
const base=cfg.url.replace(/\/$/,""),endpoint=base+"/rest/v1/nexo_library_items",storage=base+"/storage/v1/object/nexo-library/";
const token=()=>window.NEXO_ADMIN_TOKEN?.();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let items=[],busy=false,loaded=false,dragFrom=null,filter="all";
function headers(auth=false){return {apikey:cfg.anonKey,...(auth&&token()?{Authorization:"Bearer "+token()}:{})}}
async function req(url,options={}){const r=await fetch(url,options);if(!r.ok){let t=await r.text();throw Error(t.slice(0,260))}if(r.status===204)return null;return r.json().catch(()=>null)}
async function load(){try{items=await req(endpoint+"?select=*&order=position.asc,created_at.asc",{headers:headers()})||[];loaded=true;render()}catch(e){notice("Erro ao carregar biblioteca: "+e.message)}}
const isLibrary=()=>document.getElementById("detail-content")?.querySelector(".nexo-library-live");
function notice(msg){const p=document.getElementById("nexo-library-status");if(p)p.textContent=msg;else console.warn(msg)}
function render(){
 const root=document.getElementById("detail-content");if(!root||!isLibrary()&&!root.querySelector(".nexo-shelf"))return;
 const admin=!!token();
 const filtered=items.filter(x=>filter==="all"||filter==="books"&&x.kind==="Livro"||filter==="slides"&&x.kind==="Slides de aula");
 root.innerHTML='<article class="study-panel nexo-library-live"><div class="study-kicker">PSICOLOGIA · PSICANÁLISE</div><h2>Biblioteca</h2><p>Materiais organizados por tipo. Arquivos privados ficam disponíveis para a administração; o acesso dos estudantes depende de autorização de publicação.</p><div class="nexo-bookfilters"><button data-filter="all">Todos</button><button data-filter="books">Livros</button><button data-filter="slides">Slides</button></div>'+(admin?'<button data-add-book>+ Adicionar material</button><p class="nexo-library-tip">No computador, arraste pelo símbolo ⠿ usando o mouse. No celular, pressione a alça e mova o item.</p>':'')+'<p id="nexo-library-status" role="status"></p><div class="nexo-library-list">'+filtered.map(x=>'<section class="nexo-book nexo-library-row" data-id="'+esc(x.id)+'"><div class="nexo-bookhead">'+(admin?'<span class="nexo-library-handle" draggable="true" role="button" tabindex="0" aria-label="Arrastar material">⠿</span>':'')+'<span class="nexo-bookicon">'+(x.kind==="Livro"?"📖":"▤")+'</span><div class="nexo-bookbody"><strong>'+esc(x.title)+'</strong><small>'+esc(x.kind)+'</small><div class="nexo-bookstatus">'+(x.storage_path?'Arquivo: '+esc(x.filename||"anexado"):'Arquivo ainda não anexado')+'</div><div class="nexo-bookactions">'+(admin?'<button data-edit>Editar</button><label class="nexo-library-upload">Enviar / substituir<input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.epub" data-upload></label><button data-unlink '+(!x.storage_path?'disabled':'')+'>Excluir arquivo</button><button data-delete>Excluir cadastro</button>':'')+(admin&&x.storage_path?'<button data-view>Visualizar</button><button data-download>Baixar</button>':'')+'</div></div></div></section>').join("")+'</div></article>';
 root.querySelectorAll("[data-filter]").forEach(b=>{b.setAttribute("aria-pressed",String(b.dataset.filter===filter));b.onclick=()=>{filter=b.dataset.filter;render()}});
 root.querySelector("[data-add-book]")?.addEventListener("click",add);
 root.querySelectorAll(".nexo-library-row").forEach(row=>{
 const id=row.dataset.id,item=items.find(x=>x.id===id);
 row.querySelector("[data-edit]")?.addEventListener("click",()=>edit(item));
 row.querySelector("[data-upload]")?.addEventListener("change",e=>upload(item,e.target.files?.[0]));
 row.querySelector("[data-unlink]")?.addEventListener("click",()=>unlink(item));
 row.querySelector("[data-delete]")?.addEventListener("click",()=>removeItem(item));
 row.querySelector("[data-view]")?.addEventListener("click",()=>openFile(item,false));
 row.querySelector("[data-download]")?.addEventListener("click",()=>openFile(item,true));
 const h=row.querySelector(".nexo-library-handle");if(!h)return;
 h.addEventListener("dragstart",e=>{dragFrom=id;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",id)});
 row.addEventListener("dragover",e=>{if(dragFrom){e.preventDefault();e.dataTransfer.dropEffect="move"}});
 row.addEventListener("drop",e=>{e.preventDefault();const from=dragFrom;dragFrom=null;reorder(from,id)});
 h.addEventListener("dragend",()=>dragFrom=null);
 let held=false;h.style.touchAction="none";h.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse")return;held=true;h.setPointerCapture(e.pointerId)});
 h.addEventListener("pointermove",e=>{if(!held)return;const dest=document.elementFromPoint(e.clientX,e.clientY)?.closest(".nexo-library-row");if(dest&&dest.dataset.id!==id){held=false;reorder(id,dest.dataset.id)}});
 h.addEventListener("pointerup",()=>held=false);h.addEventListener("pointercancel",()=>held=false);
 });
}
async function save(item,fields){if(!token())throw Error("Acesso administrativo necessário.");return req(endpoint+"?id=eq."+encodeURIComponent(item.id),{method:"PATCH",headers:{...headers(true),"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify(fields)})}
async function add(){if(!token())return;const title=prompt("Nome do livro ou material:");if(!title?.trim())return;const kind=prompt("Tipo: Livro, Slides de aula ou Anotações pessoais","Livro")||"Livro";try{await req(endpoint,{method:"POST",headers:{...headers(true),"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({title:title.trim(),kind:kind.trim(),position:items.length})});await load()}catch(e){notice("Não foi possível adicionar: "+e.message)}}
async function edit(item){if(!token())return;const title=prompt("Editar título:",item.title);if(title===null||!title.trim())return;const kind=prompt("Editar tipo:",item.kind);if(kind===null||!kind.trim())return;try{await save(item,{title:title.trim(),kind:kind.trim()});await load()}catch(e){notice("Erro ao editar: "+e.message)}}
async function upload(item,file){if(!file)return;if(!token())return notice("Entre como administrador.");if(file.size>50*1024*1024)return notice("Limite de 50 MB por arquivo.");const ext=(file.name.split(".").pop()||"").toLowerCase();if(!["pdf","doc","docx","ppt","pptx","txt","epub"].includes(ext))return notice("Formato não permitido.");const path="psicanalise/"+crypto.randomUUID()+"."+ext;notice("Enviando "+file.name+"…");try{const r=await fetch(storage+path,{method:"POST",headers:{...headers(true),"Content-Type":file.type||"application/octet-stream","x-upsert":"false"},body:file});if(!r.ok)throw Error((await r.text()).slice(0,180));const old=item.storage_path;try{await save(item,{storage_path:path,filename:file.name,updated_at:new Date().toISOString()})}catch(e){await fetch(storage+path,{method:"DELETE",headers:headers(true)});throw e}notice("Arquivo enviado e salvo.");await load();if(old)notice("Arquivo substituído. A versão anterior permanece preservada no armazenamento para recuperação.")}catch(e){notice("Falha ao enviar: "+e.message)}}
async function unlink(item){if(!item.storage_path||!token())return;if(!confirm("Remover o arquivo associado a este material? O título continuará na biblioteca."))return;try{await save(item,{storage_path:null,filename:null,updated_at:new Date().toISOString()});await load();notice("Associação removida. O arquivo anterior foi preservado no armazenamento.")}catch(e){notice("Falha ao excluir associação: "+e.message)}}
async function removeItem(item){if(!token()||!confirm("Excluir o cadastro '"+item.title+"' da biblioteca? O arquivo original será preservado."))return;try{await req(endpoint+"?id=eq."+encodeURIComponent(item.id),{method:"DELETE",headers:{...headers(true),"Prefer":"return=minimal"}});await load()}catch(e){notice("Erro ao excluir cadastro: "+e.message)}}
async function openFile(item,download){if(!token()||!item.storage_path)return;try{const result=await req(base+"/storage/v1/object/sign/nexo-library/"+item.storage_path,{method:"POST",headers:{...headers(true),"Content-Type":"application/json"},body:JSON.stringify({expiresIn:120})});const signed=result.signedURL||result.signedUrl;if(!signed)throw Error("URL não disponível");const url=signed.startsWith("http")?signed:base+"/storage/v1"+signed;const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";if(download)a.download=item.filename||"documento";document.body.append(a);a.click();a.remove()}catch(e){notice("Erro ao abrir arquivo: "+e.message)}}
async function reorder(from,to){if(!token()||!from||from===to||busy)return;const a=items.findIndex(x=>x.id===from),b=items.findIndex(x=>x.id===to);if(a<0||b<0)return;const old=[...items];items.splice(b,0,items.splice(a,1)[0]);render();busy=true;try{for(let i=0;i<items.length;i++)if(items[i].position!==i){await save(items[i],{position:i});items[i].position=i}notice("Ordem salva.")}catch(e){items=old;render();notice("Não foi possível salvar a ordem: "+e.message)}finally{busy=false}}
const prior=window.nexoShelfRender;window.nexoShelfRender=function(){if(!loaded){prior?.();load()}else render()};
const goBefore=window.go;if(typeof goBefore==="function")window.go=function(page){goBefore(page);if(page==="biblioteca")setTimeout(()=>window.nexoShelfRender(),0)};
if(document.getElementById("detail-content")?.querySelector(".nexo-shelf"))window.nexoShelfRender();
})();