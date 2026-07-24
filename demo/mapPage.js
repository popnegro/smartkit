import { expect } from '@playwright/test';

export class MapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.markers = page.locator('.leaflet-marker-icon');
  }

  async goto() {
    await this.page.goto('/map.html');
  }

  async waitForLoad() {
    await expect(this.markers.first()).toBeVisible();
  }

  async expectMarkerCount(count) {
    await expect(this.markers).toHaveCount(count);
  }
}