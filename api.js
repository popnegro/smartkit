/**
 * @module api
 * Módulo para centralizar todas las llamadas a fuentes de datos.
 */
export const api = {
  /**
   * Obtiene el inventario de pantallas desde el archivo estático.
   * @returns {Promise<Array>} Una promesa que resuelve a un array de pantallas.
   */
  async getScreens() {
    const response = await fetch('/screens.json');
    if (!response.ok) {
      throw new Error('No se pudo cargar el inventario de pantallas.');
    }
    return response.json();
  }
};