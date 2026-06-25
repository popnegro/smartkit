
import spots from '../data/spots.json'
export default function Home(){
return <main style={{padding:24}}>
<h1>Marketplace de Cartelería Mendoza</h1>
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
{spots.map((s:any)=><a key={s.id} href={`/espacio/${s.id}`} style={{border:'1px solid #ddd',padding:12}}>
<h3>{s.nombre}</h3><p>{s.tipo}</p><p>{s.zona}</p><p>{s.precio}</p>
</a>)}
</div>
</main>
}