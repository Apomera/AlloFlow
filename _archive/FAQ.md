# AlloFlow FAQ
## Common Questions from Teachers, Administrators, and IT

---

## General Questions

### What is AlloFlow?
AlloFlow is an open-source educational platform that combines AI content generation, gamified learning, and accessibility tools into a single application. It's designed to help teachers differentiate instruction without requiring multiple subscriptions.

### Is it really free?
Yes. AlloFlow is licensed under AGPL v3 (the same license used by Linux). There are no subscription fees, no per-seat licensing, no "premium tier," and no hidden costs. The code is publicly available on GitHub.

### What's the catch?
There isn't one in the traditional sense. The project is maintained by educators who believe differentiation tools should be accessible to all schools, regardless of budget. The only "ask" is that if you improve the code, you share those improvements with the community (per the AGPL license).

### Who made this?
AlloFlow was created by Aaron Pomeranz, PsyD, a school psychologist in Maine. It's maintained as an open-source project with contributions from a growing community.

---

## For Teachers

### How do I get started?
1. Open the Gemini Canvas link (or your district's self-hosted URL)
2. Paste any text (article, chapter, etc.)
3. Click "Generate Resource Pack" for a complete lesson, or use individual tools
4. Explore!

### Do my students need accounts?
No. Students join live sessions using a 4-character code and pick a codename. No email, no password, no personal information required.

### Can I use it offline?
Yes! Export any lesson as an HTML bundle. Students can open it in their browser without internet—perfect for homework or locations with unreliable connectivity.

### What subjects does it work for?
Any subject with text content: ELA, Science, Social Studies, Math (word problems). The STEM Lab specifically handles 10 math/science disciplines with equation rendering.

### Is it aligned to standards?
The Standards Finder tool searches CCSS, NGSS, TEKS, and other frameworks. You can also generate alignment reports and AI consultation on how to address specific standards.

### Can I edit what the AI generates?
Yes. Every generated resource has an "Edit" mode. You can modify text, add items, remove items, and refine before presenting to students.

---

## For Administrators

### How does this compare to tools we already pay for?
AlloFlow provides functionality equivalent to:
- Diffit/Newsela (text leveling)
- Kahoot/Quizizz (gamified assessment)
- Nearpod (interactive lessons)
- Read&Write (accessibility)
- Amira/Literably (oral fluency assessment)
- MagicSchool (AI content generation)

Combined, these typically cost $20,000-30,000/year per school site.

### Is it FERPA compliant?
Yes. AlloFlow is designed with privacy-by-architecture:
- No student accounts required
- **Gemini Canvas version:** Data is saved/loaded as JSON files ("sneakernet"); no persistent database
- **Firebase-hosted version:** Data is stored locally in the browser via IndexedDB
- No PII transmitted to external servers
- Optional cloud sync (Firebase version only) requires explicit consent and displays FERPA warnings

### Can our IT department host it?
Yes. AlloFlow can be deployed as a single HTML file on any web server—including internal servers, Google Cloud, Azure, AWS, or a simple Apache/nginx instance.

### What happens if the developer disappears?
The code is on GitHub under AGPL. Any organization can fork it, maintain it, and continue development. That's the entire point of open-source licensing.

### Is there training available?
Yes. The developer offers:
- 30-minute virtual onboarding for individual teachers
- 90-minute professional development sessions for schools
- Train-the-trainer programs for districts
- Written documentation and video walkthroughs

---

## For IT / Technology Directors

### What's the architecture?
AlloFlow is a single-file React application. The entire app—including all styling, logic, and assets—is contained in one HTML file (~5MB). It runs entirely client-side.

### What backend does it need?
For basic use: none.
- **On Gemini Canvas:** Data is saved/loaded as JSON files to your hard drive
- **On Firebase Hosting:** Data is stored in the browser's IndexedDB

For live session features: Firebase (optional) for real-time sync.

For AI generation: Gemini API calls are made directly from the client.

### How do we self-host?
1. Download the HTML file
2. Place it on any web server
3. Configure CORS if needed
4. Done

No Docker, no databases, no backend services required.

### What about the Gemini API?
The app uses Gemini 2.5 Flash for content generation. When hosted via Gemini Canvas, API access is automatic. For self-hosted deployments, teachers can input their own API keys or the district can configure a shared key.

### Is it secure?
- No sensitive data is transmitted to AlloFlow servers (there are no AlloFlow servers)
- AI prompts are sent to Google's Gemini API with HTTPS
- All student data stays local unless explicitly exported
- The code is open for security auditing

### What browsers are supported?
Modern versions of Chrome, Firefox, Safari, and Edge. IE11 is not supported.

---

## For Students

### How do I join my teacher's lesson?
1. Go to the link your teacher shares
2. Type in the 4-letter code (like "ABCD")
3. Pick a fun codename
4. You're in!

### What's XP?
XP (experience points) is what you earn when you get questions right or complete activities. Earn enough XP to level up and unlock cool stuff in the shop!

### Can I use it at home?
Yes! If your teacher gives you an HTML file or a link, you can open it at home. Some features work even without internet.

### Why does it look different from what my teacher shows?
Your teacher might be in "Teacher Mode" which shows extra controls and answer keys. You're in "Student Mode" which shows just what you need.

---

## Troubleshooting

### The AI is generating slowly
- Check your internet connection
- Gemini API may be experiencing high load—wait and try again
- For very long texts, try generating one resource at a time

### Audio isn't playing
- Check browser audio permissions
- Try a different browser
- Check volume settings
- Some voices may not be available on all platforms

### My project won't save
- If using the Canvas version, export as JSON file (this is the default)
- If using the Firebase-hosted version, check browser storage permissions — IndexedDB may be full
- Try exporting as JSON file for portable backup

### The app looks broken / styles are missing
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Try a different browser

### Live session code isn't working
- Check that you're using capital letters
- Make sure the session is still active
- Ask your teacher to confirm the code

---

## Contact & Support

**Email:** aaron.pomeranz@maine.edu  
**GitHub Issues:** https://github.com/Apomera/AlloFlow/issues  
**Documentation:** [Link to User Manual]

---

*Didn't find your answer? Email us—we respond within 48 hours.*
