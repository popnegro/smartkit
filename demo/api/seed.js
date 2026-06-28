const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const initialData = {
  screens: [
    { id: 'sc-01', nombre: 'Sarmiento y 9 de Julio', zona: 'Centro', tipo: 'Peatonal', impactos: 14200, precio: 95000, status: 'Activo', lat: -32.8894, lng: -68.8458, nota: 'Esquina comercial de máximo tránsito peatonal.' },
    { id: 'sc-02', nombre: 'Palmares Open Mall', zona: 'Palmares', tipo: 'Mixto', impactos: 22500, precio: 145000, status: 'Activo', lat: -32.9121, lng: -68.8306, nota: 'Acceso principal al shopping. Vehicular y peatonal.' },
    { id: 'sc-03', nombre: 'Las Heras y Mitre', zona: 'Las Heras', tipo: 'Peatonal', impactos: 8800, precio: 68000, status: 'Activo', lat: -32.8716, lng: -68.8388, nota: 'Zona comercial barrial. Alto tráfico local.' },
    { id: 'sc-04', nombre: 'Av. Aristides frente al Parque', zona: 'Ciudad', tipo: 'Vehicular', impactos: 31000, precio: 185000, status: 'Activo', lat: -32.8908, lng: -68.8762, nota: 'Avenida principal. Ideal autos y commuters.' },
    { id: 'sc-05', nombre: 'Guaymallén Centro', zona: 'Guaymallén', tipo: 'Peatonal', impactos: 11400, precio: 78000, status: 'Activo', lat: -32.8955, lng: -68.8212, nota: 'Centro comercial de Guaymallén.' },
    { id: 'sc-06', nombre: 'Maipú Ruta 7', zona: 'Maipú', tipo: 'Vehicular', impactos: 19600, precio: 112000, status: 'Activo', lat: -32.9812, lng: -68.7757, nota: 'Tránsito hacia bodegas y aeropuerto.' },
    { id: 'sc-07', nombre: 'Villanueva Gomensoro', zona: 'Las Heras', tipo: 'Mixto', impactos: 9300, precio: 72000, status: 'Activo', lat: -32.8658, lng: -68.8415, nota: 'Zona residencial-comercial en crecimiento.' },
    { id: 'sc-08', nombre: 'Godoy Cruz Belgrano', zona: 'Godoy Cruz', tipo: 'Vehicular', impactos: 25800, precio: 155000, status: 'Activo', lat: -32.9246, lng: -68.8488, nota: 'Corredor vehicular de alto volumen.' },
    { id: 'sc-09', nombre: 'Chacras de Coria Acceso', zona: 'Luján', tipo: 'Vehicular', impactos: 16700, precio: 125000, status: 'Activo', lat: -33.0158, lng: -68.8642, nota: 'Acceso a Chacras. Ideal turismo y bodegas.' },
    { id: 'sc-10', nombre: 'Terminal Buses Mendoza', zona: 'Centro', tipo: 'Peatonal', impactos: 18400, precio: 118000, status: 'Activo', lat: -32.8868, lng: -68.8284, nota: 'Alta rotación. Público diverso 24h.' },
  ],
  config: {
    brand: 'SmartKit',
    logo: 'SK',
    whatsapp: '5492616000000',
    heroTitle: 'Pantallas DOOH · Mendoza',
    terms: 'Inicio de campaña sujeto a disponibilidad y aprobación de piezas creativas. Valores expresados en ARS. Propuesta válida por 15 días.',
  },
  clients: [
    { id: 'cli-demo-1', name: 'Bodega Catena Zapata', contact: 'Laura Catena', email: 'laura@catenazapata.com', phone: '5492614555666', created_at: new Date('2026-06-20T10:00:00.000Z') },
    { id: 'cli-demo-2', name: 'Palmares Open Mall', contact: 'Marcos Galperin', email: 'marcos@palmares.com', phone: '5492614777888', created_at: new Date('2026-06-18T11:30:00.000Z') },
    { id: 'cli-demo-3', name: 'Gobierno de Mendoza', contact: 'Alfredo Cornejo', email: 'cornejo@mendoza.gov.ar', phone: '5492614999000', created_at: new Date('2026-05-15T09:00:00.000Z') },
    { id: 'cli-demo-4', name: 'Aeropuertos Argentina 2000', contact: 'Martín Eurnekian', email: 'martin@aa2000.com.ar', phone: '549114111222', created_at: new Date('2026-06-22T14:00:00.000Z') },
    { id: 'cli-demo-5', name: 'Vistalba Food Trucks', contact: 'Juan Pérez', email: 'juan@vistalbafood.com', phone: '5492614333444', created_at: new Date('2026-06-25T18:00:00.000Z') }
  ]
};

async function main() {
  console.log('Start seeding ...');

  // Usamos `upsert` para evitar duplicados si el script se corre varias veces.
  for (const screen of initialData.screens) {
    await prisma.screen.upsert({
      where: { id: screen.id },
      update: {},
      create: screen,
    });
  }
  console.log('Seeded screens.');

  await prisma.config.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, data: initialData.config },
  });
  console.log('Seeded config.');

  for (const client of initialData.clients) {
    await prisma.client.upsert({
      where: { id: client.id },
      update: {},
      create: client,
    });
  }
  console.log('Seeded clients.');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });