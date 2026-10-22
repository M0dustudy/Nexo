import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const headers = { "Access-Control-Allow-Origin": Deno.env.get("NEXO_ORIGIN") ?? "https://m0dustudy.github.io", "Access-Control-Allow-Headers": "authorization,content-type,apikey", "Access-Control-Allow-Methods": "POST,OPTIONS", "Content-Type": "application/json" };
serve(async req => {
 if(req.method==="OPTIONS") return new Response(null,{headers});
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method!=="POST") return reply({error:"Método inválido"},405);
 try{
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token) return reply({error:"Autenticação necessária"},401);
 const url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const db=createClient(url,service,{auth:{persistSession:false}});
 const {data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user) return reply({error:"Sessão inválida"},401);
 const {data:admin,error:adminError}=await db.from("nexo_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(adminError||!admin) return reply({error:"Acesso administrativo negado"},403);
 const body=await req.json();
 if(body.action==="status") return reply({ok:true,admin:true});
 if(body.action==="delete"){
  const id=String(body.id||"");if(!/^[0-9a-f-]{36}$/i.test(id)) return reply({error:"ID inválido"},400);
  const {data:record}=await db.from("nexo_lesson_images").select("*").eq("id",id).maybeSingle();
  if(!record) return reply({error:"Imagem não encontrada"},404);
  const prefix=url+"/storage/v1/object/public/nexo-lesson-images/";
  if(!record.image_url.startsWith(prefix)) return reply({error:"Arquivo inválido"},400);
  const path=decodeURIComponent(record.image_url.slice(prefix.length));
  const {error:removeError}=await db.storage.from("nexo-lesson-images").remove([path]);
  if(removeError) return reply({error:"Falha ao remover arquivo"},500);
  const {error:deleteError}=await db.from("nexo_lesson_images").delete().eq("id",id);
  if(deleteError) return reply({error:"Falha ao remover registro"},500);
  return reply({ok:true});
 }
 if(body.action!=="generate") return reply({error:"Ação inválida"},400);
 const lesson=Number(body.lesson_index),section=Number(body.section_index),prompt=String(body.prompt||"").trim(),alt=String(body.alt_text||"").trim();
 if(!Number.isInteger(lesson)||lesson<0||lesson>1000||!Number.isInteger(section)||section<0||section>1000||prompt.length<30||prompt.length>2500||alt.length<5||alt.length>240) return reply({error:"Dados inválidos"},400);
 const key=Deno.env.get("OPENAI_API_KEY");
 if(!key) return reply({error:"Serviço de imagens ainda não configurado"},503);
 const ai=await fetch("https://api.openai.com/v1/images/generations",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-image-1",size:"1536x1024",quality:"high",n:1,prompt:"Ilustração educacional premium para plataforma de estudos NEXO. Sem logotipos. Sem texto ilegível ou afirmações inventadas. Crie uma cena didática rica, visualmente elegante, detalhada e conceitualmente correta, com qualidade editorial profissional. Tema: "+prompt})});
 const result=await ai.json();
 if(!ai.ok||!result.data?.[0]?.b64_json) return reply({error:"Falha na geração da imagem",detail:result.error?.message||"Resposta inválida"},502);
 const binary=atob(result.data[0].b64_json),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 const path=lesson+"/"+crypto.randomUUID()+".png";
 const {error:uploadError}=await db.storage.from("nexo-lesson-images").upload(path,bytes,{contentType:"image/png",upsert:false});
 if(uploadError) return reply({error:"Falha ao armazenar imagem"},500);
 const {data:publicData}=db.storage.from("nexo-lesson-images").getPublicUrl(path);
 const {data:record,error:insertError}=await db.from("nexo_lesson_images").insert({lesson_index:lesson,section_index:section,image_url:publicData.publicUrl,prompt,alt_text:alt,created_by:user.id}).select().single();
 if(insertError){await db.storage.from("nexo-lesson-images").remove([path]);return reply({error:"Falha ao associar imagem à aula"},500)}
 return reply({ok:true,image:record});
 }catch(e){return reply({error:"Erro interno na operação"},500)}
});
