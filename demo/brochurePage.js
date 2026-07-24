import { expect } from '@playwright/test';

export class BrochurePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.cards = page.locator('#cards .card');
    this.firstCard = this.cards.first();
    this.firstCardTitle = this.firstCard.locator('.card-title');
    this.firstCardZone = this.firstCard.locator('.card-zone');
  }

  async goto() {
    await this.page.goto('/index.html');
  }

  async waitForLoad() {
    await expect(this.firstCard).toBeVisible();
  }

  async expectCardCount(count) {
    await expect(this.cards).toHaveCount(count);
  }

  async expectFirstCardContent(title, zone) {
    await expect(this.firstCardTitle).toHaveText(title);
    await expect(this.firstCardZone).toHaveText(zone);
  }
}