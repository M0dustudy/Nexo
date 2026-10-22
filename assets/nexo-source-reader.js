/* NEXO — leitura local verificável de fontes para o Studio.
 * Arquivos são lidos no navegador, não armazenados no GitHub.
 * A extração não equivale a compreensão semântica por IA. */
(function(){
"use strict";
const loadScript=(url)=>new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=url;s.onload=resolve;s.onerror=()=>reject(Error("Não foi possível carregar o leitor de documentos"));document.head.append(s)});
let pdfReady=null,docxReady=null,zipReady=null;
async function readPDF(file){
 pdfReady ||= import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
 const pdfjs=await pdfReady;pdfjs.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
 const doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 const pages=[];for(let p=1;p<=doc.numPages;p++){const page=await doc.getPage(p),content=await page.getTextContent(),text=content.items.map(x=>x.str||"").join(" ").trim();pages.push({page:p,text})}
 return {pages,total:doc.numPages};
}
async function readDOCX(file){
 docxReady ||= loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.9.0/mammoth.browser.min.js");await docxReady;
 const r=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return {pages:[{page:1,text:r.value}],total:1,warning:"DOCX: texto extraído sem correspondência exata de páginas."};
}
async function readPPTX(file){
 zipReady ||= loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");await zipReady;
 const zip=await window.JSZip.loadAsync(await file.arrayBuffer()),slides=Object.keys(zip.files).filter(x=>/^ppt\/slides\/slide\d+\.xml$/.test(x)).sort((a,b)=>+a.match(/slide(\d+)/)[1]-+b.match(/slide(\d+)/)[1]);
 const parser=new DOMParser(),pages=[];
 for(let i=0;i<slides.length;i++){const xml=parser.parseFromString(await zip.file(slides[i]).async("string"),"text/xml"),nodes=[...xml.getElementsByTagNameNS("http://schemas.openxmlformats.org/drawingml/2006/main","t")];pages.push({page:i+1,text:nodes.map(n=>n.textContent).join(" ").trim()})}
 return {pages,total:slides.length,warning:"PPTX: texto dos slides extraído; imagens, notas e diagramas podem exigir leitura visual."};
}
async function readFile(file){
 if(file.size>30*1024*1024)throw Error("Arquivo maior que 30 MB. Divida-o em partes menores.");
 const ext=file.name.split(".").pop().toLowerCase();
 let result;
 if(ext==="pdf")result=await readPDF(file);
 else if(ext==="docx")result=await readDOCX(file);
 else if(ext==="pptx")result=await readPPTX(file);
 else if(["txt","md"].includes(ext))result={pages:[{page:1,text:await file.text()}],total:1};
 else throw Error("Formato ainda sem extração confiável: "+ext.toUpperCase()+". Use PDF com texto, DOCX, PPTX ou TXT.");
 const chars=result.pages.reduce((n,p)=>n+p.text.length,0),empty=result.pages.filter(p=>p.text.length<25).map(p=>p.page);
 return {name:file.name,type:ext,pages:result.pages,total:result.total,chars,empty,warning:result.warning||null,complete:empty.length===0&&chars>100};
}
window.NEXO_SOURCE_READER={readFile};
})();
