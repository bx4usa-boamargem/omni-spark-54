# 🤝 Contributing to Gemini Agency Agents

First off, thank you for considering contributing! 

**CRITICAL NOTICE:** This repository is a hard-fork of the original [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) designed exclusively to act as middleware compatible with the [Google Gemini CLI](https://github.com/google-gemini/gemini-cli).

## 🛑 What We Do NOT Accept Here

**Please DO NOT submit Pull Requests to this repository for the following:**
- Adding brand new agents.
- Tweaking an agent's personality, core mission, or rules.
- Fixing typos in an agent's prompt.
- Adding new workflows or examples to an agent's memory.

The agents in this repository are **auto-generated** from the upstream submodule. Any changes you make directly to the `.md` files here will be overwritten the next time we run the conversion script.

👉 **If you want to create a new agent or improve an existing one's behavior, you MUST submit your Pull Request to the [upstream repository here](https://github.com/msitarzewski/agency-agents).** Once your PR is merged there, we will pull the submodule update and run the conversion script to bring your changes here automatically.

---

## ✅ What We DO Accept Here

We actively welcome issues and Pull Requests related to **Gemini CLI compatibility**:

1. **Improving the Conversion Script:** 
   If `convert_agents_v2.py` is failing on edge cases, missing a tool mapping, or formatting the YAML frontmatter incorrectly for Gemini CLI, we want those fixes!

2. **Gemini Tool Mapping:**
   If the upstream repository adds a new tool to an agent (e.g., `ReadDatabase`), and we need to map that to a Gemini CLI equivalent or add a specific Operational Guideline boilerplate to handle it, please submit a PR to update the `CLAUDE_TO_GEMINI_TOOLS` dictionary in the python script.

3. **Gemini CLI Agent Schema Updates:**
   If Gemini CLI updates its agent definition schema (e.g., adding a new field to the frontmatter), PRs to update the script to support those new fields are welcome.

4. **Linting and Automation:**
   Improvements to `scripts/lint-agents.sh` or our GitHub Actions workflows to better validate Gemini CLI formats.

---

## 🛠️ How to Contribute to the Conversion Logic

If you are modifying how we convert agents for Gemini CLI:

1. **Fork this repository**
2. **Create a branch**: `git checkout -b fix-conversion-logic`
3. **Modify the script**: Make your changes to `convert_agents_v2.py`.
4. **Test the script**: 
   ```bash
   python3 convert_agents_v2.py
   ./scripts/lint-agents.sh
   ```
5. **Commit**: `git commit -m "Update tool mapping for XYZ"`
6. **Push**: `git push origin fix-conversion-logic`
7. **Open a Pull Request** explaining what Gemini-specific bug or feature your change addresses.

---

## 🤔 Questions?

If you have questions about how these agents interact specifically with the Gemini CLI, or if a converted agent is throwing a tool error in Gemini, please [Open an Issue](https://github.com/adamoutler/gemini-agency-agents/issues). 

Thank you for helping keep these powerful agents functional in the Gemini ecosystem!
