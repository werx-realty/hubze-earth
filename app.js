const $=s=>document.querySelector(s);
const store={get(k,d){try{const v=localStorage.getItem('hzE_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('hzE_'+k,JSON.stringify(v))}catch(e){}}};
const keys=store.get('keys',{windy:'',firms:'',google:''});
if(!keys.windy)keys.windy='8FCrNr2kqthcSxo2Zn7bi3DbGEo5y73E';
if(!keys.google||keys.google==='AIzaSyAxrYcnhU9rTAGgsL5_oTyxKyoQpfvr-Pw')keys.google='AIzaSyCrjAYTH3G0r7ECgj5DlWypEp6AZ5rwO64';
const fmt=n=>n==null?'—':Number(n).toLocaleString();
function setStatus(t){$('#status').textContent=t}
async function getJSON(url,opt={},ms=15000){const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{...opt,signal:c.signal});if(!r.ok)throw new Error(r.status);return await r.json()}finally{clearTimeout(t)}}
const C=Cesium,D2R=Math.PI/180;

/* ---------- theme ---------- */
const THEMES=[['darker','#05070a'],['dark','#121620'],['grey','#3c4048'],['white','#f4f6f9']];
const SPACES=['#03050a','#000000','#0b1220','#1b1f27','#2b2f36','#e9edf3'];
let theme=store.get('theme','dark'),space=store.get('space','#03050a');
function applyTheme(){document.body.className='t-'+theme;document.documentElement.style.setProperty('--space',space);
  if(window.viewer){viewer.scene.skyBox.show=space==='#03050a';viewer.scene.backgroundColor=C.Color.fromCssColorString(space)}}
applyTheme();

/* ---------- layers ---------- */
const LAYERS=[
 {id:'cams',name:'Live cameras',sub:'street & city cams',color:'var(--cam)',icon:'<path d="M3 7h11v10H3zM14 10l7-4v12l-7-4" stroke="currentColor" stroke-width="2" fill="none"/>'},
 {id:'flights',name:'Flights',sub:'live aircraft, real altitude',color:'var(--plane)',icon:'<path d="M12 2l2 8 8 3v2l-8-1-1 6 3 2v1l-4-1-4 1v-1l3-2-1-6-8 1v-2l8-3z" fill="currentColor"/>'},
 {id:'fires',name:'Wildfires',sub:'NASA active fires',color:'var(--fire)',icon:'<path d="M12 2c1 4 6 6 6 12a6 6 0 01-12 0c0-3 2-4 2-7 2 1 3 3 3 5 1-3 2-6 1-10z" fill="currentColor"/>'},
 {id:'ships',name:'Ships & cruise',sub:'AIS vessel positions',color:'var(--ship)',icon:'<path d="M3 15l2 5h14l2-5zM6 14V8h12v6M10 8V4h4v4" stroke="currentColor" stroke-width="2" fill="none"/>'},
 {id:'quakes',name:'Earthquakes',sub:'USGS last 24h',color:'var(--quake)',icon:'<path d="M2 12h4l2-6 4 12 3-9 2 3h5" stroke="currentColor" stroke-width="2" fill="none"/>'},
 {id:'radar',name:'Weather radar',sub:'live rain & storms',color:'#38bdf8',icon:'<path d="M7 18a5 5 0 01-.5-10A6 6 0 0118 9a4.5 4.5 0 01-1 9z" stroke="currentColor" stroke-width="2" fill="none"/>'},
 {id:'events',name:'Storms & volcanoes',sub:'NASA natural events',color:'#f43f5e',icon:'<path d="M3 20l6-12 3 5 2-3 7 10z" fill="currentColor"/>'},
 {id:'iss',name:'Space Station',sub:'ISS live, in orbit',color:'#e2e8f0',icon:'<path d="M10 10h4v4h-4zM2 9h6v6H2zM16 9h6v6h-6zM8 12h2M14 12h2" stroke="currentColor" stroke-width="2" fill="none"/>'},
 {id:'night',name:'Day / night',sub:'real sunlight',color:'#a5b4fc',icon:'<path d="M20 14A8 8 0 1110 4a6 6 0 0010 10z" fill="currentColor"/>'},
 {id:'bld',name:'Google 3D city',sub:'real 3D when zoomed in',color:'#cbd5e1',icon:'<path d="M4 21V9l6-4v16M10 21V3l10 5v13M2 21h20" stroke="currentColor" stroke-width="2" fill="none"/>'},
 {id:'labels',name:'Places & borders',sub:'names on the globe',color:'#cbd5e1',icon:'<path d="M4 6h16M4 12h10M4 18h13" stroke="currentColor" stroke-width="2"/>'},
 {id:'spin',name:'Auto-spin globe',sub:'when zoomed out',color:'#cbd5e1',icon:'<path d="M20 12a8 8 0 11-3-6.2M20 4v5h-5" stroke="currentColor" stroke-width="2" fill="none"/>'}
];
const on=Object.assign({cams:true,flights:true,fires:true,ships:true,quakes:true,radar:false,events:true,iss:true,night:true,bld:true,labels:true,spin:true},store.get('on3',{}));
const counts={};
function renderLayers(){
  $('#layers').innerHTML=LAYERS.map(l=>`<div class="layer ${on[l.id]?'on':''}" data-id="${l.id}">
   <div class="ic" style="color:${l.color}"><svg viewBox="0 0 24 24">${l.icon}</svg></div>
   <div class="nm"><b>${l.name}</b><span>${l.sub}</span></div>
   <span class="ct">${counts[l.id]!=null?fmt(counts[l.id]):''}</span><div class="tog"></div></div>`).join('');
}
renderLayers();
$('#layers').onclick=e=>{const el=e.target.closest('.layer');if(!el)return;const id=el.dataset.id;on[id]=!on[id];store.set('on3',on);renderLayers();applyVis();if(on[id])refresh(id)};

/* ---------- viewer ---------- */
C.Ion.defaultAccessToken='';
const esri=new C.UrlTemplateImageryProvider({url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',maximumLevel:19,credit:'Imagery © Esri, Maxar, Earthstar Geographics'});
const viewer=new C.Viewer('map',{baseLayer:new C.ImageryLayer(esri),baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,
  animation:false,timeline:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,terrainProvider:new C.EllipsoidTerrainProvider(),
  requestRenderMode:false,msaaSamples:1});
viewer.scene.postProcessStages.fxaa.enabled=true;
window.viewer=viewer;
const scene=viewer.scene,cam=viewer.camera,globe=scene.globe;
viewer.clock.shouldAnimate=true;viewer.clock.currentTime=C.JulianDate.now();
globe.showGroundAtmosphere=true;globe.baseColor=C.Color.fromCssColorString('#0a1424');
scene.fog.enabled=true;scene.highDynamicRange=false;
viewer.cesiumWidget.creditContainer.classList.add('credits');
applyTheme();
const refLayer=viewer.imageryLayers.addImageryProvider(new C.UrlTemplateImageryProvider({url:'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',maximumLevel:19}));
let radarLayer=null;
cam.setView({destination:C.Cartesian3.fromDegrees(-40,28,22000000)});
const ssc=scene.screenSpaceCameraController;ssc.minimumZoomDistance=30;
scene.canvas.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();e.stopPropagation();const h=camH(),d=Math.max(-0.3,Math.min(0.3,e.deltaY*0.01));if(d<0)cam.zoomIn(h*-d);else cam.zoomOut(h*d)},{passive:false,capture:true});
document.addEventListener('wheel',e=>{if(e.ctrlKey)e.preventDefault()},{passive:false});
function zoomBy(f){const h=camH();const d=f<1?h*(1-f):h*(f-1);if(f<1)cam.zoomIn(d);else cam.zoomOut(d)}
(()=>{const z=document.createElement('div');z.id='zoomCtl';z.innerHTML='<button data-z="in" title="Zoom in">+</button><button data-z="out" title="Zoom out">−</button>';document.body.appendChild(z);
  z.onclick=e=>{const b=e.target.closest('[data-z]');if(!b)return;markBusy();zoomBy(b.dataset.z==='in'?0.5:2)}})();

/* Google photorealistic 3D */
let g3d=null;
async function loadGoogle(){
  if(g3d||!keys.google)return;
  try{C.GoogleMaps.defaultApiKey=keys.google;
    g3d=await C.createGooglePhotorealistic3DTileset({key:keys.google,onlyUsingWithGoogleGeocoder:true},{maximumScreenSpaceError:16,skipLevelOfDetail:true,cacheBytes:512*1024*1024,maximumCacheOverflowBytes:256*1024*1024});
    scene.primitives.add(g3d);g3d.show=false;
  }catch(e){console.warn('google3d',e);hint('Google 3D failed to load — check the Google key in <a onclick="openSettings()">Settings</a>.')}
}
loadGoogle();
const camH=()=>cam.positionCartographic.height;
scene.preRender.addEventListener(()=>{
  const h=camH(),show3d=!!g3d&&on.bld&&h<90000;
  if(g3d)g3d.show=show3d;globe.show=!show3d;
  globe.enableLighting=on.night;scene.light.intensity=2;
});

/* ---------- icons ---------- */
function canvasIcon(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);return c}
const ICON={
 plane:canvasIcon(48,48,(x)=>{x.translate(24,24);x.fillStyle='#facc15';x.strokeStyle='#000';x.lineWidth=2;x.beginPath();const p=[[0,-21],[3,-8],[20,3],[20,7],[3,2],[2,15],[8,19],[8,21],[0,19],[-8,21],[-8,19],[-2,15],[-3,2],[-20,7],[-20,3],[-3,-8]];x.moveTo(...p[0]);p.slice(1).forEach(q=>x.lineTo(...q));x.closePath();x.stroke();x.fill()}),
 planeG:canvasIcon(48,48,(x)=>{x.translate(24,24);x.fillStyle='#94a3b8';x.beginPath();const p=[[0,-21],[3,-8],[20,3],[20,7],[3,2],[2,15],[8,19],[8,21],[0,19],[-8,21],[-8,19],[-2,15],[-3,2],[-20,7],[-20,3],[-3,-8]];x.moveTo(...p[0]);p.slice(1).forEach(q=>x.lineTo(...q));x.closePath();x.fill()}),
 ship:canvasIcon(32,32,(x)=>{x.translate(16,16);x.fillStyle='#22d3ee';x.strokeStyle='#033';x.lineWidth=1.5;x.beginPath();x.moveTo(0,-13);x.lineTo(6,4);x.lineTo(4,12);x.lineTo(-4,12);x.lineTo(-6,4);x.closePath();x.fill();x.stroke()}),
 cam:canvasIcon(64,64,(x)=>{x.translate(32,32);x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=6;x.fillStyle='#2563eb';x.beginPath();x.arc(0,0,26,0,7);x.fill();x.shadowBlur=0;x.strokeStyle='#fff';x.lineWidth=5;x.stroke();
   x.fillStyle='#fff';x.beginPath();x.roundRect(-16,-10,21,20,4);x.fill();x.beginPath();x.moveTo(6,-3);x.lineTo(17,-10);x.lineTo(17,10);x.lineTo(6,3);x.fill();x.fillStyle='#ef4444';x.beginPath();x.arc(-10,-4,3.5,0,7);x.fill()}),
 ring:canvasIcon(64,64,(x)=>{x.strokeStyle='#60a5fa';x.lineWidth=4;x.beginPath();x.arc(32,32,28,0,7);x.stroke()}),
 fire:canvasIcon(40,40,(x)=>{const g=x.createRadialGradient(20,20,2,20,20,20);g.addColorStop(0,'#fff3b0');g.addColorStop(.3,'#ffb020');g.addColorStop(.6,'rgba(255,80,0,.6)');g.addColorStop(1,'rgba(255,60,0,0)');x.fillStyle=g;x.fillRect(0,0,40,40)}),
 quake:canvasIcon(32,32,(x)=>{x.fillStyle='rgba(192,132,252,.55)';x.strokeStyle='#e9d5ff';x.lineWidth=2;x.beginPath();x.arc(16,16,13,0,7);x.fill();x.stroke()}),
 volc:canvasIcon(32,32,(x)=>{x.fillStyle='#f43f5e';x.strokeStyle='#fff';x.lineWidth=2.5;x.beginPath();x.arc(16,16,11,0,7);x.fill();x.stroke()}),
 storm:canvasIcon(32,32,(x)=>{x.fillStyle='#38bdf8';x.strokeStyle='#fff';x.lineWidth=2.5;x.beginPath();x.arc(16,16,11,0,7);x.fill();x.stroke()}),
 iss:canvasIcon(64,40,(x)=>{x.fillStyle='#93c5fd';x.fillRect(2,12,20,16);x.fillRect(42,12,20,16);x.fillStyle='#fff';x.fillRect(22,18,20,4);x.fillRect(27,10,10,20);x.strokeStyle='#1e3a8a';x.strokeRect(2,12,20,16);x.strokeRect(42,12,20,16)})
};

/* ---------- primitive collections ---------- */
const coll={};
['fires','quakes','events','ships','flights','cams','iss'].forEach(id=>{coll[id]=scene.primitives.add(new C.BillboardCollection({scene}))});
const ringColl=scene.primitives.add(new C.BillboardCollection({scene}));
const labelColl=scene.primitives.add(new C.LabelCollection({scene}));
const NOD=Number.POSITIVE_INFINITY;
const scaleBy=new C.NearFarScalar(1e3,1.0,2e7,0.45);
function setBillboards(id,items){
  const c=coll[id];c.removeAll();if(id==='cams'){ringColl.removeAll();labelColl.removeAll()}
  items.forEach(it=>{
    const b=c.add({position:C.Cartesian3.fromDegrees(it.lon,it.lat,it.h!=null?it.h:15),image:it.icon,scale:it.scale||1,rotation:it.rot||0,
      alignedAxis:it.rot!=null?C.Cartesian3.UNIT_Z:C.Cartesian3.ZERO,disableDepthTestDistance:NOD,scaleByDistance:it.sbd||scaleBy,
      id:{layer:id,p:it.p,lon:it.lon,lat:it.lat}});
    if(id==='cams'){ringColl.add({position:b.position,image:ICON.ring,disableDepthTestDistance:NOD,scaleByDistance:scaleBy,id:b.id});
      labelColl.add({position:b.position,text:(it.p.name||'').slice(0,42),font:'600 12px Inter, sans-serif',fillColor:C.Color.fromCssColorString('#dbeafe'),outlineColor:C.Color.BLACK,outlineWidth:3,
        style:C.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new C.Cartesian2(0,30),disableDepthTestDistance:NOD,
        distanceDisplayCondition:new C.DistanceDisplayCondition(0,6000),showBackground:true,backgroundColor:C.Color.fromCssColorString('rgba(8,12,20,.7)')})}
  });
  occlude();
}
scene.preRender.addEventListener(()=>{const near=on.cams&&camH()<300000;ringColl.show=near;if(!near)return;const k=(performance.now()%1600)/1600,cp=cam.positionWC,n=ringColl.length;for(let i=0;i<n;i++){const r=ringColl.get(i);if(!r.show||C.Cartesian3.distance(cp,r.position)>60000)continue;r.scale=0.5+k*1.1;r.color=C.Color.WHITE.withAlpha(1-k)}});
function occlude(){
  const occ=new C.EllipsoidalOccluder(C.Ellipsoid.WGS84,cam.positionWC);
  const test=c=>{for(let i=0;i<c.length;i++){const b=c.get(i);b.show=occ.isPointVisible(b.position)}};
  Object.values(coll).forEach(test);test(ringColl);test(labelColl);
}
cam.percentageChanged=0.02;cam.changed.addEventListener(occlude);
setInterval(occlude,1500);
function applyVis(){
  ['fires','quakes','events','ships','flights','cams','iss'].forEach(id=>coll[id].show=!!on[id]);
  ringColl.show=labelColl.show=on.cams;refLayer.show=on.labels;if(radarLayer)radarLayer.show=on.radar;
}

/* ---------- view helpers ---------- */
function viewCenter(){
  const c=scene.canvas,p=cam.pickEllipsoid(new C.Cartesian2(c.clientWidth/2,c.clientHeight/2));
  const cg=p?C.Cartographic.fromCartesian(p):cam.positionCartographic;return {lon:C.Math.toDegrees(cg.longitude),lat:C.Math.toDegrees(cg.latitude)};
}

/* ---------- data loaders ---------- */
const windyCache={};
const loaders={
 async flights(){
  const h=camH(),c=viewCenter();
  const j=await getJSON(h>1500000?'/api/flights?global=1':`/api/flights?lat=${c.lat.toFixed(2)}&lon=${c.lon.toFixed(2)}&dist=250`,{},30000);
  let rows;
  if(j.states)rows=j.states.filter(s=>s[5]!=null&&s[6]!=null).map(s=>({lon:s[5],lat:s[6],ground:!!s[8],altm:s[7]??s[13]??0,p:{id:s[0],cs:(s[1]||s[0]).trim(),country:s[2],alt:Math.round((s[7]??s[13]??0)*3.281),spd:Math.round((s[9]||0)*1.944),trk:s[10]||0,ground:!!s[8],src:'OpenSky'}}));
  else rows=(j.ac||[]).filter(a=>a.lat!=null).map(a=>{const gr=a.alt_baro==='ground',ft=gr?0:(a.alt_baro||a.alt_geom||0);return {lon:a.lon,lat:a.lat,ground:gr,altm:ft*0.3048,
    p:{id:a.hex,cs:(a.flight||a.r||a.hex||'').trim(),type:a.t||'',reg:a.r||'',alt:Math.round(ft),spd:Math.round(a.gs||0),trk:a.track??a.true_heading??0,ground:gr,src:'ADS-B'}}});
  setBillboards('flights',rows.map(r=>({lon:r.lon,lat:r.lat,h:r.ground?20:Math.max(60,r.altm),icon:r.ground?ICON.planeG:ICON.plane,rot:-r.p.trk*D2R,scale:.55,p:r.p,sbd:new C.NearFarScalar(2e3,1.3,2e7,.35)})));
  return rows.length;
 },
 async fires(){
  const items=[];
  if(keys.firms){try{const r=await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${keys.firms}/VIIRS_SNPP_NRT/world/1`);const t=await r.text();
    const rows=t.trim().split('\n');const h=rows.shift().split(',');const iLa=h.indexOf('latitude'),iLo=h.indexOf('longitude'),iF=h.indexOf('frp'),iD=h.indexOf('acq_date'),iT=h.indexOf('acq_time');
    rows.map(r=>r.split(',')).forEach(a=>items.push({lon:+a[iLo],lat:+a[iLa],icon:ICON.fire,scale:.7,p:{title:'Satellite fire hotspot',frp:a[iF],date:a[iD]+' '+a[iT]+' UTC',src:'NASA FIRMS VIIRS'}}))}catch(e){}}
  const j=await getJSON('https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&days=45');
  j.events.forEach(ev=>{const g=ev.geometry[ev.geometry.length-1];if(g&&g.type==='Point')items.push({lon:g.coordinates[0],lat:g.coordinates[1],icon:ICON.fire,scale:1,p:{title:ev.title,date:g.date.slice(0,10),src:'NASA EONET',link:ev.sources&&ev.sources[0]&&ev.sources[0].url}})});
  setBillboards('fires',items);return items.length;
 },
 async events(){
  const j=await getJSON('https://eonet.gsfc.nasa.gov/api/v3/events?category=severeStorms,volcanoes&status=open&days=60');
  const items=j.events.map(ev=>{const g=ev.geometry[ev.geometry.length-1];if(!g||g.type!=='Point')return null;const cat=ev.categories[0].id;
    return {lon:g.coordinates[0],lat:g.coordinates[1],icon:cat==='volcanoes'?ICON.volc:ICON.storm,p:{title:ev.title,cat,date:g.date.slice(0,10),src:'NASA EONET',link:ev.sources&&ev.sources[0]&&ev.sources[0].url}}}).filter(Boolean);
  setBillboards('events',items);return items.length;
 },
 async quakes(){
  const j=await getJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
  const items=j.features.map(f=>({lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1],icon:ICON.quake,scale:Math.max(.35,(f.properties.mag||0)/3.5),
    p:{title:f.properties.place,mag:f.properties.mag||0,depth:f.geometry.coordinates[2],time:new Date(f.properties.time).toUTCString().slice(5,22),link:f.properties.url}}));
  setBillboards('quakes',items);return items.length;
 },
 async ships(){
  const j=await getJSON('https://meri.digitraffic.fi/api/ais/v1/locations',{headers:{'Digitraffic-User':'HUBZE-Earth'}},25000);const now=Date.now();
  const items=j.features.filter(f=>now-f.properties.timestampExternal<3*3600e3).map(f=>{const hd=f.properties.heading<360?f.properties.heading:f.properties.cog;
    return {lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1],h:2,icon:ICON.ship,rot:-hd*D2R,scale:.8,p:{mmsi:f.properties.mmsi||f.mmsi,sog:f.properties.sog,cog:hd,src:'AIS (Digitraffic)'}}});
  setBillboards('ships',items);return items.length;
 },
 async iss(){
  const j=await getJSON('https://api.wheretheiss.at/v1/satellites/25544');
  setBillboards('iss',[{lon:j.longitude,lat:j.latitude,h:j.altitude*1000,icon:ICON.iss,scale:.9,sbd:new C.NearFarScalar(5e5,1.6,3e7,.8),p:{alt:Math.round(j.altitude),vel:Math.round(j.velocity),vis:j.visibility}}]);
  return null;
 },
 async radar(){
  const j=await getJSON('https://api.rainviewer.com/public/weather-maps.json');
  const fr=j.radar.past[j.radar.past.length-1];
  if(radarLayer)viewer.imageryLayers.remove(radarLayer,true);
  radarLayer=viewer.imageryLayers.addImageryProvider(new C.UrlTemplateImageryProvider({url:`${j.host}${fr.path}/256/{z}/{x}/{y}/4/1_1.png`,maximumLevel:7,credit:'Radar © RainViewer'}));
  radarLayer.alpha=.7;radarLayer.show=on.radar;return null;
 },
 async cams(){
  const items=[];
  userCams().forEach(c=>items.push({lon:c.lon,lat:c.lat,icon:ICON.cam,scale:.7,p:{id:c.id,name:c.name,embed:c.embed,kind:'user',live:true}}));
  if(keys.windy){
    const h=camH(),c=viewCenter();const H={headers:{'x-windy-api-key':keys.windy}};
    const base='https://api.windy.com/webcams/api/v3/webcams?include=location,player,images&limit=50';
    const urls=h<3000000?[0,50,100].map(o=>`${base}&offset=${o}&nearby=${c.lat.toFixed(4)},${c.lon.toFixed(4)},${Math.max(5,Math.min(250,Math.round(h/1000*0.8)))}`)
                        :[0,50,100,150,200,250].map(o=>`${base}&offset=${o}&sortKey=popularity&sortDirection=desc`);
    const res=await Promise.allSettled(urls.map(u=>getJSON(u,H)));
    res.forEach(r=>{if(r.status!=='fulfilled')return;(r.value.webcams||[]).forEach(w=>{if(!w.location)return;const p=w.player||{};const live=p.live||'';
      windyCache[w.webcamId]={lon:w.location.longitude,lat:w.location.latitude,icon:ICON.cam,scale:.7,p:{id:'w'+w.webcamId,name:w.title,city:[w.location.city,w.location.country].filter(Boolean).join(', '),
        embed:live||p.day||'',live:!!live,img:(w.images&&w.images.current&&w.images.current.preview)||'',kind:'windy'}}})});
    if(res.every(r=>r.status==='rejected'))hint('Windy key was rejected — check it in <a onclick="openSettings()">Settings</a>.');
    items.push(...Object.values(windyCache));
  }
  setBillboards('cams',items);return items.length;
 }
};
const busy={};
async function refresh(id){
  if(!loaders[id]||!on[id]||busy[id])return;busy[id]=1;
  try{const n=await loaders[id]();if(n!=null)counts[id]=n;renderLayers();setStatus('Live · updated '+new Date().toLocaleTimeString())}
  catch(e){console.warn(id,e);setStatus(id+' feed unavailable, retrying')}
  finally{busy[id]=0}
}
let mvT;cam.moveEnd.addEventListener(()=>{if(spinning)return;clearTimeout(mvT);mvT=setTimeout(()=>{refresh('cams');if(camH()<1500000)refresh('flights')},600)});

/* ---------- picking ---------- */
const handler=new C.ScreenSpaceEventHandler(scene.canvas);
handler.setInputAction(e=>{
  if(placing){const p=pickGround(e.position);if(p)placeCam(p);return}
  const pk=scene.pick(e.position);const hit=pk&&pk.id&&pk.id.layer?pk.id:null;
  if(!hit)return;
  if(hit.layer==='cams')openCam(hit.p,[hit.lon,hit.lat]);else showInfo(hit.layer,hit.p);
},C.ScreenSpaceEventType.LEFT_CLICK);
handler.setInputAction(e=>{const p=pickGround(e.endPosition);if(p){$('#lat').textContent=p.lat.toFixed(3);$('#lon').textContent=p.lon.toFixed(3)}
  const picks=scene.drillPick(e.endPosition,3);scene.canvas.style.cursor=placing?'crosshair':(picks.some(x=>x.id&&x.id.layer)?'pointer':'')},C.ScreenSpaceEventType.MOUSE_MOVE);
function pickGround(pos){let c=null;if(g3d&&g3d.show){c=scene.pickPosition(pos)}if(!c)c=cam.pickEllipsoid(pos);if(!c)return null;const g=C.Cartographic.fromCartesian(c);return {lon:C.Math.toDegrees(g.longitude),lat:C.Math.toDegrees(g.latitude)}}

/* ---------- info card ---------- */
function showInfo(id,p){
  let h='';const row=(a,b)=>`<div class="row"><span>${a}</span><span>${b}</span></div>`;
  const link=(l,u)=>`<div class="row"><span>${l}</span><a style="color:var(--accent2)" href="${u}" target="_blank" rel="noopener">Open ↗</a></div>`;
  if(id==='flights')h=`<div class="k">Flight</div><h4>${p.cs||'Unknown'}</h4>${row('Altitude',p.ground?'On ground':fmt(p.alt)+' ft')}${row('Speed',fmt(p.spd)+' kt')}${row('Heading',Math.round(p.trk)+'°')}${p.type?row('Aircraft',p.type):''}${p.reg?row('Reg',p.reg):''}${p.country?row('Origin',p.country):''}${row('Source',p.src)}${link('Track','https://globe.adsbexchange.com/?icao='+p.id)}`;
  if(id==='ships')h=`<div class="k">Vessel</div><h4>MMSI ${p.mmsi}</h4>${row('Speed',(p.sog??'—')+' kn')}${row('Course',Math.round(p.cog||0)+'°')}${row('Source',p.src)}${link('Details','https://www.marinetraffic.com/en/ais/details/ships/mmsi:'+p.mmsi)}`;
  if(id==='fires')h=`<div class="k">Wildfire</div><h4>${p.title}</h4>${row('Date',p.date)}${p.frp?row('Power',p.frp+' MW'):''}${row('Source',p.src)}${p.link?link('Report',p.link):''}`;
  if(id==='events')h=`<div class="k">${p.cat==='volcanoes'?'Volcano':'Severe storm'}</div><h4>${p.title}</h4>${row('Updated',p.date)}${row('Source',p.src)}${p.link?link('Report',p.link):''}`;
  if(id==='iss')h=`<div class="k">International Space Station</div><h4>ISS · live</h4>${row('Altitude',fmt(p.alt)+' km')}${row('Speed',fmt(p.vel)+' km/h')}${row('Status',p.vis)}`;
  if(id==='quakes')h=`<div class="k">Earthquake</div><h4>M${(+p.mag).toFixed(1)} · ${p.title}</h4>${row('Time',p.time+' UTC')}${row('Depth',Math.round(p.depth)+' km')}${link('USGS',p.link)}`;
  $('#infoBody').innerHTML=h;$('#info').style.display='block';
}

/* ---------- camera screens anchored in 3D ---------- */
let camOpen=null;
function localTime(lon){return new Date(Date.now()+Math.round(lon/15)*3600e3).toISOString().slice(11,19)}
function camHTML(p,coords,big){
  const live=p.live===true||p.live==='true';
  const media=p.embed?`<iframe src="${p.embed}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`:(p.img?`<img src="${p.img}" alt="">`:'');
  return `<div class="cam-screen ${big?'big':''}">
   <div class="cs-top"><span class="live ${live?'':'day'}"><i></i>${live?'LIVE':'TODAY'}</span><span class="nm">${p.name||'Camera'}</span>
    ${big?'':'<button data-a="big" title="Full screen">⤢</button>'}<button data-a="close" title="Close">✕</button></div>
   <div class="cs-video">${media}<div class="hud"><i></i><u></u></div><div class="ts">CAM · <span data-clock="${coords[0]}">${localTime(coords[0])}</span> LOCAL</div><button class="fit" data-a="fit">FIT</button></div>
   <div class="cs-bot"><span>${(p.city||'').slice(0,40)}</span><span>${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}</span>${p.kind==='user'?'<a data-a="del" href="#">Remove</a>':''}</div></div>`;
}
function wire(el,p,coords){
  el.addEventListener('click',e=>{const a=e.target.closest('[data-a]');if(!a)return;e.preventDefault();e.stopPropagation();const act=a.dataset.a;
    if(act==='close'){if(el.closest('#bigview')){$('#bigview').classList.remove('show');$('#bigview').innerHTML=''}else closeCam()}
    if(act==='big'){closeCam();const bv=$('#bigview');bv.innerHTML=camHTML(p,coords,true);bv.classList.add('show');wire(bv.firstElementChild,p,coords)}
    if(act==='fit'){const m=el.querySelector('iframe,img');if(m){const c=m.style.objectFit==='contain';m.style.objectFit=c?'cover':'contain';a.textContent=c?'FIT':'FILL'}}
    if(act==='del'){saveUserCams(userCams().filter(c=>c.id!==p.id));closeCam();refresh('cams')}
  });
}
function closeCam(){if(camOpen){camOpen.el.remove();camOpen=null}}
const toWin=(C.SceneTransforms.worldToWindowCoordinates||C.SceneTransforms.wgs84ToWindowCoordinates).bind(C.SceneTransforms);
scene.postRender.addEventListener(()=>{
  if(!camOpen)return;
  if(g3d&&g3d.show&&!camOpen.ground&&scene.clampToHeightSupported){const c=scene.clampToHeight(camOpen.base,[...Object.values(coll),ringColl,labelColl]);if(c){camOpen.pos=c;camOpen.ground=true}}
  const w=toWin(scene,camOpen.pos);
  if(!w){camOpen.el.style.display='none';return}
  camOpen.el.style.display='block';camOpen.el.style.transform=`translate(${w.x}px,${w.y}px) translate(-50%,-100%)`;
});
function openCam(p,coords){
  closeCam();if(!p.embed&&!p.img)return;
  const el=document.createElement('div');el.className='cam-anchor';el.innerHTML=camHTML(p,coords)+'<div class="cam-stem"></div><div class="cam-dot"></div>';
  wire(el,p,coords);$('#overlay').appendChild(el);
  const base=C.Cartesian3.fromDegrees(coords[0],coords[1],0);camOpen={el,base,pos:base};
  if(camH()<30000)return;
  const head=C.Math.toRadians(25),dist=700;
  cam.flyTo({destination:C.Cartesian3.fromDegrees(coords[0]-Math.sin(head)*dist/111000/Math.cos(coords[1]*D2R),coords[1]-Math.cos(head)*dist/111000,450),
    orientation:{heading:head,pitch:C.Math.toRadians(-30),roll:0},duration:3});
}
setInterval(()=>document.querySelectorAll('[data-clock]').forEach(s=>s.textContent=localTime(+s.dataset.clock)),1000);
$('#bigview').addEventListener('click',e=>{if(e.target.id==='bigview'){e.currentTarget.classList.remove('show');e.currentTarget.innerHTML=''}});

/* ---------- user cams ---------- */
function userCams(){return store.get('usercams',[])}
function saveUserCams(a){store.set('usercams',a)}
function toEmbed(u){u=u.trim();const m=u.match(/(?:youtu\.be\/|v=|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/);
  if(m)return `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3`;return /^https?:\/\//.test(u)?u:''}
let placing=null;
function addCam(){$('#camModal').classList.add('show');$('#ncName').focus()}
$('#addCamBtn').onclick=addCam;
$('#ncGo').onclick=()=>{const embed=toEmbed($('#ncUrl').value);if(!embed){$('#ncUrl').style.borderColor='var(--live)';return}
  placing={name:$('#ncName').value.trim()||'My camera',embed};$('#camModal').classList.remove('show');$('#placing').style.display='block'};
function placeCam(ll){const c={id:'u'+Date.now(),name:placing.name,embed:placing.embed,lon:ll.lon,lat:ll.lat};placing=null;$('#placing').style.display='none';
  saveUserCams([...userCams(),c]);on.cams=true;store.set('on3',on);renderLayers();applyVis();refresh('cams');openCam({...c,live:true,kind:'user'},[c.lon,c.lat])}

/* ---------- settings ---------- */
function openSettings(){$('#kWindy').value=keys.windy;$('#kFirms').value=keys.firms;$('#kGoogle').value=keys.google;drawSw();$('#setModal').classList.add('show')}
function drawSw(){
  $('#themeSw').innerHTML=THEMES.map(([n,c])=>`<button class="${n===theme?'sel':''}" data-t="${n}" style="background:${c};color:${n==='white'?'#111':'#fff'}">${n}</button>`).join('');
  $('#bgSw').innerHTML=SPACES.map(c=>`<button class="${c===space?'sel':''}" data-b="${c}" style="background:${c}"></button>`).join('')+`<button style="background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);position:relative">+<input type="color" id="bgPick" style="position:absolute;inset:0;opacity:0;cursor:pointer"></button>`;
  $('#bgPick').oninput=e=>{space=e.target.value;store.set('space',space);applyTheme()};
}
$('#themeSw').onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;theme=b.dataset.t;store.set('theme',theme);applyTheme();drawSw()};
$('#bgSw').onclick=e=>{const b=e.target.closest('[data-b]');if(!b)return;space=b.dataset.b;store.set('space',space);applyTheme();drawSw()};
$('#setBtn').onclick=openSettings;
$('#saveSet').onclick=()=>{const g=keys.google;keys.windy=$('#kWindy').value.trim();keys.firms=$('#kFirms').value.trim();keys.google=$('#kGoogle').value.trim();store.set('keys',keys);$('#setModal').classList.remove('show');hint('');
  if(keys.google!==g){if(g3d){scene.primitives.remove(g3d);g3d=null}loadGoogle()}refresh('cams');refresh('fires')};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('.modal').classList.remove('show'));
function hint(h){const el=$('#hint');el.innerHTML=h;el.style.display=h?'block':'none';clearTimeout(hint.t);if(h)hint.t=setTimeout(()=>el.style.display='none',14000)}

/* ---------- search + cities ---------- */
const CITIES=[['New York',-73.9855,40.758],['Las Vegas',-115.1728,36.1147],['Los Angeles',-118.2468,34.0522],['Tokyo',139.7005,35.6595],['London',-0.1276,51.5072],['Paris',2.2945,48.8584],['Dubai',55.2744,25.1972],['Manila',121.0244,14.5547],['Sydney',151.2153,-33.8568]];
$('#cities').innerHTML=CITIES.map((c,i)=>`<button data-i="${i}">${c[0]}</button>`).join('');
$('#cities').onclick=e=>{const b=e.target.closest('button');if(!b)return;const c=CITIES[b.dataset.i];dive(c[1],c[2])};
function dive(lon,lat,alt=1400){closeCam();const head=C.Math.toRadians(20),back=alt*1.4;
  cam.flyTo({destination:C.Cartesian3.fromDegrees(lon-Math.sin(head)*back/111000/Math.cos(lat*D2R),lat-Math.cos(head)*back/111000,alt),orientation:{heading:head,pitch:C.Math.toRadians(-35),roll:0},duration:4.5})}
$('#search').onsubmit=async e=>{e.preventDefault();const q=$('#q').value.trim();if(!q)return;
  const ll=q.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);if(ll){dive(+ll[2],+ll[1]);return}
  try{const g=await getJSON('/api/geocode?q='+encodeURIComponent(q));
    if(!g.found){hint('No place found for "'+q+'"');return}
    const km=Math.max((g.north-g.south)*111,(g.east-g.west)*111*Math.cos(g.lat*D2R));
    dive(g.lon,g.lat,Math.min(3000000,Math.max(700,km*1000*0.9)));
  }catch(err){console.warn(err);hint('Search unavailable right now')}};
$('#globeBtn').onclick=()=>{closeCam();const c=viewCenter();cam.flyTo({destination:C.Cartesian3.fromDegrees(c.lon,20,22000000),duration:3})};

/* ---------- spin, clock ---------- */
let userBusy=false,spinning=false,busyT;
function markBusy(){userBusy=true;clearTimeout(busyT);busyT=setTimeout(()=>userBusy=false,5000)}
['pointerdown','wheel','touchstart','keydown'].forEach(ev=>scene.canvas.addEventListener(ev,markBusy,{passive:true}));
let lastT=performance.now();
scene.preRender.addEventListener(()=>{const now=performance.now(),dt=(now-lastT)/1000;lastT=now;
  spinning=on.spin&&!userBusy&&!camOpen&&camH()>5000000;if(spinning)cam.rotate(C.Cartesian3.UNIT_Z,-0.05*dt)});
let wasSpin=false;setInterval(()=>{if(wasSpin&&!spinning){refresh('cams')}wasSpin=spinning},3000);
setInterval(()=>$('#clock').textContent=new Date().toISOString().slice(11,19),1000);
setInterval(()=>{const h=camH();$('#zm').textContent=h>10000?Math.round(h/1000).toLocaleString()+' km':Math.round(h)+' m'},300);

/* ---------- start ---------- */
applyVis();
['cams','flights','fires','ships','quakes','events','iss','radar'].forEach(refresh);
setInterval(()=>refresh('iss'),5000);setInterval(()=>refresh('radar'),10*60000);setInterval(()=>refresh('events'),30*60000);
setInterval(()=>refresh('flights'),camH()>1500000?60000:20000);setInterval(()=>refresh('ships'),60000);setInterval(()=>refresh('fires'),15*60000);setInterval(()=>refresh('quakes'),5*60000);
