const HUBS=[[40.6,-74],[33.9,-118.4],[41.9,-87.9],[32.9,-97],[33.6,-84.4],[47.4,-122.3],[25.8,-80.3],[39.8,-104.7],[51.5,-0.4],[50,8.5],[48.8,2.5],[52.3,4.8],[41.3,2.1],[41.8,12.3],[25.2,55.4],[35.7,139.8],[22.3,113.9],[1.4,104],[14.5,121],[-33.9,151.2],[19.4,-99.1],[-23.4,-46.5],[28.6,77.1],[43.7,-79.6]];
async function get(u,ms=9000){const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(u,{signal:c.signal,headers:{'User-Agent':'HUBZE-Earth/1.0'}});if(!r.ok)throw new Error(r.status);return await r.json()}finally{clearTimeout(t)}}
async function point(lat,lon,dist){for(const b of ['https://api.adsb.lol/v2/point','https://api.airplanes.live/v2/point','https://opendata.adsb.fi/api/v2/lat']){try{const u=b.endsWith('/lat')?`${b}/${lat}/lon/${lon}/dist/${dist}`:`${b}/${lat}/${lon}/${dist}`;const j=await get(u);return j.ac||j.aircraft||[]}catch(e){}}return []}
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  const q=req.query||{};
  try{
    if(q.global){
      res.setHeader('Cache-Control','s-maxage=30, stale-while-revalidate=60');
      try{const j=await get('https://opensky-network.org/api/states/all',12000);if(j.states&&j.states.length)return res.status(200).json({src:'opensky',states:j.states})}catch(e){}
      const all=await Promise.all(HUBS.map(h=>point(h[0],h[1],250)));const seen={},ac=[];
      all.flat().forEach(a=>{if(a&&a.hex&&!seen[a.hex]){seen[a.hex]=1;ac.push(a)}});
      return res.status(200).json({src:'adsb',ac});
    }
    res.setHeader('Cache-Control','s-maxage=8, stale-while-revalidate=15');
    const lat=(+q.lat).toFixed(2),lon=(+q.lon).toFixed(2),dist=Math.min(250,+q.dist||250);
    return res.status(200).json({src:'adsb',ac:await point(lat,lon,dist)});
  }catch(e){return res.status(500).json({error:String(e.message||e)})}
}
