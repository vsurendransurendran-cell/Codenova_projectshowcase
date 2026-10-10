# CampusCraft - Interactive Demo & Walkthrough Guide

This walkthrough provides step-by-step instructions for demonstrating and verifying both the **Student Submitter** and **Administrator Moderator** workflows.

---

## 🎯 Flow A: Student Project Submission & Live Link Validation

### 1. Explore Public Gallery
1. Navigate to the Home page (`/`).
2. Notice the live approved projects grid (e.g., *NeuralTrace*, *KubePebble*, *EchoGraph*).
3. In the search box, type `Postgres` or `Rust`. The grid reactively filters without reloading the page.
4. Click on a technology tag chip (e.g., `#machine-learning` or `#distributed-systems`). Notice the URL query updates to `?tags=...` for shareability.
5. Click **"View Overview"** on any project card to open the modal with full project descriptions and GitHub/Demo links.

### 2. Submit a New Project
1. Click the primary **"Submit Project"** button in the header (`/submit`).
2. Try clicking **"Submit for Administrative Review"** with empty fields. Notice clean, field-specific inline validation messages.
3. Fill in the form:
   - **Project Title:** `AeroVision: Micro-UAV Optical Collision Avoidance`
   - **Author / Team:** `Marcus Vance & Priya Sharma (Robotics Institute)`
   - **Description:** `A real-time monocular visual odometry framework running at 60 FPS on edge ARM hardware, detecting dynamic obstacles and recalculating spline trajectories in indoor settings.`
   - **Technologies:** Type `rust`, press Enter; type `robotics`, press Enter; type `computer-vision`, press Enter.
   - **GitHub Repository:** `https://github.com/facebook/react` *(or your student public repo)*
   - **Live Demo URL:** `https://react.dev` *(must be HTTPS)*
4. Click **"Submit for Administrative Review"**.
5. Observe the button enter the state:
   > *"Verifying repository & live demo links..."*
   During this step, the server conducts:
   - Regex validation on the GitHub repository structure
   - GitHub API/HEAD verification confirming the repo exists and is public
   - HTTPS enforcement on the demo URL
   - Strict DNS resolution with SSRF blocking against private/internal IP ranges (`127.0.0.1`, `10.x`, `172.16-31.x`, `192.168.x`, `169.254.x`)
   - HTTP response verification (`< 400`) within 5-second timeout
6. On success, the **"Submitted for Review!"** screen appears:
   - Displays project title and confirmation that status is initially **PENDING**.
   - Generates a private 64-hex tracking token and URL (`/status/[token]`).
   - Click **"Copy Link"** to copy the tracking link.

### 3. Check Submission Status (Student Experience)
1. Click **"View Tracking Page"** or visit the copied URL.
2. The page displays the submission with an amber badge:
   > **Status: In Review (Pending)**
   > *"Your submission has been safely recorded and queued for administrative review."*
3. Notice that navigating back to the public gallery and searching for `AeroVision` yields **no results**. The unapproved project remains hidden from public queries (`where: { status: 'APPROVED' }`).

---

## 🛡️ Flow B: Moderator Review & Approval Workflow

### 1. Admin Authentication
1. Click the shield icon in the navigation bar or visit `/admin/login`.
2. Enter the seed admin credentials:
   - **Email:** `admin@campuscraft.edu`
   - **Password:** `AdminPass123!`
3. Click **"Sign In to Admin Queue"**.
4. The server validates credentials using constant-time bcrypt verification and issues a secure `httpOnly`, `SameSite=Lax` session cookie.

### 2. Moderation Queue & Review Drawer
1. On the **Admin Moderation Portal** (`/admin`), note the real-time counters:
   - **Pending Review:** 4 (including the newly submitted `AeroVision`)
   - **Approved:** 8
   - **Rejected:** 1
2. Find `AeroVision: Micro-UAV Optical Collision Avoidance` in the Pending queue.
3. Click **"Review"** to open the Moderator Drawer:
   - View author, timestamp, full description, and tags.
   - Inspect the **Submitter IP Hash** (privacy-preserved SHA-256 hash).
   - Inspect the **Tracking Token**.
   - Click **"Re-verify URLs Now"**: the server re-tests both the GitHub repository and demo URL live, reporting green checkmarks with latency and resolved IP status.
4. Click **"Approve & Feature in Gallery"**:
   - The project immediately transitions with an optimistic update.
   - Status is updated to `APPROVED`, recording the reviewer's ID and timestamp.
   - An immutable record is created in the `AdminAction` audit trail.

### 3. Public Verification
1. Return to the Public Gallery (`/`).
2. Search for `AeroVision`.
3. The project is now **publicly visible in the gallery card grid**, complete with code and demo links!
4. Return to the student's status tracking page (`/status/[token]`).
5. Refresh the page: the badge now displays a green **"Approved & Published"** status with a direct button to view the live project card.

---

## 🚫 Flow C: Rejection with Required Feedback

1. In the Admin Queue, select a pending submission or test item.
2. Click **"Reject"**:
   - A modal requires specifying a constructive reason (minimum 5 characters).
   - Enter: *"Repository is missing setup instructions and license."*
   - Confirm decline.
3. Inspect the student tracking page for that token:
   - Displays a red **"Requires Revision / Declined"** status.
   - Displays the moderator's exact feedback so the student can revise their project.
4. Click on the **"Audit Trail"** tab in the Admin Portal to view the full log of review activities.
