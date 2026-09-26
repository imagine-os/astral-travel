# Learn with Maya and Pip

Astral Travel is a visual notebook for notes, ideas, and what-ifs. The guided example follows Maya as she plans a weekend workshop. Pip explains one small step at a time.

**[Open the five-step guide →](https://imagine-os.github.io/astral-travel/?lesson=1#lab)**

Maya and Pip are illustrated guides, not autonomous agents. Their workshop is fictional. No account, model key, or external research service is needed.

## Five small lessons

| Step | Try this | What it teaches |
| --- | --- | --- |
| [1. Save](https://imagine-os.github.io/astral-travel/?lesson=1#lab) | Read Maya’s message: “People keep asking what time the workshop starts.” | The original words stay intact. |
| [2. Separate](https://imagine-os.github.io/astral-travel/?lesson=2#lab) | Select Maya’s idea and follow its source links. | An interpretation stays separate and starts as a proposal. |
| [3. Connect](https://imagine-os.github.io/astral-travel/?lesson=3#lab) | Choose **Find possible connections**, inspect the two notes, then keep or dismiss the suggestion. | Shared words and tags can suggest a connection. Keeping it records an inference, not a verified fact. |
| [4. Check](https://imagine-os.github.io/astral-travel/?lesson=4#lab) | Read the scheduled question; use **Record review** after doing the check. | A question, due date, and review note help you keep track. There are no alerts or automatic web searches. |
| [5. Imagine](https://imagine-os.github.io/astral-travel/?lesson=5#lab) | Edit the prefilled what-if and choose **Create worksheet**. | Realistic and imaginative modes create thinking templates. Neither predicts an outcome or adds imagined material to the source notes. |

The initial workspace has **three memories**: two original notes and one proposed interpretation. It also has one check-later question, due a week after the example is first created. Connections and worksheets appear only after you request them.

## Your practice has its own space

The guide stores its work under `astral-travel.workspace.v0.1.lesson.workshop`. It never merges its records into personal memory or the larger example collections.

- **Exit guide** returns to the workspace, view, arrangement, selection, search, and filter you were using before practice.
- Use **Exit guide** to return to the collection switcher. Your practice changes remain saved for the next visit.
- Resetting while the guide is open resets only the lesson. It requires the existing explicit reset confirmation.
- Workspace import is disabled during practice. Export still saves a portable copy of the active practice workspace.
- Clearing browser site data removes locally saved work. Export any workspace you want to keep.

The guide opens in Cards with a Grid arrangement without changing your saved display preference. The existing 3D, tree, card, and list views remain available after you exit the guide.

## What comes later

Model-generated ideas, autonomous research, measured improvement loops, and image/audio/video memory are roadmap work. The current lessons teach saved records, source references, tag/word matching, a manual review queue, and scenario templates.

See [the roadmap](roadmap.md) and [the memory explorer](explorer.md) for the broader direction.

## Verify a change to the guide

Automated fixture coverage lives in `tests/learning-demo.test.mjs`. Run:

```bash
node --test tests/learning-demo.test.mjs
npm test
npm run check
npm run build
```

The fixture tests check original text, fictional labels, source references, independent workspace identities, one reviewable connection, and the separation between a worksheet and factual evidence.

Before publishing a guide change, check the interface:

1. Open the 96-node example, change its view, and set a search or layer filter. Start the guide and confirm that it shows the small workshop instead.
2. Follow an interpretation back to its original. Find and keep the suggested connection, then create a worksheet. Confirm that the actions need explicit clicks.
3. Exit the guide. Check that the prior example, view, selection, and filters return. Reopen the guide and confirm that its connection and worksheet remain there.
4. Exit practice, then open the 144-node example. Confirm that the example retains its own records.
5. Check direct lesson links, light and dark appearance, narrow screens, keyboard access, reset scope, and the disabled import control during practice.

These are verification instructions, not a claim that a particular browser run has passed. Record completed release checks in [verification.md](verification.md).
