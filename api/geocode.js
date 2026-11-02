export default async function handler(req,res){
  const q=((req.query||{}).q||'').toString().slice(0,200);
  if(!q)return res.status(400).json({error:'missing q'});
  res.setHeader('Cache-Control','s-maxage=86400');
  try{
    const r=await fetch('https://maps.googleapis.com/maps/api/geocode/json?address='+encodeURIComponent(q)+'&key='+process.env.GOOGLE_GEOCODE_KEY);
    const j=await r.json();const g=j.results&&j.results[0];
    if(!g)return res.status(200).json({status:j.status,found:false});
    const v=g.geometry.viewport;
    return res.status(200).json({found:true,name:g.formatted_address,lat:g.geometry.location.lat,lon:g.geometry.location.lng,
      north:v.northeast.lat,south:v.southwest.lat,east:v.northeast.lng,west:v.southwest.lng});
  }catch(e){return res.status(500).json({error:String(e.message||e)})}
}
