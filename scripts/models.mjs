// Read-only discovery: this command never purchases credits or runs inference.
if(!process.env.NEBIUS_API_KEY)throw Error('Set NEBIUS_API_KEY in your server environment. Do not put it in dist.');
const response=await fetch('https://api.tokenfactory.us-central1.nebius.com/v1/models',{headers:{Authorization:'Bearer '+process.env.NEBIUS_API_KEY}});
if(!response.ok)throw Error('Model discovery failed: '+response.status);
const body=await response.json();console.log(body.data.filter(m=>/^nvidia\//.test(m.id)&&/nemotron/i.test(m.id)).map(m=>m.id).join('\n'));
