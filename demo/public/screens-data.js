const SCREENS=[
  {id:1,lat:-32.8931,lng:-68.8449,n:'Peatonal Sarmiento',b:'Microcentro',dir:'Peatonal Sarmiento 150',dim:'8x4 m',res:'Full HD',imp:'52.000',precio:95000,tipo:'Peatonal',e:'PS',g:'linear-gradient(135deg,#075985,#0f766e)',video:'./assets/videos/peatonal-sarmiento.mp4', provider: 'SmartKit'},
  {id:2,lat:-32.8890,lng:-68.8442,n:'San Martin & Belgrano',b:'Microcentro',dir:'Av. San Martin 600',dim:'6x3 m',res:'Full HD',imp:'38.000',precio:80000,tipo:'Vehicular',e:'SB',g:'linear-gradient(135deg,#0f766e,#14532d)',video:'./assets/videos/sarmiento-y-belgrano.mp4'},
  {id:3,lat:-32.8908,lng:-68.8388,n:'Plaza Independencia',b:'Microcentro',dir:'Plaza Independencia Este',dim:'10x5 m',res:'4K UHD',imp:'68.000',precio:140000,tipo:'Mixto',e:'PI',g:'linear-gradient(135deg,#0369a1,#4f46e5)',video:'./assets/videos/plaza-independencia.mp4'},
  {id:4,lat:-32.8866,lng:-68.8328,n:'Terminal de Omnibus',b:'Microcentro',dir:'Av. G. Videla s/n',dim:'5x2.5 m',res:'Full HD',imp:'29.000',precio:65000,tipo:'Peatonal',e:'TO',g:'linear-gradient(135deg,#164e63,#0f766e)',video:'./assets/videos/chacras.mp4'},
  {id:5,lat:-32.8831,lng:-68.8358,n:'Av. Las Heras & Espana',b:'Microcentro',dir:'Av. Las Heras 800',dim:'6x3 m',res:'Full HD',imp:'33.000',precio:72000,tipo:'Vehicular',e:'LH',g:'linear-gradient(135deg,#92400e,#075985)',video:'./assets/videos/maipu.mp4'},
  {id:6,lat:-32.8950,lng:-68.8410,n:'Av. Colon & Catamarca',b:'Microcentro',dir:'Av. Colon 1200',dim:'4x2 m',res:'HD Ready',imp:'21.000',precio:55000,tipo:'Vehicular',e:'CC',g:'linear-gradient(135deg,#075985,#334155)',video:'./assets/videos/palmares.mp4'},
  {id:7,lat:-32.8532,lng:-68.8344,n:'Palmares Open Mall',b:'Las Heras',dir:'Acceso Norte km 8',dim:'12x6 m',res:'4K UHD',imp:'75.000',precio:165000,tipo:'Mixto',e:'PO',g:'linear-gradient(135deg,#0f766e,#0369a1)',video:'./assets/videos/palmares.mp4'},
  {id:10,lat:-32.9183,lng:-68.8397,n:'Godoy Cruz Centro',b:'Godoy Cruz',dir:'Av. San Martin 3500',dim:'6x3 m',res:'Full HD',imp:'31.000',precio:70000,tipo:'Vehicular',e:'GC',g:'linear-gradient(135deg,#075985,#0f766e)',video:'./assets/videos/sarmiento-y-belgrano.mp4'},
  {id:13,lat:-32.8894,lng:-68.8094,n:'Mendoza Plaza Shopping',b:'Guaymallen',dir:'Acceso Este 3280',dim:'10x5 m',res:'4K UHD',imp:'72.000',precio:158000,tipo:'Mixto',e:'MP',g:'linear-gradient(135deg,#0369a1,#0f766e)',video:'./assets/videos/plaza-independencia.mp4'},
  {id:16,lat:-32.9500,lng:-68.7950,n:'Maipu Centro',b:'Maipu',dir:'Av. Urquiza 1200',dim:'5x2.5 m',res:'Full HD',imp:'16.000',precio:44000,tipo:'Mixto',e:'MC',g:'linear-gradient(135deg,#166534,#075985)',video:'./assets/videos/maipu.mp4'},
  {id:18,lat:-32.9700,lng:-68.8600,n:'Lujan de Cuyo Centro',b:'Lujan de Cuyo',dir:'Av. San Martin 1100',dim:'5x2.5 m',res:'Full HD',imp:'14.000',precio:40000,tipo:'Mixto',e:'LC',g:'linear-gradient(135deg,#166534,#0f766e)',video:'./assets/videos/chacras.mp4'}
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