/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// Cargar el script compartido en el entorno de prueba de JSDOM para que `window.SmartKitShared` esté disponible.
const sharedJsPath = path.resolve(__dirname, 'shared.js');
const sharedJsCode = fs.readFileSync(sharedJsPath, 'utf8');
eval(sharedJsCode);

describe('SmartKitShared', () => {
  
  describe('formatMoney', () => {
    it('debería formatear un número como moneda ARS', () => {
      const { formatMoney } = window.SmartKitShared;
      expect(formatMoney(12345.67)).toBe('$12.346');
    });

    it('debería manejar valores nulos o cero', () => {
      const { formatMoney } = window.SmartKitShared;
      expect(formatMoney(0)).toBe('$0');
      expect(formatMoney(null)).toBe('$0');
    });
  });

  describe('kitSlug', () => {
    it('debería convertir un texto a un slug amigable para URL', () => {
      const { kitSlug } = window.SmartKitShared;
      expect(kitSlug('Propuesta para Cliente A')).toBe('propuesta-para-cliente-a');
    });
  });

});