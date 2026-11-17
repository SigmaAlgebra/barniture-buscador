import { AutoProcessor, CLIPVisionModelWithProjection, RawImage, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;
let recursos;
const progreso = texto => self.postMessage({tipo:'progreso',texto});
async function cargar() {
  const response = await fetch(new URL('../indice-web.json', import.meta.url));
  if(!response.ok) throw new Error('No se encontró indice-web.json. Revisa que hayas subido todos los archivos.');
  const indice = await response.json();
  const options = {revision:indice.revision};
  progreso('Descargando el modelo para tu navegador. La primera vez puede tardar…');
  const processor = await AutoProcessor.from_pretrained(indice.modelo, options);
  const model = await CLIPVisionModelWithProjection.from_pretrained(indice.modelo, {
    ...options, dtype:'q8', device:'wasm',
    progress_callback: p => {
      if(p.status === 'progress' && p.total) progreso(`Descargando ${p.file}: ${Math.round(p.progress)} %`);
    }
  });
  return {indice,processor,model};
}
self.onmessage = async ({data}) => {
  try {
    recursos ??= cargar().catch(e => {recursos=null; throw e;});
    const {indice,processor,model} = await recursos;
    progreso('Analizando tu foto en este dispositivo…');
    const image = await RawImage.fromBlob(data.blob);
    const inputs = await processor(image);
    const output = await model(inputs);
    const vector = Array.from(output.image_embeds.data);
    const norm = Math.hypot(...vector);
    if(!norm || vector.length !== 512) throw new Error('El modelo devolvió un vector inválido.');
    const normalizado = vector.map(v=>v/norm);
    const resultados = indice.items.map(item => ({
      archivo:item.archivo,
      imagen:new URL('../catalogo/'+encodeURIComponent(item.archivo),import.meta.url).href,
      similitud:item.vector.reduce((s,v,i)=>s+v*normalizado[i],0)
    })).sort((a,b)=>b.similitud-a.similitud).map((r,i)=>({...r,posicion:i+1}));
    self.postMessage({tipo:'resultado',resultados});
  } catch(e) {
    self.postMessage({tipo:'error',texto:'No se pudo completar la búsqueda. '+e.message});
  }
};
