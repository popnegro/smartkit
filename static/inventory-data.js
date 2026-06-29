/* ══════════════════════════════════════════════
   inventory-data.js — Inventario DOOH Mendoza
═══════════════════════════════════════════════ */
const SCREENS = [
  {id:'sc-01',nombre:'Sarmiento y 9 de Julio',zona:'Centro',tipo:'Peatonal',impactos:14200,precio:95000,status:'Activo',lat:-32.8894,lng:-68.8458,nota:'Esquina comercial de máximo tránsito peatonal.'},
  {id:'sc-02',nombre:'Palmares Open Mall',zona:'Palmares',tipo:'Mixto',impactos:22500,precio:145000,status:'Activo',lat:-32.9121,lng:-68.8306,nota:'Acceso principal al shopping. Vehicular y peatonal.'},
  {id:'sc-03',nombre:'Las Heras y Mitre',zona:'Las Heras',tipo:'Peatonal',impactos:8800,precio:68000,status:'Activo',lat:-32.8716,lng:-68.8388,nota:'Zona comercial barrial. Alto tráfico local.'},
  {id:'sc-04',nombre:'Av. Aristides frente al Parque',zona:'Ciudad',tipo:'Vehicular',impactos:31000,precio:185000,status:'Activo',lat:-32.8908,lng:-68.8762,nota:'Avenida principal. Ideal autos y commuters.'},
  {id:'sc-05',nombre:'Guaymallén Centro',zona:'Guaymallén',tipo:'Peatonal',impactos:11400,precio:78000,status:'Activo',lat:-32.8955,lng:-68.8212,nota:'Centro comercial de Guaymallén.'},
  {id:'sc-06',nombre:'Maipú Ruta 7',zona:'Maipú',tipo:'Vehicular',impactos:19600,precio:112000,status:'Activo',lat:-32.9812,lng:-68.7757,nota:'Tránsito hacia bodegas y aeropuerto.'},
  {id:'sc-07',nombre:'Villanueva Gomensoro',zona:'Las Heras',tipo:'Mixto',impactos:9300,precio:72000,status:'Activo',lat:-32.8658,lng:-68.8415,nota:'Zona residencial-comercial en crecimiento.'},
  {id:'sc-08',nombre:'Godoy Cruz Belgrano',zona:'Godoy Cruz',tipo:'Vehicular',impactos:25800,precio:155000,status:'Activo',lat:-32.9246,lng:-68.8488,nota:'Corredor vehicular de alto volumen.'},
  {id:'sc-09',nombre:'Chacras de Coria Acceso',zona:'Luján',tipo:'Vehicular',impactos:16700,precio:125000,status:'Activo',lat:-33.0158,lng:-68.8642,nota:'Acceso a Chacras. Ideal turismo y bodegas.'},
  {id:'sc-10',nombre:'Terminal Buses Mendoza',zona:'Centro',tipo:'Peatonal',impactos:18400,precio:118000,status:'Activo',lat:-32.8868,lng:-68.8284,nota:'Alta rotación. Público diverso 24h.'},
];