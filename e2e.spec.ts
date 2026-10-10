import { test, expect } from '@playwright/test';

/**
 * Acceptance criteria E2E test:
 * 1. Student submits a new project with valid GitHub and live demo links
 * 2. Submission displays private tracking link and enters PENDING state
 * 3. Project is verified as HIDDEN from the public gallery
 * 4. Admin logs in at /admin/login
 * 5. Admin reviews pending queue and approves the project
 * 6. Visitor navigates to gallery and confirms the approved project is now visible
 */
test.describe('Student Project Showcase Lifecycle', () => {
  const projectTitle = `Autonomous Drone Flight Controller ${Date.now()}`;
  const studentName = 'Sarah Jenkins & Alex Rivera';
  let trackingUrl = '';

  test('full end-to-end flow: submit -> hidden -> admin approve -> published', async ({ page }) => {
    // 1. Visit Submit Page
    await page.goto('/submit');
    await expect(page.locator('h1')).toContainText('Submit Your Project');

    // 2. Fill form
    await page.fill('#title', projectTitle);
    await page.fill('#studentName', studentName);
    await page.fill(
      '#description',
      'An autonomous PX4 companion computer autopilot framework written in Rust that executes optical flow SLAM without GPS indoors.'
    );

    // Add tags
    const tagInput = page.locator('input[placeholder*="Type tag"]');
    await tagInput.fill('rust');
    await tagInput.press('Enter');
    await tagInput.fill('robotics');
    await tagInput.press('Enter');

    // URLs (using established public endpoints)
    await page.fill('#githubUrl', 'https://github.com/facebook/react');
    await page.fill('#liveUrl', 'https://react.dev');

    // Submit form
    await page.click('button:has-text("Submit for Administrative Review")');

    // Expect "Submitted for Review" confirmation
    await expect(page.locator('h2')).toContainText('Submitted for Review');
    const tokenInput = page.locator('input[readonly]');
    await expect(tokenInput).toBeVisible();
    trackingUrl = await tokenInput.inputValue();

    // 3. Confirm Hidden From Public Gallery
    await page.goto('/');
    await page.fill('input[placeholder*="Search by title"]', projectTitle);
    // Debounce wait
    await page.waitForTimeout(500);
    // Project must NOT be visible
    await expect(page.locator(`text=${projectTitle}`)).not.toBeVisible();

    // 4. Admin Login
    await page.goto('/admin');
    await page.fill('input[type="email"]', 'admin@campuscraft.edu');
    await page.fill('input[type="password"]', 'AdminPass123!');
    await page.click('button:has-text("Sign In to Admin Queue")');

    // 5. In Admin Queue, find the project and approve it
    await expect(page.locator('h1')).toContainText('Project Moderation Portal');
    await page.click('button:has-text("Pending Review")');

    const projectRow = page.locator(`text=${projectTitle}`).locator('..').locator('..');
    await expect(projectRow).toBeVisible();

    // Click Approve
    const approveBtn = projectRow.locator('button:has-text("Approve")');
    await approveBtn.click();

    // Wait for optimistic update confirmation
    await expect(page.locator('text=Project approved successfully')).toBeVisible();

    // 6. Public Gallery Verification
    await page.goto('/');
    await page.fill('input[placeholder*="Search by title"]', projectTitle);
    await page.waitForTimeout(500);

    // CRITICAL: Now the project MUST appear in the gallery!
    await expect(page.locator(`h3:has-text("${projectTitle}")`)).toBeVisible();
    await expect(page.locator(`text=${studentName}`)).toBeVisible();
  });
});
