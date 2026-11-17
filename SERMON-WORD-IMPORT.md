# Sermon Word workflow

Download templates/BOL-Sermon-Template.docx from the editor. Keep the seven uppercase section headings in order. Replace bracketed prompts; use YYYY-MM-DD dates and one of Sunday Service, Hour of Power, Thanksgiving. Save as .docx, then import in admin/sermons.html. Import reads text locally in the browser; no Word file is sent to a conversion service. Paragraphs are kept; images, formatting, headers, footnotes and list numbering are not imported. Use explicit numbering in the text when needed. The optional Google Drive PDF retains the original layout.

Import keeps the record being edited and its PDF link. Use Clear form for a new sermon. Review all fields, select Preview sermon, then Confirm & Publish. Editing fields invalidates the preview. Existing authentication and save API are unchanged. Drive permissions are controlled by the file owner, not the website; test a public PDF link while signed out.

JSZip 3.10.1 is vendored under the MIT license. DOCX size limit: 10 MB; main XML limit: 2 MB; full message limit: 100,000 characters. Required sections are validated before changing the draft. The public page shows imported text through Read message, with an optional separate PDF link.
