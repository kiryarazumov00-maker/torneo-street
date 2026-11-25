const tg = window.Telegram?.WebApp;
tg?.ready(); tg?.expand();
const initData = tg?.initData || "";
const headers = { "Content-Type": "application/json", "x-telegram-init-data": initData };
let player = null, socket = null, myPos = { x: 500, y: 500, angle: 0 }, otherPlayers = new Map();
const $ = id => document.getElementById(id);
const money = n => Number(n).toLocaleString("ru-RU");
function toast(msg) { const el=$("toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2100); }
async function api(url, options={}) {
  const r=await fetch(url,{...options,headers:{...headers,...options.headers}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error||"Ошибка сервера");
  return data;
}
function renderPlayer() {
  if(!player)return;
  $("cash").textContent=money(player.cash); $("level").textContent=`LVL ${player.level}`;
  $("statLevel").textContent=String(player.level).padStart(2,"0"); $("xp").textContent=`${player.xp} XP`;
  $("engineLevel").textContent=`Уровень ${player.engine} / 5`; $("suspensionLevel").textContent=`Уровень ${player.suspension} / 5`;
  document.documentElement.style.setProperty("--car-color",player.car_color);
  $("garageCar").style.setProperty("--car-color",player.car_color);
  $("engineBtn").textContent=player.engine>=5?"MAX":`${money(7000*player.engine)} ₽`;
  $("suspensionBtn").textContent=player.suspension>=5?"MAX":`${money(5000*player.suspension)} ₽`;
  $("engineBtn").disabled=player.engine>=5; $("suspensionBtn").disabled=player.suspension>=5;
}
function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===name));
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.go===name));
  if(name==="rating")loadLeaderboard();
  if(name==="city")startWorld();
}
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showScreen(b.dataset.go)));
$("driveBtn").onclick=()=>showScreen("city"); $("backHome").onclick=()=>showScreen("home");
async function loadLeaderboard(){
  try{const d=await api("/api/leaderboard");$("leaderboard").innerHTML=d.players.map((p,i)=>`<div class="leader-row"><div class="rank">${String(i+1).padStart(2,"0")}</div><div class="leader-name">${escapeHtml(p.first_name||p.username||"Пилот")}</div><div class="leader-level">LVL ${p.level} • ${p.xp} XP</div></div>`).join("")||'<p class="muted">Пока пусто. Стань первым!</p>';}catch(e){toast(e.message)}
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function tune(type){
  try{const d=await api("/api/tune",{method:"POST",body:JSON.stringify({type})});player=d.player;renderPlayer();toast("Улучшение установлено!");}
  catch(e){toast(e.message)}
}
$("engineBtn").onclick=()=>tune("engine"); $("suspensionBtn").onclick=()=>tune("suspension");
document.querySelectorAll("[data-color]").forEach(b=>b.onclick=async()=>{
  try{const d=await api("/api/color",{method:"POST",body:JSON.stringify({color:b.dataset.color})});player=d.player;renderPlayer();toast("Цвет изменён");}catch(e){toast(e.message)}
});
$("startRace").onclick=async()=>{
  const btn=$("startRace");btn.disabled=true;btn.textContent="ЗАЕЗД...";
  const seconds=22+Math.random()*18;
  setTimeout(async()=>{
    try{const d=await api("/api/race/finish",{method:"POST",body:JSON.stringify({seconds})});player=d.player;renderPlayer();$("raceResult").classList.remove("hidden");$("raceResult").textContent=`Финиш! Время ${seconds.toFixed(1)} сек. Награда: +${money(d.reward)} ₽ и +120 XP.`;toast("Заезд завершён!");}
    catch(e){toast(e.message)}
    btn.disabled=false;btn.textContent="НАЧАТЬ ЗАЕЗД ↗";
  },1800);
};
function connectOnline(){
  if(!initData){$("online").textContent="DEMO";return;}
  socket=io({auth:{initData}});
  socket.on("connect",()=>{});
  socket.on("world-players",list=>list.forEach(p=>otherPlayers.set(p.id,p)));
  socket.on("player-moved",p=>otherPlayers.set(p.id,p));
  socket.on("player-left",id=>otherPlayers.delete(id));
  socket.on("connect_error",()=>toast("Не удалось подключиться к онлайну"));
}
let worldStarted=false, keys=new Set(), lastEmit=0;
function startWorld(){
  if(worldStarted)return;worldStarted=true;
  connectOnline();
  const canvas=$("world"),ctx=canvas.getContext("2d");
  const draw=()=>{
    const w=canvas.width,h=canvas.height;
    ctx.fillStyle="#202a2b";ctx.fillRect(0,0,w,h);
    ctx.fillStyle="#29343a";
    for(let y=0;y<h;y+=250)for(let x=0;x<w;x+=250)ctx.fillRect(x+12,y+12,205,205);
    ctx.fillStyle="#42494c";
    for(let x=0;x<w;x+=250)ctx.fillRect(x+0,0,225,h);
    for(let y=0;y<h;y+=250)ctx.fillRect(0,y+0,w,225);
    ctx.strokeStyle="#d4c68a66";ctx.lineWidth=3;ctx.setLineDash([22,22]);
    for(let x=112;x<w;x+=250){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=112;y<h;y+=250){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    ctx.setLineDash([]);
    // Buildings and lit windows
    for(let y=0;y<h;y+=250)for(let x=0;x<w;x+=250){
      ctx.fillStyle="#171e25";ctx.fillRect(x+28,y+28,160,160);
      ctx.strokeStyle="#56616a";ctx.strokeRect(x+28,y+28,160,160);
      for(let wy=y+42;wy<y+175;wy+=28)for(let wx=x+42;wx<x+175;wx+=28){ctx.fillStyle=((wx+wy)%3===0)?"#d6b76a55":"#71899a33";ctx.fillRect(wx,wy,9,10);}
    }
    const drawCar=(x,y,a,color,label)=>{
      ctx.save();ctx.translate(x,y);ctx.rotate(a);
      ctx.fillStyle="#080a0c";ctx.fillRect(-19,-10,38,20);
      ctx.fillStyle=color||"#d7dce2";ctx.beginPath();ctx.roundRect(-17,-8,34,16,5);ctx.fill();
      ctx.fillStyle="#8fa6b5";ctx.fillRect(-7,-6,14,12);
      ctx.fillStyle="#fff2c0";ctx.fillRect(12,-6,4,4);ctx.fillRect(12,2,4,4);
      ctx.restore();
      ctx.fillStyle="#fff";ctx.font="bold 13px Arial";ctx.textAlign="center";ctx.fillText(label,x,y-22);
    };
    for(const p of otherPlayers.values())drawCar(p.x,p.y,p.angle,p.color,p.name);
    drawCar(myPos.x,myPos.y,myPos.angle,player?.car_color,"ТЫ");
    $("online").textContent=String(otherPlayers.size+1);$("worldOnline").textContent=String(otherPlayers.size+1);
    requestAnimationFrame(draw);
  };
  const tick=()=>{
    let moving=false;
    if(keys.has("ArrowUp")||keys.has("w")){myPos.x+=Math.cos(myPos.angle)*2.5;myPos.y+=Math.sin(myPos.angle)*2.5;moving=true;}
    if(keys.has("ArrowDown")||keys.has("s")){myPos.x-=Math.cos(myPos.angle)*1.6;myPos.y-=Math.sin(myPos.angle)*1.6;moving=true;}
    if(keys.has("ArrowLeft")||keys.has("a"))myPos.angle-=.045;
    if(keys.has("ArrowRight")||keys.has("d"))myPos.angle+=.045;
    myPos.x=Math.max(30,Math.min(970,myPos.x));myPos.y=Math.max(30,Math.min(970,myPos.y));
    const now=Date.now();if(moving&&socket?.connected&&now-lastEmit>90){socket.emit("drive",myPos);lastEmit=now;}
    setTimeout(tick,30);
  };
  draw();tick();
}
window.addEventListener("keydown",e=>{if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();keys.add(e.key);});
window.addEventListener("keyup",e=>keys.delete(e.key));
document.querySelectorAll("[data-key]").forEach(b=>{
  const k=b.dataset.key;
  b.addEventListener("pointerdown",e=>{e.preventDefault();keys.add(k);});
  ["pointerup","pointerleave","pointercancel"].forEach(ev=>b.addEventListener(ev,()=>keys.delete(k)));
});
(async()=>{
  try{const d=await api("/api/me");player=d.player;renderPlayer();}
  catch(e){toast(e.message);if(!initData)toast("Открой через Telegram или включи DEV_AUTH для локального теста");}
})();
