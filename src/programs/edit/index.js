const __prg__edit__lines_per_screen = 18;

class PrgEdit {
	/** @type Element */
	editorEl;
	/** @type Element */
	editorLinesEl;
	/** @type Element */
	editorInfoEl;
	/** @type Element */
	editorInfoLineEl;
	filePath;
	/** @type string */
	suggestedFilePath;

	/** @type string[] */
	lines = [];

	lineSelectionMap = new Map();

	// The index of the line shown at the top of the screen.
	topLineNum = 0;
	currentLine = 0;

	async run() {
		this.editorEl = document.getElementById("editor");

		// Get file.
		const query = new URLSearchParams(window.location.search);
		this.filePath = query.get("file").trim();

		if (this.filePath) {
			const path = Common.IO.parsePath(this.filePath);

			// Read content from file if it exists.
			try {
				const content = await Messaging.post({
					instruction: "io",
					command: "read",
					args: { path },
				});
				this.lines = content.split("\n");
			} catch (error) {
				console.log("File at path not found", this.filePath);
				this.suggestedFilePath = this.filePath;
				this.filePath = "";
				this.lines = [""];
			}
		}

		this.setupEditorScreen();
		this.selectCurrentLine();
		this.registerCommands();
	}

	// MAIN EDITOR

	setupEditorScreen() {
		this.editorLinesEl = document.createElement("div");
		this.editorLinesEl.className = "editor-lines";

		this.editorInfoEl = document.createElement("div");
		this.editorInfoEl.className = "editor-info";

		this._setupEditorLines();
		this._setupEditorInfo();

		this.editorEl.appendChild(this.editorLinesEl);
		this.editorEl.appendChild(this.editorInfoEl);
	}

	_createLineContent(lineIndex) {
		const lineContent = document.createElement("div");
		lineContent.className = "editor-line-content";
		let lineText = "";
		if (this.lines.length > lineIndex) {
			lineText = this.lines[lineIndex];
		}
		lineContent.innerText = lineText;
		return lineContent;
	}

	_setupEditorLines() {
		while (this.editorLinesEl.hasChildNodes()) {
			this.editorLinesEl.firstChild.remove();
		}

		for (let i = 0; i < __prg__edit__lines_per_screen; i++) {
			const lineContainer = document.createElement("div");
			lineContainer.className = "editor-line-container";

			const lineIndex = i + this.topLineNum;

			const lineStart = document.createElement("div");
			lineStart.className = "editor-line-start";
			const lineText =
				this.lines.length > lineIndex ? this.lines[lineIndex] : "";
			lineStart.innerText = lineText.length > 48 ? "…" : "~";
			lineContainer.appendChild(lineStart);

			const lineContent = this._createLineContent(lineIndex);
			lineContainer.appendChild(lineContent);

			this.editorLinesEl.appendChild(lineContainer);
		}
	}

	_setupEditorInfo() {
		while (this.editorInfoEl.hasChildNodes()) {
			this.editorInfoEl.firstChild.remove();
		}

		// Line info.
		const lineInfoDiv = document.createElement("div");
		lineInfoDiv.className = "editor-info-line";
		const lineNum = this.currentLine + 1;
		const maxLineNum = Math.max(lineNum, this.lines.length);
		const lineNumStr = lineNum
			.toString()
			.padStart(maxLineNum.toString().length, "0");
		lineInfoDiv.innerText =
			"-- LINE " + lineNumStr + " OF " + maxLineNum + " --";
		this.editorInfoEl.append(lineInfoDiv);

		// Command info.
		const commandInfoDiv = document.createElement("div");
		commandInfoDiv.className = "editor-info-line";
		commandInfoDiv.innerText = "[^I] INFO [^X] EXIT";
		this.editorInfoEl.append(commandInfoDiv);
	}

