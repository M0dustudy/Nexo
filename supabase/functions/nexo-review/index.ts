import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const origin=Deno.env.get("NEXO_ORIGIN")||"https://m0dustudy.github.io";
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,content-type,apikey","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers});
 if(req.method!=="POST")return reply({error:"Método inválido"},405);
 try{
 const jwt=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!jwt)return reply({error:"Autenticação necessária"},401);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
 const {data:{user}}=await db.auth.getUser(jwt);
 if(!user)return reply({error:"Sessão inválida"},401);
 const {data:admin}=await db.from("nexo_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return reply({error:"Sem autorização"},403);
 const body=await req.json(),count=Number(body.count),difficulty=String(body.difficulty||"normal");
 if(![10,20,30].includes(count)||!["facil","normal","dificil"].includes(difficulty))return reply({error:"Configuração inválida"},400);
 const instructions=String(body.instructions||"").slice(0,5000);
 const sources=body.sources;
 if(!Array.isArray(sources)||sources.length===0||sources.length>12)return reply({error:"Selecione fontes verificadas"},400);
 let totalChars=0;const formatted=[];
 for(const source of sources){
 const name=String(source.name||"").slice(0,180),pages=source.pages;
 if(!name||!Array.isArray(pages)||!pages.length||pages.length>600)return reply({error:"Fonte inválida"},400);
 const checked=[];
 for(const p of pages){
 const number=Number(p.page),text=String(p.text||"");
 if(!Number.isInteger(number)||number<1||text.trim().length<25)return reply({error:"Página não legível em "+name},422);
 totalChars+=text.length;if(totalChars>120000)return reply({error:"O material ultrapassa o limite de 120 mil caracteres por geração. Divida em blocos, preservando todas as fontes."},413);
 checked.push("[página/slide "+number+"] "+text);
 }
 formatted.push("ARQUIVO: "+name+"\n"+checked.join("\n"));
 }
 const key=Deno.env.get("OPENAI_API_KEY");if(!key)return reply({error:"Serviço de IA não configurado"},503);
 const prompt=`Você é um professor especialista que prepara revisões de alto nível para a plataforma NEXO. Produza revisão PROFUNDA, precisa e instrutiva em português brasileiro, com base EXCLUSIVAMENTE nos arquivos abaixo. Dê prioridade aos slides, livros como aprofundamento, respeitando divergências. Não invente fontes nem páginas. Identifique cada referência por nome e página/slide. Quando houver afirmação controversa ou possível erro cronológico na fonte, identifique a divergência sem corrigir silenciosamente. Explique conceitos com exemplos claramente rotulados como didáticos, comparações, mapas conceituais textuais, macetes explicitamente criados pela IA, ênfase em compreensão e perguntas de recuperação ativa. Gere três simulados ORIGINAIS, cada um com exatamente ${count} questões, cerca de 80% objetivas com cinco alternativas e 20% discursivas; dificuldade ${difficulty}. Cada questão objetiva tem alternativas A-E, gabarito e justificativa; discursiva tem resposta-modelo e critérios. Não alegue que imagens ou vídeos foram gerados. Não copie passagens longas das fontes. Instruções do estudante: ${instructions}. Responda APENAS JSON válido no formato {"sections":[{"title":"...","explanation":"...","source_refs":[{"name":"...","page":1}],"example":"...","memory_tip":"...","review_question":"...","review_answer":"..."}],"exams":[{"title":"Simulado 1","questions":[{"type":"objective","stem":"...","options":["A...","B...","C...","D...","E..."],"answer":"A","explanation":"...","source_refs":[{"name":"...","page":1}]},{"type":"discursive","stem":"...","answer":"...","criteria":"...","source_refs":[{"name":"...","page":1}]}]}]}. Fontes:\n${formatted.join("\n\n")}`;
 const response=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4.1",temperature:0.35,response_format:{type:"json_object"},messages:[{role:"user",content:prompt}],max_completion_tokens:16000})});
 const result=await response.json();
 if(!response.ok)return reply({error:"Falha no serviço de IA",detail:result.error?.message||"Falha desconhecida"},502);
 const content=result.choices?.[0]?.message?.content;if(!content)return reply({error:"Resposta de IA incompleta"},502);
 const data=JSON.parse(content);
 if(!Array.isArray(data.sections)||!Array.isArray(data.exams)||data.exams.length!==3)return reply({error:"A revisão não passou na verificação de estrutura"},502);
 if(data.exams.some((x:unknown)=>!x||typeof x!=="object"||!Array.isArray((x as {questions?:unknown[]}).questions)||(x as {questions:unknown[]}).questions.length!==count))return reply({error:"Quantidade de questões não validada. Tente novamente."},502);
 const refs=new Set(sources.flatMap(s=>s.pages.map((p:{page:number})=>s.name+"|"+p.page)));
 for(const section of data.sections){if(!Array.isArray(section.source_refs)||!section.source_refs.length||section.source_refs.some((r:{name:string,page:number})=>!refs.has(r.name+"|"+r.page)))return reply({error:"Uma referência da revisão não corresponde às fontes enviadas"},502)}
 for(const exam of data.exams){for(const q of exam.questions){if(!Array.isArray(q.source_refs)||!q.source_refs.length||q.source_refs.some((r:{name:string,page:number})=>!refs.has(r.name+"|"+r.page)))return reply({error:"Uma referência de questão não corresponde às fontes"},502)}}
 return reply({ok:true,review:data,source_count:sources.length});
 }catch{return reply({error:"Erro ao processar a revisão"},500)}
});
