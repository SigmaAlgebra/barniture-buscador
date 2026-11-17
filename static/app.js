const $ = id => document.getElementById(id);
const canvas = $("lienzo"), ctx = canvas.getContext("2d");
let imagen = null, escala = 1, x = 0, y = 0, drag = null;
let ocupada = false, seleccion = 0;

function mensaje(texto) { $("estado").textContent = texto; }

function limites() {
  if (!imagen) return;
  x = Math.min(0, Math.max(canvas.width - imagen.width * escala, x));
  y = Math.min(0, Math.max(canvas.height - imagen.height * escala, y));
}

function pintar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (imagen) {
    limites();
    ctx.drawImage(imagen, x, y, imagen.width * escala, imagen.height * escala);
  }
}

function restablecer() {
  escala = Math.max(canvas.width / imagen.width, canvas.height / imagen.height);
  x = (canvas.width - imagen.width * escala) / 2;
  y = (canvas.height - imagen.height * escala) / 2;
  $("zoom").value = 1;
  pintar();
}

function controles() {
  $("foto").disabled = ocupada;
  for (const id of ["buscar", "reset", "zoom"]) {
    $(id).disabled = ocupada || !imagen;
  }
}

$("foto").addEventListener("change", async () => {
  const turno = ++seleccion;
  const file = $("foto").files[0];
  imagen = null;
  pintar();
  controles();
  $("vacio").hidden = false;
  $("resultados").hidden = true;
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    mensaje("Elige una imagen de menos de 8 MB."); return;
  }
  const url = URL.createObjectURL(file);
  try {
    const nueva = new Image();
    nueva.src = url;
    await nueva.decode();
    if (turno !== seleccion) return;
    if (nueva.width * nueva.height > 20000000) {
      throw new Error("Reduce la imagen a menos de 20 megapíxeles.");
    }
    imagen = nueva;
    $("vacio").hidden = true;
    restablecer();
    controles();
    mensaje("Ajusta el encuadre y busca proyectos similares.");
  } catch (error) {
    mensaje(error.message.includes("megapíxeles")
      ? error.message : "No se pudo abrir la imagen.");
  } finally {
    URL.revokeObjectURL(url);
  }
});

$("reset").onclick = () => {
  if (imagen && !ocupada) restablecer();
};

$("zoom").oninput = () => {
  if (!imagen || ocupada) return;
  const base = Math.max(canvas.width / imagen.width, canvas.height / imagen.height);
  const nueva = base * Number($("zoom").value);
  const razon = nueva / escala;
  x = canvas.width / 2 - (canvas.width / 2 - x) * razon;
  y = canvas.height / 2 - (canvas.height / 2 - y) * razon;
  escala = nueva;
  pintar();
};

canvas.onpointerdown = e => {
  if (!imagen || ocupada) return;
  drag = {x: e.clientX, y: e.clientY};
  canvas.setPointerCapture(e.pointerId);
};
canvas.onpointermove = e => {
  if (!drag || ocupada) return;
  const factor = canvas.width / canvas.getBoundingClientRect().width;
  x += (e.clientX - drag.x) * factor;
  y += (e.clientY - drag.y) * factor;
  drag = {x: e.clientX, y: e.clientY};
  pintar();
};
canvas.onpointerup = canvas.onpointercancel = () => { drag = null; };
canvas.onkeydown = e => {
  if (!imagen || ocupada) return;
  const pasos = {
    ArrowLeft: [-15, 0], ArrowRight: [15, 0],
    ArrowUp: [0, -15], ArrowDown: [0, 15]
  };
  if (pasos[e.key]) {
    e.preventDefault();
    x += pasos[e.key][0]; y += pasos[e.key][1];
    pintar();
  }
};

$("buscar").onclick = async () => {
  if (!imagen || ocupada) return;
  ocupada = true;
  drag = null;
  controles();
  $("resultados").hidden = true;
  mensaje("Comparando tu inspiración con el catálogo…");
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", .95));
    if (!blob) throw new Error("No se pudo preparar la imagen.");
    const datos = await buscarLocal(blob);

    $("galeria").replaceChildren();
    datos.forEach(item => {
      const card = document.createElement("figure");
      card.className = "card";
      const boton = document.createElement("button");
      boton.type = "button";
      boton.setAttribute("aria-label", `Ampliar resultado ${item.posicion}`);
      const foto = document.createElement("img");
      foto.src = item.imagen;
      foto.alt = `Proyecto de Barniture: ${item.archivo}`;
      foto.loading = "lazy";
      boton.append(foto);
      boton.onclick = () => {
        $("imagen-grande").src = item.imagen;
        $("imagen-grande").alt = foto.alt;
        $("nombre-grande").textContent = item.archivo;
        $("detalle").showModal();
      };
      const caption = document.createElement("figcaption");
      const titulo = document.createElement("strong");
      titulo.textContent = `#${item.posicion} · Similitud ${item.similitud.toFixed(3)}`;
      const nombre = document.createElement("span");
      nombre.textContent = item.archivo;
      caption.append(titulo, nombre);
      card.append(boton, caption);
      $("galeria").append(card);
    });
    $("conteo").textContent = `${datos.length} proyectos`;
    $("resultados").hidden = false;
    mensaje("Listo. La similitud es una puntuación, no un porcentaje de acierto.");
    $("resultados").scrollIntoView({behavior: "smooth"});
  } catch (error) {
    mensaje(error.message || "Ocurrió un error. Intenta otra vez.");
  } finally {
    ocupada = false;
    controles();
  }
};
$("cerrar").onclick = () => $("detalle").close();

const workerURL = new URL('./static/worker.js', document.baseURI);
let trabajador = null, pendiente = null;
function buscarLocal(blob) {
  return new Promise((resolve, reject) => {
    pendiente = {resolve, reject};
    if (!trabajador) {
      trabajador = new Worker(workerURL, {type:'module'});
      trabajador.onmessage = ({data}) => {
        if(data.tipo === 'progreso') mensaje(data.texto);
        if(data.tipo === 'resultado') { pendiente?.resolve(data.resultados); pendiente = null; }
        if(data.tipo === 'error') { pendiente?.reject(new Error(data.texto)); pendiente = null; }
      };
      trabajador.onerror = () => {
        pendiente?.reject(new Error('No se pudo iniciar el buscador. Comprueba tu conexión y prueba un navegador actualizado.'));
        pendiente = null; trabajador.terminate(); trabajador = null;
      };
    }
    trabajador.postMessage({blob});
  });
}
