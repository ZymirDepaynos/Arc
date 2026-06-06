# Arc Project - Daily Development Journal
**Timeline: April – June 2026**

This journal provides a detailed, day-by-day record of the Arc Debt Tracker project development, mapping all system updates, layout changes, database migrations, and security features from the initial commit to the current state.

---

## 📊 Development Summary
- **Total Development Duration:** ~7 Weeks (April 25, 2026 – June 6, 2026)
- **Active Coding Days:** 20 Days
- **Total Commit Count:** 98 Commits
- **Key Modules Developed:**
  - 🏠 [Dashboard.jsx](file:///C:/Users/Zymir/OneDrive/Desktop/Bakla romel/Arc/frontend/src/pages/Dashboard.jsx) - Main stats, customer lists, pagination, filters, and activity feed.
  - 👤 [CustomerDetail.jsx](file:///C:/Users/Zymir/OneDrive/Desktop/Bakla romel/Arc/frontend/src/pages/CustomerDetail.jsx) - Individual ledger, purchase timelines, export tools, and payments.
  - 📅 [CalendarView.jsx](file:///C:/Users/Zymir/OneDrive/Desktop/Bakla romel/Arc/frontend/src/pages/CalendarView.jsx) - Monthly calendar tracker displaying recent settlements.
  - 🔒 [PasswordModal.jsx](file:///C:/Users/Zymir/OneDrive/Desktop/Bakla romel/Arc/frontend/src/components/PasswordModal.jsx) & [SettingsModal.jsx](file:///C:/Users/Zymir/OneDrive/Desktop/Bakla romel/Arc/frontend/src/components/SettingsModal.jsx) - Encryption gates and credential management.

---

## 📅 Daily Log

### 🛠️ Week 1: Foundation & Initial Deployment (Apr 25 – May 1)
Focus: Establishing repository structure, setting up the Vercel deployment pipeline, implementing customer rebranding, and handling bulk imports.

#### Day 1: April 25, 2026
* **Category:** `🔧 Infrastructure`, `🐛 Bug Fix`
* **Commits:** `7d2ec0c`, `37cf44d`, `4d3fbd6`, `8854df2`, `25e833a`, `13cde4e`, `920cf2e`, `d32ea26`, `64bee3b`, `56f102c`
* **Details:**
  - Initial clean workspace setup.
  - Resolved Vercel deployment challenges by migrating the API directory to the root directory for Serverless Function compatibility.
  - Added root [vercel.json](file:///C:/Users/Zymir/OneDrive/Desktop/Bakla romel/Arc/vercel.json) configuration mapping routes to the serverless entrypoint.
  - Rebuilt package lock files to lock native Linux bindings, ensuring successful dependencies resolution on Vercel build servers.
  - Added safety checks in the router to catch unexpected middleware database connection failures.

#### Day 3: April 27, 2026
* **Category:** `🚀 Feature`, `🎨 Style`, `🐛 Bug Fix`
* **Commits:** `bd2d5ee`, `5052dba`, `4c45fa3`, `06f102c`, `de60b61`, `5bf3b99`, `a5e9350`
* **Details:**
  - **Rebranding:** Completed a codebase-wide rebranding from "Debtors" to "Customers" to modernize interface terminology.
  - **Global History:** Implemented global history transaction feeds.
  - **Navigation Update:** Added a dynamic history button to the desktop [Navbar.jsx](file:///C:/Users/Zymir/OneDrive/Desktop/Bakla romel/Arc/frontend/src/components/Navbar.jsx) header.
  - **Due Dates:** Removed deprecated "Due Date" fields from database schemas and forms to simplify tracking.
  - **CSV Performance:** Optimized memory footprint during large CSV data exports.
  - **API Payload:** Configured Express API payloads to allow up to 10MB limits, preventing crashes on bulk inserts. Renamed the bulk import endpoint to `/import-all` to prevent routing collisions.

#### Day 6: April 30, 2026
* **Category:** `🚀 Feature`, `🐛 Bug Fix`
* **Commits:** `c89350b`
* **Details:**
  - Implemented automatic deductions for advance payments on initial profile setups.
  - Added backend date validations to verify transaction dates do not precede the purchase registration date.
  - Added support for recording custom payment dates.
  - Implemented permanent deletion options for user timeline histories.
  - Created standardized CSV templates for fast importing.

---

### 📈 Week 2: Advanced Math & Visual Refinement (May 2 – May 8)
Focus: Original debt integration, advanced date validation, decimal layout fixes, and custom search filters.

#### Day 2: May 3, 2026
* **Category:** `🚀 Feature`, `🐛 Bug Fix`, `🎨 Style`
* **Commits:** `aae86a4`, `2618b59`, `da4348a`
* **Details:**
  - **Original Debt:** Added `original_debt` field tracking to capture the total initial debt separately from running balances.
  - **Number Input Stability:** Prevented scroll wheel events from modifying numeric values in forms.
  - **Validation & Math:** Resolved rounding and decimal representation errors in calculations. Locked initial balance editing once profile creation completes.
  - **UI/UX Reorganization:** Redesigned customer detail edit layouts to show linked calculation inputs clearly.

#### Day 6: May 7, 2026
* **Category:** `🚀 Feature`, `🎨 Style`
* **Commits:** `64b20ff`
* **Details:**
  - Implemented advanced date-range filtering on the main dashboard transaction records.
  - Made styling enhancements to search tabs and dashboard buttons for better contrast.

#### Day 7: May 8, 2026
* **Category:** `🚀 Feature`, `🐛 Bug Fix`
* **Commits:** `6cf6b8a`
* **Details:**
  - Refined the transaction audit logging helper.
  - Fixed button click interactions inside modal forms.
  - Added validation prompts to prevent setting advance payment dates before purchase dates.

---

### 🎨 Week 3: Bug Squashing & Fallback Routing (May 9 – May 15)
Focus: Resolving routing failures, UI rendering bugs, and search filter inconsistencies.

#### Day 6: May 14, 2026
* **Category:** `🐛 Bug Fix`, `🎨 Style`
* **Commits:** `c559c17`
* **Details:**
  - Fixed an SPA routing bug on Vercel causing 404 errors when reloading customer-specific details directly.
  - Resolved front-end search logic bugs to handle spaces and casing.
  - Improved timeline styling to visually separate audit logs from payment actions.

---

### 📊 Week 4: PDF Reporting & Fine-Grained Adjustments (May 16 – May 22)
Focus: Overhauling Statement of Account PDF layout, manual ledger adjustments, color themes, and transaction deletions.

#### Day 1: May 16, 2026
* **Category:** `🚀 Feature`, `🐛 Bug Fix`, `🔧 Infrastructure`
* **Commits:** `4f5652a`, `9b95ced`, `741adf8`, `5e431f0`, `1490b13`, `e9ba754`
* **Details:**
  - **Manual Adjustments:** Implemented manual ledger adjustment options with distinct activity tags.
  - **Adjust Endpoint:** Created a dedicated `/adjust` backend route to update ledger statuses.
  - **Profile Updates Tab:** Created a "Profile Updates" tab under Customer Detail to house manual audit histories.
  - **Date Picker Restoration:** Restored the native calendar date picker in forms.

#### Day 2: May 17, 2026
* **Category:** `🐛 Bug Fix`
* **Commits:** `999def5`, `57994ab`
* **Details:**
  - Resolved front-end calendar crashes when payment lists contained null or undefined amounts.
  - Fixed active dashboard filters to dynamically recalculate summary counters.
  - Improved notification toast displays for quick user action confirmations.

#### Day 3: May 18, 2026
* **Category:** `🚀 Feature`, `🎨 Style`
* **Commits:** `3cf6397`
* **Details:**
  - Enabled direct inline editing of individual history entries in the timeline.
  - Standardized Statement of Account (SOA) data arrays before triggering pdfmake exports.

#### Day 4: May 19, 2026
* **Category:** `🚀 Feature`, `🎨 Style`, `🐛 Bug Fix`
* **Commits:** `941b01a`, `d17d577`, `e044510`, `353fb0b`, `06865ea`, `7bea134`, `294e0b4`, `04fb330`, `32db82b`, `0887934`
* **Details:**
  - **PDF Theme Overhaul:** Redesigned both the Arc Business Report and individual SOA exports to use a sleek peach/terracotta aesthetic.
  - **Layout Fixes:** Widened table row indices to 13mm to prevent wrapping issues on 3-digit rows.
  - **Label Changes:** Changed "Total Outstanding" to "Overall Pay Total" inside business logs to match expectations.
  - **Granular Deletion:** Added individual timeline entry deletion routes.
  - **Strict Search:** Introduced an exact-match search toggle to let users search for specific customers without partial matching.
  - **Responsive Grids:** Adjusted table columns to prevent squishing on lower-resolution screens.

---

### 🎨 Week 5: Layout Polishing & PDF Customization (May 23 – May 29)
Focus: Landscape PDF conversions, component renaming, form improvements, and timezone offsets.

#### Day 1: May 23, 2026
* **Category:** `🚀 Feature`, `🎨 Style`, `🐛 Bug Fix`
* **Commits:** `6db1bdb`, `3f88d74`, `53fe3cc`, `0e67cb0`, `b7ffe2c`
* **Details:**
  - Added support for year-only and month+year searches inside the date filters.
  - Redesigned the customer PDF layout to a landscape format with navy headers and summary boxes.
  - Removed "Customer Since" fields to reduce detail header bloat.
  - Secured chronological timeline displays by sorting recent activities first.

#### Day 2: May 24, 2026
* **Category:** `🎨 Style`, `⚙️ Refactor`
* **Commits:** `3e937b9`, `4ebff37`
* **Details:**
  - Replaced the multi-field "Key Dates" interface with a single "Purchase Date" field.
  - Refactored Supabase connection hooks to export constants cleanly and removed redundant debug logs.

#### Day 4: May 26, 2026
* **Category:** `🚀 Feature`, `🐛 Bug Fix`, `⚙️ Refactor`
* **Commits:** `27f16a8`, `70b052a`, `8d3729a`
* **Details:**
  - **Purchased Items Save:** Resolved an issue where typed items in the purchase list were lost if the form was submitted without hitting Enter first. Inputs are now flushed automatically on blur and submit.
  - **Removal of Adjust Balance:** Fully removed the unused manual balance adjustments from all views and routers.
  - **Refactoring:** Renamed `DebtorDetail.jsx` component and path to `CustomerDetail.jsx` to match core branding.

#### Day 5: May 27, 2026
* **Category:** `🚀 Feature`, `🎨 Style`, `🐛 Bug Fix`
* **Commits:** `c4cfc7b`, `2ee9710`, `081a3fc`, `7b801ea`, `ffb1adb`, `d8907ce`, `5d61b79`, `9702829`, `d8b53fc`
* **Details:**
  - **Export Alignment:** Standardized PDF reports to match the revised layout mockups (added negative number signs and running ledger balances).
  - **Aesthetics:** Styled monetary amounts and activity notes using primary color tags; increased font sizing for timeline notes.
  - **Delete button styling:** Updated deletion triggers to solid red boxes with white text.
  - **Timezone correction:** Resolved a timezone mapping bug where late-night payments registered on the previous calendar day.

---

### 🔒 Week 6: Security, Refinement & Layout Overhaul (May 30 – June 4)
Focus: Password gating critical actions, alphabetizing lists, Supabase data migration, and responsive component adaptations.

#### Day 2: May 31, 2026
* **Category:** `🐛 Bug Fix`, `🚀 Feature`
* **Commits:** `fbf1cc6`, `4c72069`
* **Details:**
  - Added input locks block key characters (`e`, `+`, `-`, `.`) from numeric input panels to enforce integer-only ledger values.
  - Dropped "Advance Payment Date" inputs across application layouts and export schemas to prevent database conflicts.

#### Day 3: June 1, 2026
* **Category:** `🚀 Feature`, `🔒 Security`, `🐛 Bug Fix`
* **Commits:** `9d28ab3`, `244bf54`
* **Details:**
  - **Password Gate:** Integrated security password protection screens on customer modification and deletion events.
  - **Auto-Settling:** Automated status updates to settle customer accounts when the balance drops to exactly zero.
  - **Settings Modal:** Built a secure application control Settings Modal to manage environment behaviors.

#### Day 4: June 2, 2026
* **Category:** `🚀 Feature`
* **Commits:** `899cb63`, `fe05f30`, `75c7bfd`
* **Details:**
  - Configured CSV and PDF lists to output alphabetically.
  - Limited Calendar View activity logs to a sliding 7-day scale based on original submission timestamps.

#### Day 5: June 3, 2026
* **Category:** `🚀 Feature`, `🔒 Security`, `🐛 Bug Fix`, `🎨 Style`
* **Commits:** `3905f23`, `a86cd7d`, `3925e11`, `f82f1b4`, `c95029b`, `2e6a4f1`, `53e2961`, `2a3181f`, `d135175`, `87a4159`, `905495a`, `5a61006`, `dc44a71`, `6a3ff0f`, `73ae1d3`
* **Details:**
  - **Database Migration:** Moved user passwords and application logs from configuration files to a secure Supabase `settings` database table.
  - **Enhanced Security Gates:** Extended the password verification prompts to protect new customer entries, total settlement overrides, and timeline log updates. Deferred password checks on edit actions until final submission.
  - **Layout Overhaul & Squeeze Prevention:**
    - Designed and implemented a responsive 3-dot dropdown action menu for screen widths below 1300px to prevent control overlap.
    - Prevented dashboard buttons from compressing into narrow shapes under tight resolutions.
    - Restored full badge texts after testing dot-only statuses.
  - **Validation Guardrails:** Blocked attempts to record payments exceeding current unpaid balances. Disabled submits when payment fields remain unchanged.

#### Day 6: June 4, 2026
* **Category:** `⚙️ Refactor`, `🔧 Infrastructure`, `🐛 Bug Fix`, `🎨 Style`
* **Commits:** `2576ce7`, `c2a2acc`, `9eb9289`, `d320d1d`, `d8ade16`, `d8f37f6`, `0365b55`, `f719bd8`, `731ae1d`, `7084e38`, `be231e7`, `22bfa5c`, `95e6192`, `ee3fed0`
* **Details:**
  - **Database & Route Cleanup:** Fully removed unused `due_date` and `advance_payment_date` database column references from all API routes (`api/routes/debtors.js`, `backend/routes/debtors.js`) and frontend components.
  - **Codebase Modernization:** Removed legacy mobile view components (`MobileNav.jsx`, `Navbar.jsx`, `Sidebar.jsx`, `SearchBar.jsx`, `StatusBadge.jsx`) and their styling declarations to establish a clean tablet/desktop design system.
  - **Unification of Utility Formatter:** Created a central formatter library [format.js](file:///C:/Users/Zymir/OneDrive/Desktop/Bakla romel/Arc/frontend/src/utils/format.js) to standardize currency, dates, and statuses across the application; added a unified `computeStatus` helper.
  - **jsPDF Export encoding fix:** Replaced UTF-8 Peso signs with plain letter "P" inside individual and business report PDF export routes to resolve document generation encoding crashes.
  - **Layout Wrap & Render Fixes:**
    - Restored the missing `CalendarIcon` import in `CalendarView.jsx` preventing page rendering.
    - Prevented top-bar components wrapping on narrow views by enforcing inline `flexWrap: nowrap`.
    - Removed `display: revert` from `hide-mobile` utility to prevent flexbox container compression.
  - **Housekeeping:** Removed deprecated database seeding scripts (`seed_customers.js`) and temporary root backup files.

#### Day 7: June 5, 2026
* **Category:** `🔍 Verification`, `📝 Documentation`
* **Commits:** None (Working tree clean)
* **Details:**
  - Performed comprehensive system validation testing across both light and dark modes.
  - Inspected the Supabase database migrations to ensure table schema consistency.

#### Day 8: June 6, 2026 (Today)
* **Category:** `📝 Documentation`
* **Commits:** None (Working tree clean)
* **Details:**
  - Updated the Daily Development Journal and Weekly Journal to match the actual commit logs and codebase improvements.
