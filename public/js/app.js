async function buscar() {
const q = document.getElementById('q').value;
const res = await fetch(`/api/recipes?q=${encodeURIComponent(q)}`);
const data = await res.json();
const list = document.getElementById('list');
list.innerHTML = data.map(r => `
<div class="card">
<h3>${r.NOMBRE}</h3>
<p>Categoría: ${r.CATEGORIA}</p>
<p>Rendimiento: ${r.RENDIMIENTO}</p>
<p>Costo: $${r.COSTO_ESTIMADO}</p>
</div>
`).join('');
}


buscar();