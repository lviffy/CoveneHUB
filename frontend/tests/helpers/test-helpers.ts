import { Page } from '@playwright/test';

/**
 * Test Helper Functions
 * Common utilities for E2E tests
 */

export class TestHelpers {
  /**
   * Wait for network to be idle
   */
  static async waitForNetworkIdle(page: Page, timeout = 3000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Login as admin user
   */
  static async loginAsAdmin(page: Page, email: string, password: string): Promise<void> {
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(2000);
  }

  /**
   * Login as movie team member
   */
  static async loginAsMovieTeam(page: Page, email: string, password: string): Promise<void> {
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(2000);
  }

  /**
   * Login as regular user
   */
  static async loginAsUser(page: Page, email: string, password: string): Promise<void> {
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(2000);
  }

  /**
   * Logout current user
   */
  static async logout(page: Page): Promise<void> {
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
    }
  }

  /**
   * Take screenshot with name
   */
  static async takeScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({ path: `tests/screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Check if element contains text
   */
  static async elementContainsText(page: Page, selector: string, text: string): Promise<boolean> {
    const element = await page.locator(selector).textContent();
    return element?.includes(text) || false;
  }

  /**
   * Wait for API response
   */
  static async waitForAPIResponse(page: Page, urlPattern: string | RegExp, timeout = 5000): Promise<void> {
    await page.waitForResponse(
      (response) => {
        const url = response.url();
        return typeof urlPattern === 'string' 
          ? url.includes(urlPattern)
          : urlPattern.test(url);
      },
      { timeout }
    );
  }

  /**
   * Fill form with data
   */
  static async fillForm(page: Page, formData: Record<string, string>): Promise<void> {
    for (const [field, value] of Object.entries(formData)) {
      const input = page.locator(`input[name="${field}"]`).or(
        page.getByLabel(new RegExp(field, 'i'))
      );
      
      if (await input.isVisible()) {
        await input.fill(value);
      }
    }
  }

  /**
   * Get console messages
   */
  static captureConsoleLogs(page: Page): string[] {
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));
    return logs;
  }

  /**
   * Check for console errors
   */
  static captureConsoleErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  /**
   * Mock API response
   */
  static async mockAPIResponse(
    page: Page, 
    urlPattern: string | RegExp, 
    responseData: any,
    status = 200
  ): Promise<void> {
    await page.route(urlPattern, async (route) => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(responseData),
      });
    });
  }

  /**
   * Wait for element with text
   */
  static async waitForText(page: Page, text: string, timeout = 5000): Promise<void> {
    await page.getByText(text).waitFor({ timeout });
  }

  /**
   * Check if page has error
   */
  static async hasError(page: Page): Promise<boolean> {
    const errorElements = page.locator('[role="alert"]').or(
      page.locator('.error')
    ).or(
      page.getByText(/error|failed/i)
    );
    
    return await errorElements.count() > 0;
  }

  /**
   * Get page title
   */
  static async getPageTitle(page: Page): Promise<string> {
    return await page.title();
  }

  /**
   * Check if authenticated
   */
  static async isAuthenticated(page: Page): Promise<boolean> {
    // Check for profile dropdown or user menu
    const userMenu = page.locator('[data-testid="user-menu"]').or(
      page.getByRole('button', { name: /profile|account/i })
    );
    
    return await userMenu.isVisible();
  }

  /**
   * Clear local storage
   */
  static async clearStorage(page: Page): Promise<void> {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Get local storage item
   */
  static async getLocalStorageItem(page: Page, key: string): Promise<string | null> {
    return await page.evaluate((k) => localStorage.getItem(k), key);
  }

  /**
   * Set local storage item
   */
  static async setLocalStorageItem(page: Page, key: string, value: string): Promise<void> {
    await page.evaluate(
      ({ k, v }) => localStorage.setItem(k, v),
      { k: key, v: value }
    );
  }
}

/**
 * Test data generators
 */
export class TestData {
  static generateEmail(): string {
    return `test-${Date.now()}@example.com`;
  }

  static generatePhoneNumber(): string {
    return `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`;
  }

  static generateBookingCode(): string {
    return `BK${Date.now().toString().slice(-6)}`;
  }

  static generateEventTitle(): string {
    return `Test Event ${Date.now()}`;
  }

  static generateFullName(): string {
    const firstNames = ['John', 'Jane', 'Alex', 'Sam', 'Taylor'];
    const lastNames = ['Smith', 'Doe', 'Johnson', 'Williams', 'Brown'];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  }
}

/**
 * Wait utilities
 */
export class WaitHelpers {
  static async waitForPageLoad(page: Page): Promise<void> {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
  }

  static async waitForAnimation(page: Page, duration = 500): Promise<void> {
    await page.waitForTimeout(duration);
  }

  static async waitForSelector(page: Page, selector: string, timeout = 5000): Promise<void> {
    await page.locator(selector).waitFor({ timeout });
  }
}