	selectCurrentLine() {
		const lineContainer = this.editorLinesEl.children.item(
			this.currentLine - this.topLineNum
		);
		// Add selection highlight to line start.
		const lineStart = lineContainer.children.item(0);
		lineStart.className = "editor-line-start editor-line-start-selected";

		const lineIndex = this.currentLine;

		// Create input element.
		const lineInput = document.createElement("input");
		lineInput.type = "text";
		lineInput.className = "editor-line-input";
		lineInput.setAttribute("data-screen-input", "1");
		lineInput.setAttribute("data-line-index", lineIndex.toString());
		lineInput.value = this.lines[lineIndex] ?? "";
		lineInput.addEventListener("input", (e) => {
			this.writeLine(lineIndex, lineInput.value);
			lineStart.innerText = lineInput.value.length > 48 ? "…" : "~";
		});

		// Replace content element with input.
		lineContainer.children.item(1).remove();
		lineContainer.appendChild(lineInput);

		lineInput.focus();
		const selection =
			this.lineSelectionMap.get(lineIndex) ?? lineInput.value.length;
		lineInput.selectionEnd = selection;

		lineInput.addEventListener("keydown", (e) => {
			if (e.key === "ArrowUp") {
				this.changeCurrentLine(-1);
				e.preventDefault();
			} else if (e.key === "ArrowDown") {
				this.changeCurrentLine(1);
				e.preventDefault();
			} else if (e.key === "Home" && e.ctrlKey) {
				this.changeCurrentLine(-this.currentLine);
				e.preventDefault();
			} else if (e.key === "End" && e.ctrlKey) {
				this.changeCurrentLine(
					this.lines.length - this.currentLine - 1
				);
				e.preventDefault();
			} else if (
				e.key === "Backspace" &&
				lineInput.selectionEnd === 0 &&
				lineInput.selectionStart === 0 &&
				this.currentLine > 0
			) {
				// Combine this line with the previous one.
				if (this.currentLine < this.lines.length) {
					this.lines[this.currentLine - 1] +=
						this.lines[this.currentLine];
					// Splice the current line out of the array.
					this.lines.splice(this.currentLine, 1);
					// Redraw screen.
					this._setupEditorLines();
				}

				// Set cursor to previous line.
				this.changeCurrentLine(-1);
				e.preventDefault();
			} else if (e.key === "Enter") {
				if (lineInput.selectionEnd !== lineInput.selectionStart) {
					const currentLineText = this.lines[this.currentLine];
					const newLineText =
						currentLineText.substr(0, lineInput.selectionStart) +
						currentLineText.substr(lineInput.selectionEnd);

					const newSelection = lineInput.selectionStart;

					lineInput.value = newLineText;
					lineInput.selectionStart = newSelection;
					lineInput.selectionEnd = newSelection;
					this.writeLine(lineIndex, newLineText);
				}

				// Split this line into two.
				if (this.currentLine < this.lines.length) {
					const remainingText = this.lines[this.currentLine].substr(
						0,
						lineInput.selectionStart
					);
					const newLineText = this.lines[this.currentLine].substr(
						lineInput.selectionEnd
					);

					// Set the current line to the left part.
					this.lines[this.currentLine] = remainingText;
					// Insert the new line after the current one.
					this.lines.splice(this.currentLine + 1, 0, newLineText);

					this.lineSelectionMap = new Map();
					this.lineSelectionMap.set(this.currentLine + 1, 0);

					// Redraw screen.
					this._setupEditorLines();
				}

				// Set cursor to next line.
				this.changeCurrentLine(1);

				e.preventDefault();
			} else {
				this.saveInputSelection(lineIndex, lineInput);
			}
		});
	}

	writeLine(index, value) {
		while (this.lines.length <= index) {
			this.lines.push("");
		}
		this.lines[index] = value;
	}

	changeCurrentLine(change) {
		if (change === 0) {
			return;
		}
		let newCurrentLine = change + this.currentLine;
		if (newCurrentLine < 0) {
			newCurrentLine = 0;
		}

		if (newCurrentLine === this.currentLine) {
			return;
		}

		// Scroll if needed.
		let changedTopLineNum = false;
		while (
			newCurrentLine >=
			this.topLineNum + __prg__edit__lines_per_screen
		) {
			this.topLineNum++;
			changedTopLineNum = true;
		}
		while (newCurrentLine <= this.topLineNum - 1) {
			this.topLineNum--;
			changedTopLineNum = true;
		}

		if (changedTopLineNum) {
			this._setupEditorLines();
		}

		// Remove all existing line inputs and restore the content.
		const inputs = document.getElementsByTagName("input");
		for (const input of inputs) {
			if (input.hasAttribute("data-screen-input")) {
				const lineContainer = input.parentElement;
				const lineIndex = parseInt(
					input.getAttribute("data-line-index"),
					10
				);
				const lineContent = this._createLineContent(lineIndex);

				// Store the current selection.
				this.saveInputSelection(lineIndex, input);

				input.remove();
				lineContainer.appendChild(lineContent);
			}
		}

		// Unselect all line starts.
		const lineStarts = document.getElementsByClassName(
			"editor-line-start-selected"
		);
		for (const lineStart of lineStarts) {
			lineStart.className = "editor-line-start";
		}

		// Set current line.
		this.currentLine = newCurrentLine;

		this.selectCurrentLine();

		this._setupEditorInfo();
	}

	/** @param input {HTMLInputElement} */
	saveInputSelection(lineIndex, input) {
		const selection = input.selectionStart;
		this.lineSelectionMap.set(lineIndex, selection);
	}

