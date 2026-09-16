export async function generateImage(config,{prompt,negativePrompt="",referenceImage=""}={}){
  const c=config||{};if(!c.enabled)throw Error("全局生图未开启");if(!c.apiKey)throw Error("生图 API Key 未填写");if(!c.model&&c.provider!=="Stability AI")throw Error("请选择生图模型");
  const positive=[c.globalPositivePrompt,prompt,referenceImage?"保持参考脸的稳定身份特征、五官比例和发型特征":""].filter(Boolean).join("，"),negative=[c.globalNegativePrompt,negativePrompt].filter(Boolean).join("，");
  if(c.provider==="Stability AI")return stability(c,positive,negative,referenceImage);
  return openAiCompatible(c,positive,negative,referenceImage);
}

export async function testImageConnection(config){const src=await generateImage({...config,enabled:true},{prompt:"一只黑白简约线稿小兔子图标，纯色背景，居中构图",negativePrompt:"文字，水印，复杂背景"});if(!src)throw Error("接口没有返回图片");return src}

async function openAiCompatible(c,prompt,negative,reference){
  const base=String(c.baseUrl||"https://api.openai.com/v1").replace(/\/$/,""),headers={Authorization:`Bearer ${c.apiKey}`};let response;
  if(reference&&c.provider==="OpenAI Images"){
    const form=new FormData();form.append("model",c.model);form.append("prompt",negative?`${prompt}\nAvoid: ${negative}`:prompt);form.append("size",c.size||"1024x1024");form.append("image",await imageBlob(reference),"reference.png");response=await fetch(`${base}/images/edits`,{method:"POST",headers,body:form});
  }else{
    response=await fetch(`${base}/images/generations`,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({model:c.model,prompt:negative?`${prompt}\nNegative prompt: ${negative}`:prompt,negative_prompt:negative||undefined,size:c.size||"1024x1024",n:1,quality:c.quality||"auto",response_format:c.responseFormat||"b64_json",reference_image:reference||undefined})});
  }
  if(!response.ok)throw Error(await apiError(response,"生图接口"));const data=await response.json(),item=data.data?.[0]||data.images?.[0]||data.output?.[0];if(typeof item==="string")return/^https?:|^data:/.test(item)?item:`data:image/png;base64,${item}`;if(item?.b64_json||item?.base64)return`data:image/png;base64,${item.b64_json||item.base64}`;if(item?.url)return item.url;throw Error("生图接口没有返回可用图片数据");
}

async function stability(c,prompt,negative,reference){const base=String(c.baseUrl||"https://api.stability.ai").replace(/\/$/,""),form=new FormData();form.append("prompt",prompt);if(negative)form.append("negative_prompt",negative);form.append("output_format",c.format||"png");if(reference){form.append("image",await imageBlob(reference),"reference.png");form.append("strength",String(c.referenceStrength||.55))}const endpoint=reference?"/v2beta/stable-image/control/style":"/v2beta/stable-image/generate/core",response=await fetch(`${base}${endpoint}`,{method:"POST",headers:{Authorization:`Bearer ${c.apiKey}`,Accept:"image/*"},body:form});if(!response.ok)throw Error(await apiError(response,"Stability AI"));return URL.createObjectURL(await response.blob())}
async function imageBlob(source){if(String(source).startsWith("data:")){const [head,data]=source.split(","),mime=head.match(/data:([^;]+)/)?.[1]||"image/png",bytes=atob(data),array=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)array[i]=bytes.charCodeAt(i);return new Blob([array],{type:mime})}const response=await fetch(source);if(!response.ok)throw Error("参考脸图片无法读取");return response.blob()}
async function apiError(response,label){let detail="";try{const data=await response.clone().json();detail=data.error?.message||data.message||""}catch{detail=(await response.text()).slice(0,180)}return`${label}返回 ${response.status}${detail?`：${detail}`:""}`}
