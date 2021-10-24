class SScreen {
	/**
	 * The main screen element.
	 */
	$el;

	/**
	 * When the screen is muted, it doesn't print any output,
	 * cannot read input and doesn't wait.
	 */
	isMuted = false;

	/**
	 * @param {HTMLElement} $el The main "screen" element to be used for this screen.
	 */
	constructor($el) {
		this.$el = $el;
		this._startAutoscroll();
	}

	/**
	 * Sets up the autoscrolling of lines on the screen
	 * when the height doesn't fit all lines on screen anymore.
	 */
	_startAutoscroll() {
		setInterval(() => {
			if (this.$el.scrollTop < this.$el.scrollHeight) {
				this.$el.scrollTop += 12;
			}
		}, 10);
	}

	_addSection() {
		const section = document.createElement("div");
		section.setAttribute("data-screen-section", "1");
		this.$el.appendChild(section);
		return section;
	}

	_getCurrentSection() {
		if (!this.$el.hasChildNodes()) {
			return this._addSection();
		}

		return this.$el.lastChild;
	}

	/**
	 * @param {boolean} inline Whether or not the output element will be append in the current line.
	 */
	_createOutputElement(inline, color) {
		const outputEl = inline
			? document.createElement("span")
			: document.createElement("div");
		outputEl.className = "screen-output";
		outputEl.className += " screen-output-color-" + color;
		outputEl.setAttribute("data-screen-output", "1");
		return outputEl;
	}

	print(text, options = {}) {
		// On mute we cannot print.
		if (this.isMuted) {
			return;
		}

		let printSpeed = options["speed"] ?? 15;
		const inline = options["inline"] ?? false;
		const instant = options["instant"] ?? false;
		const color = options["color"] ?? "green";

		return new Promise((resolve) => {
			let charIndex = 0;
			const outputSection = this._getCurrentSection();

			// For "instant" mode, set printSpeed to 0, which executes the interval right away.
			// Also advance the index to the end of the text, to print it all immediately.
			if (instant) {
				charIndex = text.length;
				printSpeed = 0;
			}

			const outputEl = this._createOutputElement(inline, color);
			outputSection.appendChild(outputEl);

			// Start printing interval animation.
			const printInterval = setInterval(() => {
				charIndex++;
				let printText = text.substr(0, charIndex);
				// Append caret during printing.
				if (charIndex < text.length) {
					printText += "▓";
				}
				outputEl.innerText = printText;

				// Clear interval when text is fully printed to screen.
				if (charIndex >= text.length) {
					clearInterval(printInterval);
					resolve();
				}
			}, printSpeed);
		});
	}

	/**
	 * Clears all sections from the screen to empty it entirely.
	 */
	clear() {
		// Only clear when not muted.
		if (this.isMuted) {
			return;
		}

		while (this.$el.hasChildNodes()) {
			this.$el.firstChild.remove();
		}
	}

	/**
	 * Clears the current section of the screen.
	 */
	clearSection(inputSection = null) {
		const section = inputSection ?? this._getCurrentSection();
		while (section.hasChildNodes()) {
			section.firstChild.remove();
		}
	}

	_getReadLineNum(lineIndex) {
		return ((lineIndex + 1) * 10).toString().padStart(3, " ") + " ";
	}

	/**
	 * Reads a single line from the screen.
	 * ONLY USE WITH `readLine` or `read`.
	 *
	 * @returns {Promise<string>}
	 */
	_readLine(options = {}) {
		const length = options["length"] ?? 45;
		const password = options["password"] ?? false;

		return new Promise(async (resolve) => {
			// Create an "input" element to read text from until the user presses "Enter".
			const lineReader = document.createElement("input");
			lineReader.autocomplete = "off";
			lineReader.setAttribute("data-screen-input", "1");
			lineReader.setAttribute("data-screen-reader", "1");
			lineReader.className = "screen-input";
			lineReader.type = "text";
			lineReader.maxLength = length;
			lineReader.style.width = length * 12.5 + "px";

			// Add the input to the current screen section.
			const section = this._getCurrentSection();
			section.appendChild(lineReader);
			// Focus it so the user can type.
			lineReader.focus();

			lineReader.addEventListener("keydown", (e) => {
				// When the user presses "Enter" remove the input,
				// render the input to the screen instead, and return the line.
				if (e.key == "Enter") {
					let line = e.target.value;
					line = line.toUpperCase().trim();

					lineReader.remove();
					const lineText = password ? "*".repeat(line.length) : line;
					this.print(lineText, { inline: true, instant: true });
					// Append new line.
					this.print("", { instant: true });

					resolve(line);
				}
			});
		});
	}

	/**
	 * Reads a single line from the the screen.
	 */
	readLine(options = {}) {
		// On mute we cannot read.
		if (this.isMuted) {
			return "";
		}

		const cleanup = options["cleanup"] ?? false;
		const prompt = options["prompt"] ?? "";
		const length = options["length"] ?? 45;
		const password = options["password"] ?? false;

		// Create new section for the read operation.
		this._addSection();

		return new Promise(async (resolve) => {
			// Print ":" prompt char.
			await this.print(prompt + ": ", { speed: 15, inline: true });

			const line = await this._readLine({ length, password });

			if (cleanup) {
				this.clearSection();
			}

			resolve(line);
		});
	}

	/**
	 * Allows reading a multiline input from the screen.
	 * @param {string[]} input Starts the input with these lines.
	 */
	read(input = [], options = {}) {
		// On mute we cannot read.
		if (this.isMuted) {
			return [];
		}

		const readLines = input;

		// Create new section for the read operation.
		const section = this._addSection();

		return new Promise(async (resolve) => {
			// First, print all received input to the screen.
			for (let i = 0; i < readLines.length; i++) {
				const line = readLines[i];

				const lineNumStr = this._getReadLineNum(i);
				await this.print(lineNumStr + line, { speed: 15 });
			}

			// Current line input.
			let line = null;
			do {
				// Print the current line's line number inline.
				const lineNumStr = this._getReadLineNum(readLines.length);
				await this.print(lineNumStr, { speed: 15, inline: true });

				line = await this._readLine();

				switch (line) {
					case "RUN":
						resolve(readLines);
						break;

					case "CLEAR":
						while (readLines.length > 0) {
							readLines.pop();
						}
						this.clearSection(section);
						break;

					default:
						readLines.push(line);
						break;
				}
			} while (
				// When the "RUN" command is issued alone, end the input.
				line != "RUN"
			);
		});
	}

	_getPromptOptionText(index, option) {
		return " " + (index + 1) + ": " + option.toUpperCase().trim() + " ";
	}

	/**
	 * Prompts the user to select one of the provided selections.
	 *
	 * @param {string[]} selections
	 */
	prompt(selections = [], options = {}) {
		const initialIndex = options["initial"] ?? 0;
		const withIndex = options["with-index"] ?? false;

		// When prompted on mute, return the initial selected option.
		if (this.isMuted) {
			if (withIndex) {
				return {
					index: initialIndex,
					option: selections[initialIndex],
				};
			} else {
				return selections[initialIndex];
			}
		}

		// Create new section for the prompt operation.
		const section = this._addSection();

		return new Promise(async (resolve) => {
			// First, render the selections as text to the screen for the animation.
			for (let i = 0; i < selections.length; i++) {
				const option = selections[i];
				await this.print(this._getPromptOptionText(i, option), {
					speed: 5,
				});
			}

			// Then, clear the section and show the actual selections.
			this.clearSection(section);

			const container = document.createElement("div");
			container.setAttribute("data-screen-input", "1");
			container.setAttribute("data-screen-prompt", "1");
			container.className = "screen-prompt";
			container.tabIndex = "0";

			// Render selections to the screen.
			for (let i = 0; i < selections.length; i++) {
				const option = selections[i];

				const optionDiv = document.createElement("div");
				optionDiv.className =
					i == initialIndex ? "screen-prompt-selected" : "";
				const optionDivInner = document.createElement("span");
				optionDivInner.innerHTML = this._getPromptOptionText(i, option);
				optionDiv.appendChild(optionDivInner);

				container.appendChild(optionDiv);
			}

			// Add prompt container to new section and focus.
			section.appendChild(container);
			container.focus();

			let selectedIndex = initialIndex;
			container.addEventListener("keydown", (e) => {
				switch (e.key) {
					case "ArrowUp":
						selectedIndex--;
						if (selectedIndex == -1) {
							selectedIndex = selections.length - 1;
						}
						break;

					case "ArrowDown":
						selectedIndex++;
						if (selectedIndex == selections.length) {
							selectedIndex = 0;
						}
						break;

					case "Enter":
						// Remove container's input attribute so it cannot be focused anymore.
						container.removeAttribute("data-screen-input");
						// Resolve prompt with selection on enter.
						if (withIndex) {
							resolve({
								option: selections[selectedIndex],
								index: selectedIndex,
							});
						} else {
							resolve(selections[selectedIndex]);
						}
						// Set to unavailable index to visually deselect.
						selectedIndex = -1;
						break;
				}

				// Update selection style based on new index.
				for (let i = 0; i < container.children.length; i++) {
					const child = container.children.item(i);
					child.className =
						i == selectedIndex ? "screen-prompt-selected" : "";
				}
			});
		});
	}

	/**
	 * Shows waiting animation until the passed in promise resolves.
	 * @param {Promise} promise
	 */
	wait(promise, options = {}) {
		// Cannot wait when muted.
		if (this.isMuted) {
			return;
		}

		const inline = options["inline"] ?? false;
		const cleanup = options["cleanup"] ?? true;

		const waitChars = ["\\", "-", "/", "|"];
		// Prints to the current section.
		const section = this._getCurrentSection();

		let elapsedTime = 0;

		// Create element and add to section.
		const waitEl = inline
			? document.createElement("span")
			: document.createElement("div");
		waitEl.className = "screen-wait";
		waitEl.textContent = waitChars[elapsedTime % 4];

		section.appendChild(waitEl);

		return new Promise(async (resolve) => {
			// Set up wait animation.
			const waitHandle = setInterval(() => {
				// Increase time elapsed and update element accordingly.
				elapsedTime++;
				waitEl.textContent = waitChars[elapsedTime % 4];
			}, 100);

			// Spin until passed in promise resolves. The wait animation
			// plays in the meanwhile.
			const promiseResult = await promise;

			// Stop wait animation by clearning the interval.
			clearInterval(waitHandle);

			// Remove the now standstill waiting animation element (if requested).
			if (cleanup) {
				waitEl.remove();
			}

			// Return control back to caller.
			// Returned is the result of the passed in promise.
			resolve(promiseResult);
		});
	}

	/**
	 * Shows waiting animation for the given time period.
	 * @param {number} time Time to wait. `10` => 1s.
	 */
	fakeWait(time, options = {}) {
		// Create a promise that resolves after the wait time is over.
		const promise = new Promise((resolve) => {
			setTimeout(
				() => {
					resolve();
				},
				// Multiply input time by 100 to make it in sync with the animation step.
				time * 100
			);
		});

		return this.wait(promise, options);
	}

	setMuted(muted) {
		this.isMuted = muted;
	}
}
