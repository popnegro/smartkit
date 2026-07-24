import { expect } from '@playwright/test';

export class DashboardPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.screenRows = page.locator('#screen-tbody tr');
  }

  async goto() {
    await this.page.goto('/dashboard.html');
  }

  async waitForLoad() {
    await expect(this.screenRows.first()).toBeVisible();
  }

  async expectScreenRowCount(count) {
    await expect(this.screenRows).toHaveCount(count);
  }
}