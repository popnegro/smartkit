const SCREENS=[
  {id:1,lat:-32.8931,lng:-68.8449,n:'Peatonal Sarmiento',b:'Microcentro',dir:'Peatonal Sarmiento 150',dim:'8x4 m',res:'Full HD',imp:'52.000',precio:95000,tipo:'Peatonal',e:'PS',g:'linear-gradient(135deg,#075985,#0f766e)',video:'./assets/videos/peatonal-sarmiento.mp4'},
  {id:2,lat:-32.8890,lng:-68.8442,n:'San Martin & Belgrano',b:'Microcentro',dir:'Av. San Martin 600',dim:'6x3 m',res:'Full HD',imp:'38.000',precio:80000,tipo:'Vehicular',e:'SB',g:'linear-gradient(135deg,#0f766e,#14532d)',video:'./assets/videos/sarmiento-y-belgrano.mp4'},
  {id:3,lat:-32.8908,lng:-68.8388,n:'Plaza Independencia',b:'Microcentro',dir:'Plaza Independencia Este',dim:'10x5 m',res:'4K UHD',imp:'68.000',precio:140000,tipo:'Mixto',e:'PI',g:'linear-gradient(135deg,#0369a1,#4f46e5)',video:'./assets/videos/plaza-independencia.mp4'},
  {id:4,lat:-32.8866,lng:-68.8328,n:'Terminal de Omnibus',b:'Microcentro',dir:'Av. G. Videla s/n',dim:'5x2.5 m',res:'Full HD',imp:'29.000',precio:65000,tipo:'Peatonal',e:'TO',g:'linear-gradient(135deg,#164e63,#0f766e)',video:'./assets/videos/chacras.mp4'},
  {id:5,lat:-32.8831,lng:-68.8358,n:'Av. Las Heras & Espana',b:'Microcentro',dir:'Av. Las Heras 800',dim:'6x3 m',res:'Full HD',imp:'33.000',precio:72000,tipo:'Vehicular',e:'LH',g:'linear-gradient(135deg,#92400e,#075985)',video:'./assets/videos/maipu.mp4'},
  {id:6,lat:-32.8950,lng:-68.8410,n:'Av. Colon & Catamarca',b:'Microcentro',dir:'Av. Colon 1200',dim:'4x2 m',res:'HD Ready',imp:'21.000',precio:55000,tipo:'Vehicular',e:'CC',g:'linear-gradient(135deg,#075985,#334155)',video:'./assets/videos/palmares.mp4'},
  {id:7,lat:-32.8532,lng:-68.8344,n:'Palmares Open Mall',b:'Las Heras',dir:'Acceso Norte km 8',dim:'12x6 m',res:'4K UHD',imp:'75.000',precio:165000,tipo:'Mixto',e:'PO',g:'linear-gradient(135deg,#0f766e,#0369a1)',video:'./assets/videos/palmares.mp4'},
  {id:8,lat:-32.8590,lng:-68.8390,n:'Las Heras Centro',b:'Las Heras',dir:'Av. Mitre 400',dim:'5x2.5 m',res:'Full HD',imp:'18.000',precio:48000,tipo:'Peatonal',e:'LH',g:'linear-gradient(135deg,#075985,#0f766e)',video:'./assets/videos/peatonal-sarmiento.mp4'},
  {id:9,lat:-32.8650,lng:-68.8310,n:'Av. Viamonte Norte',b:'Las Heras',dir:'Av. Viamonte 2000',dim:'6x3 m',res:'Full HD',imp:'24.000',precio:58000,tipo:'Vehicular',e:'VN',g:'linear-gradient(135deg,#92400e,#164e63)',video:'./assets/videos/plaza-independencia.mp4'},
  {id:10,lat:-32.9183,lng:-68.8397,n:'Godoy Cruz Centro',b:'Godoy Cruz',dir:'Av. San Martin 3500',dim:'6x3 m',res:'Full HD',imp:'31.000',precio:70000,tipo:'Vehicular',e:'GC',g:'linear-gradient(135deg,#075985,#0f766e)',video:'./assets/videos/sarmiento-y-belgrano.mp4'},
  {id:11,lat:-32.9092,lng:-68.8411,n:'Estadio Malvinas Argentinas',b:'Godoy Cruz',dir:'Irigoyen 8151',dim:'8x4 m',res:'Full HD',imp:'44.000',precio:92000,tipo:'Mixto',e:'EM',g:'linear-gradient(135deg,#4f46e5,#075985)',video:'./assets/videos/palmares.mp4'},
  {id:12,lat:-32.9150,lng:-68.8450,n:'Boulogne Sur Mer',b:'Godoy Cruz',dir:'Av. Boulogne Sur Mer 1500',dim:'4x2 m',res:'HD Ready',imp:'19.000',precio:52000,tipo:'Vehicular',e:'BM',g:'linear-gradient(135deg,#334155,#075985)',video:'./assets/videos/chacras.mp4'},
  {id:13,lat:-32.8894,lng:-68.8094,n:'Mendoza Plaza Shopping',b:'Guaymallen',dir:'Acceso Este 3280',dim:'10x5 m',res:'4K UHD',imp:'72.000',precio:158000,tipo:'Mixto',e:'MP',g:'linear-gradient(135deg,#0369a1,#0f766e)',video:'./assets/videos/plaza-independencia.mp4'},
  {id:14,lat:-32.8775,lng:-68.7900,n:'Acceso Este km 5',b:'Guaymallen',dir:'Ruta Nacional 7 km 5',dim:'8x4 m',res:'Full HD',imp:'58.000',precio:110000,tipo:'Vehicular',e:'AE',g:'linear-gradient(135deg,#92400e,#075985)',video:'./assets/videos/sarmiento-y-belgrano.mp4'},
  {id:15,lat:-32.8820,lng:-68.8150,n:'Acceso Este & Olascoaga',b:'Guaymallen',dir:'Av. Acceso Este 1500',dim:'6x3 m',res:'Full HD',imp:'35.000',precio:76000,tipo:'Vehicular',e:'AO',g:'linear-gradient(135deg,#164e63,#92400e)',video:'./assets/videos/maipu.mp4'},
  {id:16,lat:-32.9500,lng:-68.7950,n:'Maipu Centro',b:'Maipu',dir:'Av. Urquiza 1200',dim:'5x2.5 m',res:'Full HD',imp:'16.000',precio:44000,tipo:'Mixto',e:'MC',g:'linear-gradient(135deg,#166534,#075985)',video:'./assets/videos/maipu.mp4'},
  {id:17,lat:-32.9600,lng:-68.7750,n:'Ruta 7 Maipu',b:'Maipu',dir:'Ruta Nacional 7 km 15',dim:'8x4 m',res:'Full HD',imp:'42.000',precio:88000,tipo:'Vehicular',e:'R7',g:'linear-gradient(135deg,#92400e,#334155)',video:'./assets/videos/maipu.mp4'},
  {id:18,lat:-32.9700,lng:-68.8600,n:'Lujan de Cuyo Centro',b:'Lujan de Cuyo',dir:'Av. San Martin 1100',dim:'5x2.5 m',res:'Full HD',imp:'14.000',precio:40000,tipo:'Mixto',e:'LC',g:'linear-gradient(135deg,#166534,#0f766e)',video:'./assets/videos/chacras.mp4'},
  {id:19,lat:-32.9500,lng:-68.8500,n:'Carrodilla Lujan',b:'Lujan de Cuyo',dir:'Ruta Provincial 15 km 3',dim:'6x3 m',res:'Full HD',imp:'22.000',precio:60000,tipo:'Vehicular',e:'CL',g:'linear-gradient(135deg,#0f766e,#334155)',video:'./assets/videos/chacras.mp4'},
  {id:20,lat:-32.8300,lng:-68.8200,n:'Acceso Norte Ruta 40',b:'Las Heras Norte',dir:'Ruta Nacional 40 km 1085',dim:'10x5 m',res:'4K UHD',imp:'55.000',precio:120000,tipo:'Mixto',e:'AN',g:'linear-gradient(135deg,#075985,#92400e)',video:'./assets/videos/palmares.mp4'}
];

const DURATIONS=[
  {v:'1s',l:'1 semana',mult:1,days:7},
  {v:'2s',l:'2 semanas',mult:1.8,days:14},
  {v:'1m',l:'1 mes',mult:3.2,days:30},
  {v:'3m',l:'3 meses',mult:8,days:90}
];

const TIPO_COL={
  Peatonal:'#0891b2',
  Vehicular:'#b45309',
  Mixto:'#4f46e5'
};

const METRICS={
  market:'Gran Mendoza',
  currency:'ARS'
};

function impNum(screen){
  return parseInt(String(screen.imp || screen || '0').replace(/\./g,''),10) || 0;
}
