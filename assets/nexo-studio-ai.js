/* NEXO — revisão autenticada, baseada em texto realmente extraído dos documentos. */
(function(){
"use strict";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const refs=a=>Array.isArray(a)?a.map(r=>esc(r.name)+" · p. "+esc(r.page)).join("; "):"Referência não informada";
function render(review,preview,sources,difficulty){
 let html='<article class="studio-sheet nexo-ai-sheet"><header><p>NEXO STUDIO · REVISÃO FUNDAMENTADA</p><h2>Revisão premium</h2><p>'+sources.length+' fonte(s) processada(s) · dificuldade '+esc(difficulty)+'</p></header>';
 for(const sec of review.sections){
 html+='<section class="nexo-ai-section"><h3>'+esc(sec.title)+'</h3><p>'+esc(sec.explanation)+'</p>';
 if(sec.example)html+='<p><strong>Exemplo didático:</strong> '+esc(sec.example)+'</p>';
 if(sec.memory_tip)html+='<p><strong>Macete de revisão:</strong> '+esc(sec.memory_tip)+'</p>';
 if(sec.review_question)html+='<p><strong>Recuperação ativa:</strong> '+esc(sec.review_question)+'</p><p><strong>Resposta:</strong> '+esc(sec.review_answer)+'</p>';
 html+='<small>Fontes: '+refs(sec.source_refs)+'</small></section>';
 }
 for(const exam of review.exams){
 html+='<section class="nexo-ai-exam"><h3>'+esc(exam.title)+'</h3>';
 exam.questions.forEach((q,i)=>{
 html+='<div class="nexo-ai-question"><p><strong>'+(i+1)+'.</strong> '+esc(q.stem)+'</p>';
 if(q.type==="objective"&&Array.isArray(q.options))html+='<ol type="A">'+q.options.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ol>';
 html+='</div>';
 });
 html+='<section class="nexo-answer-key"><h4>Gabarito comentado · '+esc(exam.title)+'</h4>';
 exam.questions.forEach((q,i)=>{
 html+='<p><strong>'+(i+1)+'.</strong> '+(q.type==="objective"?'<strong>Alternativa '+esc(q.answer)+'</strong> — '+esc(q.explanation):'<strong>Resposta-modelo:</strong> '+esc(q.answer)+' <strong>Critérios:</strong> '+esc(q.criteria))+'<small>Fonte: '+refs(q.source_refs)+'</small></p>';
 });
 html+='</section></section>';
 }
 html+='</article><button type="button" class="studio-print nexo-ai-print">Imprimir ou salvar PDF</button>';
 preview.innerHTML=html;preview.querySelector(".nexo-ai-print").onclick=()=>window.print();
}
window.NEXO_GENERATE_FROM_SOURCES=async({root,preview,button,sources})=>{
 const cfg=window.NEXO_BACKEND||{},jwt=window.NEXO_ADMIN_TOKEN?.();
 if(!cfg.url||!cfg.anonKey||!jwt){preview.innerHTML='<div class="nexo-source-check"><h3>Fontes verificadas, geração ainda indisponível</h3><p>Para gerar uma revisão baseada nesses documentos, é necessário ativar o serviço de IA e autenticar sua conta administrativa. Nenhuma revisão fictícia foi criada.</p></div>';return}
 const count=Number(root.querySelector("#st-count")?.value||10),difficulty=root.querySelector("#nexo-studio-difficulty")?.value||"normal",instructions=root.querySelector("#st-instructions")?.value||"";
 const total=sources.reduce((n,s)=>n+s.pages.reduce((k,p)=>k+p.text.length,0),0);
 if(total>120000){preview.innerHTML='<div class="nexo-source-check"><h3>Material acima do limite desta geração</h3><p>Foram extraídos '+total+' caracteres. O limite é de 120 mil caracteres por geração; o sistema não vai cortar fontes silenciosamente.</p></div>';return}
 button.disabled=true;preview.innerHTML='<div class="nexo-source-check"><h3>Gerando revisão a partir das fontes</h3><p>Aguarde a produção e a validação dos três simulados.</p></div>';
 try{
 const response=await fetch(cfg.url.replace(/\/$/,"")+"/functions/v1/nexo-review",{method:"POST",headers:{"apikey":cfg.anonKey,"Authorization":"Bearer "+jwt,"Content-Type":"application/json"},body:JSON.stringify({sources:sources.map(s=>({name:s.name,pages:s.pages})),count,difficulty,instructions})});
 const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||"Não foi possível gerar a revisão");
 render(data.review,preview,sources,difficulty);
 }catch(e){preview.innerHTML='<div class="nexo-source-check"><h3>Revisão não gerada</h3><p>'+esc(e.message||"Falha no serviço")+'</p></div>'}
 finally{button.disabled=false}
};
})();
