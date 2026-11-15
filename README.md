# Beacon of Light Christian Fellowship Center Vienna

A static, multi-page church website. It runs directly in a browser and has no build step or package dependencies.

## Pages

- index.html — redesigned home, 100-question Bible trivia and daily verse
- about.html — church story and community
- calendar.html — two-month and annual calendar views with birthdays, church celebrations and this week’s milestones
- bible-study.html — proposed 2026–2027 curriculum
- hour-of-power.html — youth fellowship page, including the Books We Read section
- digital-book.html redirects old bookmarks to Hour of Power → Books We Read
- celebrations.html redirects older bookmarks to the celebrations section of the calendar
- daily-quotes.html, sermons.html, chess.html, gallery.html, contact.html — existing church features

The 100 trivia questions are kept in bible-questions.js. A correct answer earns 10 points. The best score is saved in that visitor’s browser.

## Color options

Use the theme buttons in the top navigation to preview **Midnight & Gold** or **Olive & Clay**. The selection is saved in the visitor’s browser and follows them across the pages.

## Vercel

The public pages are static. Put the site files at the root of the GitHub repository, import that repository in Vercel, choose the **Other** framework preset, leave the build and install commands empty, and set the output directory to dot. The sermon editor uses one Vercel serverless endpoint and protected environment variables; the public site pages do not need those settings to be viewed.

## Content to confirm before launch

- The Bible Study page is a proposed September 2026–August 2027 curriculum for ministry review.
- The Thursday 8:00 PM Bible Study and last-Saturday 6:30 PM Revival Prayer timings came from the supplied Youth Space draft. Confirm the current schedule and online link.
- Add or verify the church’s address, Sunday service time, contact details and any calendar changes before publishing.

## Sermon publishing

- Published sermon records are stored in `sermons-data.js` in the website repository. This uses the same repository that contains the site; no separate sermon database or media-storage service is required.
- Church editors use `admin/sermons.html` to sign in, add or edit a title, date, speaker, Bible passage, service type, summary and full sermon text, then choose **Save & Publish**. The sermon page shows published records to all visitors.
- The editor writes through the Vercel serverless endpoint in `api/sermons.js`. The GitHub token and editor password must be added as protected Vercel environment variables; they are never placed in the public page files.
- Before editors can publish, connect the Vercel project to the same GitHub repository and set these Vercel environment variables:
  - `SERMON_ADMIN_PASSWORD` — a private password at least 16 characters long for the church editors.
  - `SERMON_SESSION_SECRET` — a random secret with at least 32 characters to sign the private editor session.
  - `SERMON_GITHUB_TOKEN` — a fine-grained GitHub token restricted to this repository, with Contents read and write access.
  - `SERMON_GITHUB_OWNER` and `SERMON_GITHUB_REPO` — optional if Vercel provides `VERCEL_GIT_REPO_OWNER` and `VERCEL_GIT_REPO_SLUG` for the connected project.
  - `SERMON_GITHUB_BRANCH` — optional; defaults to `main`. Set it to the branch that Vercel publishes.
- GitHub saves a content-file change. Vercel must be configured to deploy changes to that branch for the live sermon page to refresh automatically. A newly saved sermon appears after that deployment finishes.
- The existing sample records contain summaries only. The editor lets an authorized editor add their full sermon text when updating a record.

## Gallery storage

The Gallery page’s current upload form saves selected photos in the visitor’s browser storage. Those uploads are not shared with other visitors and are not stored in the live site’s file storage. The photos already in the images folder are part of the site package. Shared gallery uploads still need a separate shared media-storage decision.