	registerCommands() {
		document.addEventListener("keydown", (e) => {
			if (e.altKey) {
				switch (e.key) {
					case "i":
						this.showInfoPopup();
						break;
					case "x":
						this.exitEditor();
						break;
				}
			} else if (e.key === "Escape") {
				this.closePopup();
			}
		});
	}

	async exitEditor() {
		// Save file and return to CHRONUS.
		const doSave = await this.showSavePopup();

		if (this.filePath && doSave) {
			const path = Common.IO.parsePath(this.filePath);
			const fileContent = this.lines.join("\n");

			await Messaging.post({
				instruction: "io",
				command: "write",
				args: { path, contents: fileContent },
			});
		}

		Messaging.post({
			instruction: "load",
			target: "chronos",
		});
	}

	// POPUPS

	showPopup(title, popupContentEl) {
		const popupEl = document.createElement("div");
		popupEl.id = "popup";
		popupEl.className = "popup";

		const popupTitleEl = document.createElement("div");
		popupTitleEl.innerText = "===== " + title + " =====";
		popupTitleEl.className = "popup-title";
		popupEl.appendChild(popupTitleEl);

		popupContentEl.classList.add("popup-content");
		popupEl.appendChild(popupContentEl);

		// Destroy the editor.
		this.editorLinesEl.remove();
		this.editorInfoEl.remove();

		this.editorEl.appendChild(popupEl);
	}

	closePopup() {
		const popupEl = document.getElementById("popup");
		if (popupEl) {
			popupEl.remove();

			// Recreate the editor.
			this.setupEditorScreen();
			this.selectCurrentLine();
		}
	}

	showInfoPopup() {
		const contentEl = document.createElement("div");

		let infoText = "-------------------------------------------------\n\n";

		infoText += "FILE PATH  : ";
		if (this.filePath) {
			infoText += this.filePath;
		} else {
			infoText += "<NEW FILE>";
		}
		infoText += "\n";

		infoText +=
			"CHARACTERS : " +
			this.lines.join("").length +
			" (+" +
			(this.lines.length - 1) +
			")" +
			"\n";
		infoText += "LINES      : " + this.lines.length + "\n";

		infoText += "\n-------------------------------------------------\n";
		infoText += "\nPRESS ESCAPE TO RETURN";

		contentEl.innerText = infoText;
		this.showPopup("INFO", contentEl);
	}

	async showSavePopup() {
		const contentEl = document.createElement("div");

		const screenEl = document.createElement("div");
		contentEl.appendChild(screenEl);

		this.showPopup("SAVE FILE", contentEl);

		const filePathPrint = this.filePath || "<NEW FILE>";

		const screen = new SScreen(screenEl);
		await screen.print("Would you like to save changes to this file?");
		await screen.print(filePathPrint, { color: "white", speed: 40 });
		await screen.print("\n");

		const selectionSave = await screen.prompt(["YES", "NO"]);

		// Do not save.
		if (selectionSave === "NO") {
			return false;
		}

		// We do have a file path, save to it.
		if (!!this.filePath) {
			return true;
		}

		// There is no file, but the user wants to save.
		// Prompt to create a new file.

		await screen.clear();
		let askNewFile = true;
		do {
			await screen.print("SAVE NEW FILE");
			let filePath = await screen.readLine({
				prompt: "PATH",
				length: 40,
				input: this.suggestedFilePath,
			});
			const path = Common.IO.parsePath(filePath);
			filePath = Common.IO.unparsePath(path);

			// Check if they entered the path to an existing file.
			// If they did, prompt to overwrite.
			const existingObjType = await Messaging.post({
				instruction: "io",
				command: "exists",
				args: { path },
			});

			if (existingObjType === "f") {
				await screen.print("THIS FILE ALREADY EXISTS. OVERWRITE?");
				const selectionOverwrite = await screen.prompt(["YES", "NO"]);
				if (selectionOverwrite === "YES") {
					this.filePath = filePath;
					askNewFile = false;
				} else {
					await screen.clear();
				}
			} else if (existingObjType === "d") {
				await screen.clear();
				await screen.print(
					"THE SELECTED PATH IS A DIRECTORY! CANNOT SAVE."
				);
			} else {
				// Check to make sure the directory exists.
				path.pop();
				const existingObjType2 = await Messaging.post({
					instruction: "io",
					command: "exists",
					args: { path },
				});
				if (existingObjType2 !== "d") {
					await screen.clear();
					await screen.print(
						"THE SELECTED DIRECTORY DOES NOT EXIST!"
					);
				} else {
					this.filePath = filePath;
					askNewFile = false;
				}
			}
		} while (askNewFile);

		this.closePopup();

		return true;
	}
}

const __prg__edit = new PrgEdit();
__prg__edit.run();
