require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const client = API_KEY ? new OpenAI({ apiKey: API_KEY }) : null;
const PUBLIC = path.join(__dirname, "public");

const MIME = {
  ".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",
  ".webmanifest":"application/manifest+json; charset=utf-8",".svg":"image/svg+xml",
  ".png":"image/png",".ico":"image/x-icon"
};

function send(res,status,body,type="application/json"){
  res.writeHead(status,{"Content-Type":type,"Cache-Control":"no-store"});
  res.end(body);
}
function safeContext(ctx={}){
  const limit=(v,n=80)=>Array.isArray(v)?v.slice(0,n):[];
  return {
    profile:{name:String(ctx.profile?.name||"Estudiante").slice(0,80)},
    planner:ctx.planner||{maxHours:2,minSession:25},
    tasks:limit(ctx.tasks).map(t=>({
      title:String(t.title||"").slice(0,120),subject:String(t.subject||"").slice(0,80),
      due:String(t.due||"").slice(0,20),priority:String(t.priority||"").slice(0,20),
      minutes:Number(t.minutes)||30,done:Boolean(t.done)
    })),
    grades:limit(ctx.grades).map(g=>({subject:String(g.subject||"").slice(0,80),grade:Number(g.grade)||0})),
    schedule:limit(ctx.schedule).map(s=>({day:String(s.day||"").slice(0,30),time:String(s.time||"").slice(0,10),course:String(s.course||"").slice(0,80)})),
    announcements:limit(ctx.announcements,20).map(a=>String(a).slice(0,200))
  };
}

async function askAI(message,context){
  const instructions=`Eres EduNova, un asistente escolar en español.
Ayudas a un estudiante a organizar tareas, horarios, estudio y notas.

Reglas:
- Sé claro, breve y práctico.
- Usa únicamente los datos proporcionados; no inventes tareas, horarios o notas.
- Para priorizar, considera primero la fecha de entrega y luego la prioridad.
- Respeta las horas máximas de estudio indicadas.
- Si una tarea es grande, sugiere dividirla en sesiones.
- No afirmes que hiciste cambios en los datos: solo puedes sugerirlos.
- Si falta información importante, dilo y trabaja con lo disponible.
- No inventes calificaciones.

Contexto:
${JSON.stringify(context)}`;

  const response=await client.responses.create({
    model:MODEL,
    instructions,
    input:message,
    max_output_tokens:500
  });
  return response.output_text || "No pude generar una respuesta.";
}

function localReply(message,ctx){
  const q=message.toLowerCase();
  const tasks=(ctx.tasks||[]).filter(t=>!t.done).sort((a,b)=>String(a.due).localeCompare(String(b.due)));
  if(q.includes("primero")||q.includes("urgente"))
    return tasks.length?`Yo empezaría por "${tasks[0].title}", que vence el ${tasks[0].due}. Después seguiría con las tareas por fecha y prioridad.`:"No tienes tareas pendientes.";
  if(q.includes("plan")||q.includes("organiza"))
    return `Tienes ${tasks.length} tareas pendientes. Con ${ctx.planner?.maxHours||2} horas diarias disponibles, empieza por la entrega más cercana y divide las tareas largas en sesiones de ${ctx.planner?.minSession||25} minutos.`;
  if(q.includes("nota")||q.includes("promedio")){
    const g=ctx.grades||[];
    if(!g.length)return "Todavía no tienes notas registradas.";
    const avg=g.reduce((a,x)=>a+Number(x.grade||0),0)/g.length;
    return `Tu promedio registrado es ${avg.toFixed(2)} sobre 20.`;
  }
  return "Puedo ayudarte a priorizar tareas, organizar tu semana, revisar fechas y analizar tus notas. Prueba: “¿Qué tarea hago primero?”";
}

async function readBody(req){
  let body="";
  for await(const chunk of req){
    body+=chunk;
    if(body.length>200000)throw new Error("Body too large");
  }
  return JSON.parse(body||"{}");
}

const server=http.createServer(async(req,res)=>{
  try{
    if(req.url==="/api/health"){
      return send(res,200,JSON.stringify({ok:true,ai:Boolean(client),model:client?MODEL:null}));
    }
    if(req.url==="/api/chat"&&req.method==="POST"){
      const b=await readBody(req);
      const message=String(b.message||"").trim();
      if(!message)return send(res,400,JSON.stringify({error:"Falta el mensaje."}));
      const context=safeContext(b.context);

      if(!client){
        return send(res,200,JSON.stringify({reply:localReply(message,context),mode:"local"}));
      }
      try{
        return send(res,200,JSON.stringify({reply:await askAI(message,context),mode:"ai"}));
      }catch(error){
        console.error("AI error:",error.message);
        return send(res,200,JSON.stringify({
          reply:localReply(message,context),
          mode:"local",
          warning:"La IA no respondió; se usó el modo local."
        }));
      }
    }

    if(req.method!=="GET")return send(res,405,JSON.stringify({error:"Método no permitido."}));
    let urlPath=decodeURIComponent(req.url.split("?")[0]);
    if(urlPath==="/")urlPath="/index.html";
    const file=path.normalize(path.join(PUBLIC,urlPath));
    if(!file.startsWith(PUBLIC))return send(res,403,"Forbidden","text/plain");
    if(!fs.existsSync(file)||fs.statSync(file).isDirectory())return send(res,404,"Not found","text/plain");

    res.writeHead(200,{"Content-Type":MIME[path.extname(file)]||"application/octet-stream"});
    fs.createReadStream(file).pipe(res);
  }catch(e){
    console.error(e);
    send(res,500,JSON.stringify({error:"Error del servidor."}));
  }
});
server.listen(PORT,"0.0.0.0",()=>console.log(`EduNova V3 en puerto ${PORT}`));