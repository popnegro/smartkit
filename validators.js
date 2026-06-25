const { z } = require('zod');

// Schema para la validación de una pantalla (Screen)
const screenSchema = z.object({
  id: z.number().int().positive().optional(), // ID es opcional para creación, pero se espera para actualización
  n: z.string().min(1, "El nombre de la pantalla es requerido."), // Nombre
  e: z.string().min(1, "El identificador corto es requerido."), // Identificador corto (ej. "A1")
  dir: z.string().min(1, "La dirección es requerida."), // Dirección
  b: z.string().min(1, "La zona es requerida."), // Barrio/Zona
  tipo: z.enum(['Peatonal', 'Vehicular', 'Mixto'], "Tipo de pantalla inválido."), // Tipo de tránsito
  imp: z.string().regex(/^\d+(\.\d+)?k?$/, "Impactos deben ser un número o 'Xk'").transform(val => {
    if (val.endsWith('k')) return parseFloat(val) * 1000;
    return parseFloat(val);
  }).pipe(z.number().int().positive()), // Impactos/día
  precio: z.number().int().positive("El precio debe ser un número positivo."), // Precio por semana
  dim: z.string().min(1, "Las dimensiones son requeridas."), // Dimensiones
  res: z.string().min(1, "La resolución es requerida."), // Resolución
  lat: z.number().min(-90).max(90, "Latitud inválida."), // Latitud
  lng: z.number().min(-180).max(180, "Longitud inválida."), // Longitud
  video: z.string().url("URL de video inválida.").optional().or(z.literal('')), // URL del video
  g: z.string().min(1, "El color de fondo es requerido.").optional().or(z.literal('')), // Color de fondo (gradient)
  status: z.enum(['Activo', 'Pausado', 'Archivado'], "Estado de pantalla inválido.").default('Activo'), // Estado de la pantalla
});

// Schema para la validación de un Media Kit
const mediaKitSchema = z.object({
  id: z.string().min(1, "El ID del kit es requerido."),
  client: z.string().min(1, "El nombre del cliente es requerido."),
  contact: z.string().min(1, "El contacto es requerido."),
  duration: z.string().min(1, "La duración es requerida."),
  durationValue: z.string().min(1, "El valor de duración es requerido."),
  days: z.number().int().positive("Los días deben ser un número positivo."),
  screenIds: z.array(z.number().int().positive()),
  screenSnapshots: z.array(z.any()), // Podría ser más específico si se define un schema para ScreenSnapshot
  screens: z.number().int().positive("El número de pantallas debe ser positivo."),
  total: z.number().positive("El total debe ser positivo."),
  impacts: z.number().positive("Los impactos deben ser positivos."),
  cpm: z.number().positive("El CPM debe ser positivo."),
  status: z.enum(['Borrador', 'Publicado', 'Archivado']),
  createdAt: z.string().datetime("Fecha de creación inválida."),
  validUntil: z.string().datetime("Fecha de validez inválida."),
  validity: z.string().min(1, "La validez es requerida."),
  executiveSummary: z.string().min(1, "El resumen ejecutivo es requerido."),
  nextSteps: z.array(z.string()),
  terms: z.string().min(1, "Los términos son requeridos."),
  brand: z.object({
    name: z.string(),
    logo: z.string().url().optional().or(z.literal('')),
    whatsapp: z.string().optional().or(z.literal('')),
  }),
  digitalSignature: z.string().min(1, "La firma digital es requerida."),
});

module.exports = {
  screenSchema,
  mediaKitSchema,
};