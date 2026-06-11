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
  
  // Update header metadata (Total Commits and Active Coding Days)
  const totalCommits = Object.values(commitsByDate).reduce((acc, curr) => acc + curr.length, 0);
  const activeCodingDays = dates.length;
  
  // Sort all dates to find the absolute latest date
  const lastDate = dates.length > 0 ? new Date(dates[dates.length - 1]) : new Date();
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

  let updated = false;

  dates.forEach(dateStr => {
    const commits = commitsByDate[dateStr];
    const dateObj = new Date(dateStr);
    const formattedDate = formatDateString(dateObj);
    const { weekNum, dayNumInWeek, totalDaysDiff } = getWeekAndDay(dateStr);
    
    let dayLabel;
    if (weekNum >= 7) {
      dayLabel = totalDaysDiff - 34;
    } else {
      dayLabel = dayNumInWeek;
    }
    
    const category = guessCategory(commits);
    const commitsList = commits.map(c => `\`${c.hash}\``).join(', ');
    
    // Format details based on commit messages
    const detailsMarkup = commits.map(c => {
      let subject = c.subject;
      const parts = subject.split(':');
      let prefix = '';
      let rest = subject;
      if (parts.length > 1 && parts[0].length < 15) {
        prefix = parts[0].trim();
        rest = parts.slice(1).join(':').trim();
      }
      if (rest) {
        rest = rest.charAt(0).toUpperCase() + rest.slice(1);
      }
      const prefixLabel = prefix ? `**${prefix}:** ` : '';
      return `  - ${prefixLabel}${rest}`;
    }).join('\n');
    
    const entryTemplate = `#### Day ${dayLabel}: ${formattedDate}
* **Category:** ${category}
* **Commits:** ${commitsList}
* **Details:**
${detailsMarkup}
`;

    // Escaped date string for regex
    const escapedDate = formattedDate.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const dayRegex = new RegExp(`#### Day (\\d+): ${escapedDate}(?:\\s+\\(Today\\))?\\r?\\n`, 'i');
    const match = journalContent.match(dayRegex);

    if (match) {
      const startIndex = match.index;
      const searchRest = journalContent.slice(startIndex + match[0].length);
      const nextHeaderMatch = searchRest.match(/\r?\n(?:#### Day|### |---)/);
      const endIndex = nextHeaderMatch ? startIndex + match[0].length + nextHeaderMatch.index : journalContent.length;
      
      const existingBlock = journalContent.slice(startIndex, endIndex);
      
      // Parse commits from existing block
      const commitsLineMatch = existingBlock.match(/\*\s+\*\*Commits:\*\*\s*(.+)/i);
      let existingHashes = [];
      if (commitsLineMatch) {
        existingHashes = (commitsLineMatch[1].match(/`[a-f0-9]+`/g) || []).map(h => h.replace(/`/g, ''));
      }
      
      const actualHashes = commits.map(c => c.hash);
      const matchAll = actualHashes.length === existingHashes.length && actualHashes.every(h => existingHashes.includes(h));
      
      if (!matchAll || existingBlock.includes('(Today)')) {
        console.log(`Updating commits/details for existing day: ${dateStr}`);
        journalContent = journalContent.slice(0, startIndex) + entryTemplate + (nextHeaderMatch ? '\n' : '') + journalContent.slice(endIndex);
        updated = true;
      }
    } else {
      console.log(`Documenting missing day: ${dateStr}`);
      
      let weekIndex = journalContent.indexOf(`Week ${weekNum}:`);
      if (weekIndex === -1) {
        const logStart = journalContent.indexOf('## 📅 Daily Log');
        if (logStart !== -1) {
          const weekHeader = `\n---\n\n### 🛡️ Week ${weekNum}: Week ${weekNum} Development\nFocus: Description of Week ${weekNum} work.\n`;
          journalContent += weekHeader + '\n' + entryTemplate;
        }
      } else {
        let nextWeekIndex = journalContent.indexOf(`### 🛡️ Week ${weekNum + 1}:`);
        if (nextWeekIndex === -1) {
          nextWeekIndex = journalContent.indexOf(`---`, weekIndex + 20);
        }
        
        if (nextWeekIndex !== -1) {
          journalContent = journalContent.slice(0, nextWeekIndex) + entryTemplate + '\n' + journalContent.slice(nextWeekIndex);
        } else {
          journalContent += '\n' + entryTemplate;
        }
      }
      updated = true;
    }
  });

  if (updated) {
    fs.writeFileSync(DAILY_JOURNAL_PATH, journalContent, 'utf8');
    console.log('Daily journal updated successfully.');
  } else {
    fs.writeFileSync(DAILY_JOURNAL_PATH, journalContent, 'utf8');
    console.log('Daily journal is up to date.');
  }
}

updateDailyJournal();
