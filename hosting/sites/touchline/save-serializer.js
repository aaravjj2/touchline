self.onmessage=({data})=>{try{self.postMessage({id:data.id,json:JSON.stringify(data.value)});}catch(error){self.postMessage({id:data.id,error:error.message});}};
