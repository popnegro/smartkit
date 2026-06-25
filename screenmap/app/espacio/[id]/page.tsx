
export default async function Page({params}:any){
const p=await params;
return <main style={{padding:24}}>
<h1>Ficha Comercial #{p.id}</h1>
<p>Galería multimedia</p>
<p>Audiencia</p>
<p>Disponibilidad</p>
<form>
<input placeholder='Nombre'/><br/>
<input placeholder='Empresa'/><br/>
<button>Solicitar propuesta</button>
</form>
</main>
}