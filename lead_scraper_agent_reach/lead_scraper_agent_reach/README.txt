═════════════════════════════════════════════════════════════
  🚀 LEAD SCRAPER WITH AGENT-REACH
═════════════════════════════════════════════════════════════

✅ STEP 1: Install Python Packages
────────────────────────────────────
Open Command Prompt in this folder and run:

  pip install -r requirements.txt

Wait for it to finish. ✅


✅ STEP 2: Install Agent-Reach (OPTIONAL but RECOMMENDED)
──────────────────────────────────────────────────────────
(This makes web scraping much better)

Open Command Prompt and paste:

  git clone https://github.com/Panniantong/Agent-Reach.git
  cd Agent-Reach
  pip install https://github.com/Panniantong/Agent-Reach/archive/main.zip
  agent-reach install --env=auto

Then check it works:
  agent-reach doctor

(Should show ✅ for Jina Reader and Exa)


✅ STEP 3: Edit Your Search Query (OPTIONAL)
─────────────────────────────────────────────
Open scraper.py in Notepad.

Find line 30:
  SEARCH_QUERY  = "education institutes in Bhopal"

Change it to what you want:
  SEARCH_QUERY  = "coaching classes in Bhopal"

Save the file.


✅ STEP 4: RUN THE SCRAPER!
──────────────────────────
Open Command Prompt in this folder and run:

  python scraper.py

Or with custom query (no need to edit):

  python scraper.py coaching classes in Bhopal


✅ STEP 5: Open Your Results
───────────────────────────
When done, open:
  leads_output.xlsx

It will have:
  - Website Name
  - Email Address(es)
  - Phone Number(s)
  - Description
  - And more!


═════════════════════════════════════════════════════════════
  TROUBLESHOOTING
═════════════════════════════════════════════════════════════

❌ "Python not found"
→ Download Python from https://python.org
→ When installing, CHECK the box "Add Python to PATH"

❌ "git is not recognized"
→ Download Git from https://git-scm.com

❌ "ModuleNotFoundError: No module named 'exa_py'"
→ Run: pip install -r requirements.txt

❌ Script finds 0 results
→ Try a different search query
→ Or manually paste URLs when it asks


═════════════════════════════════════════════════════════════
  QUICK REFERENCE
═════════════════════════════════════════════════════════════

# Install packages
pip install -r requirements.txt

# Run scraper
python scraper.py

# Run with custom search
python scraper.py your search query

# Check system status
agent-reach doctor


═════════════════════════════════════════════════════════════
That's it! 🚀
═════════════════════════════════════════════════════════════
