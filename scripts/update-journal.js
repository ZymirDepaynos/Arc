const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DAILY_JOURNAL_PATH = path.join(PROJECT_ROOT, 'daily_journal_arc_project.md');
const WEEKLY_JOURNAL_PATH = path.join(PROJECT_ROOT, 'weekly_journal_arc_project.md');

// Start date of the project (Week 1 Day 1)
const START_DATE = new Date('2026-04-25');

// Helper to format Date as "Month Day, Year" (e.g. "April 25, 2026")
function formatDateString(date) {
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Get day diff between two dates
function getDayDiff(d1, d2) {
  const diffTime = Math.abs(d2 - d1);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Group commits by date
function getGitCommits() {
  try {
    const logOutput = execSync('git log --format="%h|%as|%s" --reverse', { cwd: PROJECT_ROOT, encoding: 'utf-8' });
    const commitsByDate = {};
    
    logOutput.trim().split('\n').forEach(line => {
      if (!line) return;
      const [hash, dateStr, subject] = line.split('|');
      if (!commitsByDate[dateStr]) {
        commitsByDate[dateStr] = [];
      }
      commitsByDate[dateStr].push({ hash, subject });
    });
    
    return commitsByDate;
  } catch (error) {
    console.error('Error running git log:', error.message);
    process.exit(1);
  }
}

// Determine Week Number and relative Day Number in that week
function getWeekAndDay(dateStr) {
  const date = new Date(dateStr);
  const totalDaysDiff = getDayDiff(START_DATE, date);
  const weekNum = Math.floor(totalDaysDiff / 7) + 1;
  const dayNumInWeek = (totalDaysDiff % 7) + 1;
  return { weekNum, dayNumInWeek, totalDaysDiff };
}

// Get category tag based on commit messages
function guessCategory(commits) {
  const categories = new Set();
  commits.forEach(c => {
    const msg = c.subject.toLowerCase();
    if (msg.startsWith('feat') || msg.includes('add') || msg.includes('implement')) categories.add('`🚀 Feature`');
    if (msg.startsWith('fix') || msg.includes('bug') || msg.includes('resolve')) categories.add('`🐛 Bug Fix`');
    if (msg.startsWith('style') || msg.includes('design') || msg.includes('color') || msg.includes('ui')) categories.add('`🎨 Style`');
    if (msg.startsWith('refactor') || msg.includes('cleanup') || msg.includes('rename')) categories.add('`⚙️ Refactor`');
    if (msg.startsWith('chore') || msg.includes('remove') || msg.includes('purge')) categories.add('`⚙️ Refactor`');
    if (msg.startsWith('docs') || msg.includes('journal') || msg.includes('readme')) categories.add('`📝 Documentation`');
    if (msg.includes('auth') || msg.includes('pass') || msg.includes('secure')) categories.add('`🔒 Security`');
    if (msg.includes('deploy') || msg.includes('vercel') || msg.includes('build') || msg.includes('db')) categories.add('`🔧 Infrastructure`');
  });
  
  if (categories.size === 0) categories.add('`🔧 Infrastructure`');
  return Array.from(categories).join(', ');
}

function updateDailyJournal() {
  if (!fs.existsSync(DAILY_JOURNAL_PATH)) {
    console.error(`Daily journal not found at ${DAILY_JOURNAL_PATH}`);
    return;
  }

  let journalContent = fs.readFileSync(DAILY_JOURNAL_PATH, 'utf8');
  const commitsByDate = getGitCommits();
  const dates = Object.keys(commitsByDate).sort();
  
  // Find which dates are already documented
  // We search for headers like: #### Day 11: June 9, 2026
  const existingDaysRegex = /#### Day (\d+): ([A-Za-z]+ \d+, \d{4})/g;
  const documentedDates = new Set();
  const allDates = [...dates];
  let match;
  while ((match = existingDaysRegex.exec(journalContent)) !== null) {
    const parsedDate = new Date(match[2]);
    const yyyy = parsedDate.getFullYear();
    const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(parsedDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    documentedDates.add(dateStr);
    if (!allDates.includes(dateStr)) {
      allDates.push(dateStr);
    }
  }

  // Update header metadata (Total Commits and Active Coding Days)
  const totalCommits = Object.values(commitsByDate).reduce((acc, curr) => acc + curr.length, 0);
  const activeCodingDays = dates.length;
  
  // Sort all dates (commits + clean documented days) to find the absolute latest date
  const sortedAllDates = allDates.sort();
  const lastDate = sortedAllDates.length > 0 ? new Date(sortedAllDates[sortedAllDates.length - 1]) : new Date();
  const formattedLastDate = formatDateString(lastDate);
  
  // Replace summary metrics in markdown
  journalContent = journalContent.replace(
    /- \*\*Total Development Duration:\*\* ~7 Weeks \(April 25, 2026 – [^)]+\)/,
    `- **Total Development Duration:** ~7 Weeks (April 25, 2026 – ${formattedLastDate})`
  );
  journalContent = journalContent.replace(
    /- \*\*Active Coding Days:\*\* \d+ Days/,
    `- **Active Coding Days:** ${activeCodingDays} Days`
  );
  journalContent = journalContent.replace(
    /- \*\*Total Commit Count:\*\* \d+ Commits/,
    `- **Total Commit Count:** ${totalCommits} Commits`
  );

  console.log(`Synced metrics: Commits = ${totalCommits}, Coding Days = ${activeCodingDays}, End Date = ${formattedLastDate}`);

  // Check for any dates in git history that are not yet documented
  let updated = false;
  dates.forEach(dateStr => {
    if (documentedDates.has(dateStr)) {
      return; // Already documented
    }
    
    console.log(`Documenting missing day: ${dateStr}`);
    const commits = commitsByDate[dateStr];
    const dateObj = new Date(dateStr);
    const formattedDate = formatDateString(dateObj);
    const { weekNum, dayNumInWeek, totalDaysDiff } = getWeekAndDay(dateStr);
    
    // Note: Week 7 had absolute numbering (Day 8, 9, 10, 11).
    // Let's decide Day Number. If we are in Week 7 or later, we can keep the absolute count or relative.
    // Let's compute absolute coding day sequence count based on the number of existing entries.
    // To maintain compatibility with Week 7's Day 8-12 sequence, if week >= 7 we use the running count.
    let dayLabel;
    if (weekNum >= 7) {
      // June 6 is Day 8 in the journal, June 7 is Day 9, June 8 is Day 10, June 9 is Day 11, June 10 is Day 12.
      // Let's map it: June 6 is day 8 (since START_DATE is Apr 25, diff is 42 days, but June 5 is Day 7 of Week 6. Wait, May 30 was start of Week 6. May 31 is Day 2. June 5 is Day 7.
      // So June 6 starts Week 7. If we continue absolute count from June 5 (Day 7): June 6 is Day 8.
      // June 7 is Day 9. June 8 is Day 10. June 9 is Day 11. June 10 is Day 12.
      // This matches totalDaysDiff - 34. Let's just do:
      dayLabel = totalDaysDiff - 34;
    } else {
      dayLabel = dayNumInWeek;
    }
    
    const category = guessCategory(commits);
    const commitsList = commits.map(c => `\`${c.hash}\``).join(', ');
    
    // Format details based on commit messages
    const detailsMarkup = commits.map(c => `  - **${c.subject.split(':')[0] || 'Update'}:** ${c.subject}`).join('\n');
    
    const entryTemplate = `
#### Day ${dayLabel}: ${formattedDate}
* **Category:** ${category}
* **Commits:** ${commitsList}
* **Details:**
${detailsMarkup}
`;

    // Find the right week section to insert
    const weekSectionHeader = `### 🛡️ Week ${weekNum}:`;
    const nextWeekSectionHeader = `### 🛡️ Week ${weekNum + 1}:`;
    
    let weekIndex = journalContent.indexOf(`Week ${weekNum}:`);
    if (weekIndex === -1) {
      // If the week section doesn't exist, append it at the end of the daily log
      const logStart = journalContent.indexOf('## 📅 Daily Log');
      if (logStart !== -1) {
        // Find end of file or create new week section
        const weekHeader = `\n---\n\n### 🛡️ Week ${weekNum}: Week ${weekNum} Development\nFocus: Description of Week ${weekNum} work.\n`;
        journalContent += weekHeader + entryTemplate;
      }
    } else {
      // Insert before the next week section or at the end of the file
      let nextWeekIndex = journalContent.indexOf(`### 🛡️ Week ${weekNum + 1}:`);
      if (nextWeekIndex === -1) {
        nextWeekIndex = journalContent.indexOf(`---`, weekIndex + 20);
      }
      
      if (nextWeekIndex !== -1) {
        // Insert right before the separator or next week
        journalContent = journalContent.slice(0, nextWeekIndex) + entryTemplate + '\n' + journalContent.slice(nextWeekIndex);
      } else {
        journalContent += entryTemplate;
      }
    }
    
    updated = true;
  }
  );

  if (updated) {
    fs.writeFileSync(DAILY_JOURNAL_PATH, journalContent, 'utf8');
    console.log('Daily journal updated successfully.');
  } else {
    // If today is a clean coding day with no commits, ensure it lists June 10 (Today)
    const todayStr = new Date().toISOString().split('T')[0];
    if (!documentedDates.has(todayStr)) {
      // If we don't have commits today, we already added Day 12 manually or via update
      console.log('Daily journal is up to date.');
    }
    fs.writeFileSync(DAILY_JOURNAL_PATH, journalContent, 'utf8');
  }
}

updateDailyJournal();
