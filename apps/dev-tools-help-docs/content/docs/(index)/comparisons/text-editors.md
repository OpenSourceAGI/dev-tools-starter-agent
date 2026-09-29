---
title: 🖊️ Text Editors
---

Text editor frameworks offer a range of capabilities for rich text editing, each catering to different development needs. Below is a summarized table comparing key features.

## 🧩 Framework Comparison Table

| Framework       | Type                         | Output Format | Collab Features            | Ideal Use Case                 | Size      | Key Strengths                                            |
| --------------- | ---------------------------- | ------------- | -------------------------- | ------------------------------ | --------- | -------------------------------------------------------- |
| **TipTap**      | Headless (ProseMirror-based) | HTML          | Yes (via Hocuspocus/Pro)   | Custom UIs, branded editors    | \~100KB+  | Modular extensions, Vue/React support, ProseMirror power |
| **Editor.js**   | Block-style, JSON-based      | JSON          | Partial (via plugins)      | Structured CMS content         | \~200KB   | Clean JSON, plugin system, block-first design            |
| **Yank Note**   | Markdown + Code editor       | Markdown      | No                         | Programmer notes, tech docs    | Medium    | Monaco-based, code execution, plugins, charts            |
| **Outline**     | Knowledge base               | Rich HTML     | Yes                        | Org-wide knowledge management  | Large     | Collaboration, search, team spaces                       |
| **Lexical**     | React-based, headless        | Custom (Node) | Planned (partial via libs) | Lightweight enterprise editors | 22KB core | Facebook-backed, modular, fast                           |
| **Slate.js**    | React-based rich text        | HTML          | No (manual impl.)          | Deeply customizable editors    | \~80KB    | Plugin system, fine control, highly flexible             |
| **Draft.js**    | React, Immutable.js based    | HTML          | No (legacy)                | Legacy apps (archived)         | \~170KB   | Strong state mgmt, deprecated in 2023                    |
| **CKEditor 5**  | Full-featured WYSIWYG        | HTML          | Yes (Real-time, Track)     | Enterprise collaboration       | Large     | Rich plugins, AI assist, track changes                   |
| **BlockNote**   | Notion-style block editor    | HTML + JSON   | Yes (out-of-the-box)       | Notion-like apps, docs         | Medium    | ProseMirror + TipTap base, modern UX                     |
| **Quill.js**    | Delta-based RTE              | Delta (JSON)  | Partial (via libs)         | Collaborative documents        | \~100KB   | Change tracking, mature, Delta ops                       |
| **ProseMirror** | Core toolkit                 | HTML          | No (needs wrappers)        | Framework building blocks      | Varies    | Very powerful, high complexity                           |

## 🔍 Key Insights

* **Customization vs. Out-of-the-box**: TipTap, Slate, and Lexical favor flexibility; CKEditor 5 and BlockNote offer batteries-included.
* **Best for Structured Data**: Editor.js and Quill.js excel with JSON/Delta formats.
* **Performance Leaders**: Lexical (22KB), Slate.js (\~80KB) beat legacy Draft.js in size and speed.
* **AI & Collaboration Trends**: TipTap Pro, CKEditor 5, and Yank Note add AI and real-time tools.

## 🎯 Use Case Summary

| Use Case                   | Recommended Framework | Notes                                      |
| -------------------------- | --------------------- | ------------------------------------------ |
| Custom Design Systems      | **TipTap**            | Headless, flexible UI                      |
| Structured CMS Content     | **Editor.js**         | JSON-first block model                     |
| Technical Docs & Markdown  | **Yank Note**         | Monaco editor, code support                |
| Knowledge Management       | **Outline**           | Collaboration, search, team docs           |
| Notion-like Experiences    | **BlockNote**         | Block-based UI, fast start                 |
| Enterprise Collaboration   | **CKEditor 5**        | Real-time editing, track changes, comments |
| Lightweight Performance    | **Lexical**           | Fast, scalable, modular                    |
| Deep Customization (React) | **Slate.js**          | Plugin-first, high flexibility             |
