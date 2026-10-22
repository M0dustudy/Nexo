(function(){
"use strict";
const config=window.NEXO_BACKEND;
if(!config||typeof lessons==="undefined")return;
const api=config.url.replace(/\/$/,"")+"/rest/v1/nexo_editor_content";
const key="psicanalise";
const clean=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let original=JSON.parse(JSON.stringify(lessons));
let saved=[];
let editor;
const auth=()=>window.NEXO_ADMIN_TOKEN?.();
async function load(){
 try{const r=await fetch(api+"?content_key=eq."+key+"&select=payload",{headers:{apikey:config.anonKey}});if(!r.ok)throw Error("Não foi possível carregar o conteúdo.");const rows=await r.json();saved=Array.isArray(rows[0]?.payload?.units)?rows[0].payload.units:[];apply()}catch(e){console.warn("NEXO editor:",e.message)}
}
function apply(){
 lessons.splice(0,lessons.length,...original.map(x=>JSON.parse(JSON.stringify(x))),...saved.map(u=>({title:u.title,subtitle:u.subtitle,source:"Conteúdo criado no editor NEXO",blocks:u.blocks.map(b=>[b.title,b.text]),check:[u.question||"Revise os conceitos apresentados.",u.answer||"Consulte a explicação da unidade."]})));
 if(document.getElementById("reading-area")){window.lessonIndex=Math.min(window.lessonIndex,lessons.length-1);renderLessons()}
}
function panel(){
 if(editor){editor.remove();editor=null;return}
 if(!auth()){alert("Entre no modo administrador para editar o conteúdo.");return}
 editor=document.createElement("dialog");editor.className="nexo-content-editor";
 editor.innerHTML='<header><h2>Editor de conteúdo · Psicanálise</h2><button type="button" data-close aria-label="Fechar">✕</button></header><p>Crie unidades e assuntos. As alterações são salvas no Supabase e ficam disponíveis em todos os dispositivos. Os materiais originais não são alterados.</p><div id="nexo-editor-units"></div><button type="button" data-add>+ Nova unidade</button><p id="nexo-editor-status" role="status"></p>';
 document.body.append(editor);editor.querySelector("[data-close]").onclick=()=>{editor.close();editor.remove();editor=null};
 editor.querySelector("[data-add]").onclick=()=>{saved.push({title:"Nova unidade",subtitle:"",blocks:[{title:"Novo assunto",text:""}],question:"",answer:""});draw()};
 draw();editor.showModal();
}
function draw(){
 const root=editor.querySelector("#nexo-editor-units");
 root.innerHTML=saved.map((u,i)=>'<section class="nexo-edit-unit" data-unit="'+i+'"><div class="nexo-edit-head"><h3>Unidade '+(i+1)+'</h3><button type="button" data-remove-unit="'+i+'">Excluir unidade</button></div><label>Título<input data-field="title" value="'+clean(u.title)+'"></label><label>Apresentação<textarea data-field="subtitle">'+clean(u.subtitle)+'</textarea></label><h4>Assuntos</h4><div class="nexo-edit-blocks">'+u.blocks.map((b,j)=>'<div class="nexo-edit-block" data-block="'+j+'"><label>Título do assunto<input data-block-field="title" value="'+clean(b.title)+'"></label><label>Explicação<textarea rows="6" data-block-field="text">'+clean(b.text)+'</textarea></label><button type="button" data-remove-block="'+j+'">Excluir assunto</button></div>').join("")+'</div><button type="button" data-add-block>+ Adicionar assunto</button><h4>Aprenda o conteúdo · recuperação ativa</h4><label>Pergunta<input data-field="question" value="'+clean(u.question)+'"></label><label>Resposta comentada<textarea data-field="answer">'+clean(u.answer)+'</textarea></label></section>').join("");
 root.querySelectorAll("[data-unit]").forEach(section=>{
 const i=+section.dataset.unit;
 section.querySelectorAll("[data-field]").forEach(el=>el.oninput=()=>saved[i][el.dataset.field]=el.value);
 section.querySelectorAll("[data-block]").forEach(b=>{const j=+b.dataset.block;b.querySelectorAll("[data-block-field]").forEach(el=>el.oninput=()=>saved[i].blocks[j][el.dataset.blockField]=el.value);b.querySelector("[data-remove-block]").onclick=()=>{saved[i].blocks.splice(j,1);draw()}});
 section.querySelector("[data-add-block]").onclick=()=>{saved[i].blocks.push({title:"Novo assunto",text:""});draw()};
 section.querySelector("[data-remove-unit]").onclick=()=>{if(confirm("Excluir esta unidade do conteúdo publicado?")){saved.splice(i,1);draw()}};
 });
 const save=document.createElement("button");save.textContent="Salvar e publicar alterações";save.className="nexo-edit-save";save.onclick=publish;root.append(save);
}
async function publish(){
 const status=editor.querySelector("#nexo-editor-status");const token=auth();if(!token){status.textContent="Sessão encerrada. Entre novamente.";return}
 try{status.textContent="Salvando...";const r=await fetch(api+"?on_conflict=content_key",{method:"POST",headers:{"apikey":config.anonKey,"Authorization":"Bearer "+token,"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({content_key:key,payload:{units:saved}})});if(!r.ok)throw Error((await r.text()).slice(0,250));status.textContent="Conteúdo publicado e sincronizado.";apply()}catch(e){status.textContent="Não foi possível publicar: "+e.message}
}
const button=document.createElement("button");button.type="button";button.className="nexo-edit-launch";button.textContent="✎ Editar aulas";button.onclick=panel;document.body.append(button);
setInterval(()=>{button.hidden=!auth()},1500);
button.hidden=true;load();
})();