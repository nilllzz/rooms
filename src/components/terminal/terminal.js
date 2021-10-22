/**
 * Needed instructions:
 * - move file
 * - change directory
 */

class Terminal {
	static TERMINAL_NAME = "CHRONOS";
	static TERMINAL_VERS = "V10.4";
	static TERMINAL_COPY = "APPIX SYSTEMS TECHNOLOGIES INC. ©1984";
	static TERMINAL_COMP = "COMPILED 1984-11-06 04:18:00";

	/**
	 * Caches loaded instructions from JS files.
	 *
	 * @type {Object.<string,function(UserProgram,any[]):any>}
	 */
	static LOADED_INSTRUCTIONS = {};

	/**
	 * @type {SScreen}
	 */
	screen;

	/**
	 * Constructs a new Terminal with a screen targeting the input element.
	 * @param {HTMLElement} screenEl
	 */
	constructor(screenEl) {
		this.screen = new SScreen(screenEl);
	}

	/**
	 * @param {string[]} programInput
	 */
	async init(programInput = []) {
		while (true) {
			this.screen.clear();

			// When no previous input is available, print copyright info.
			if (programInput.length == 0) {
				await this.screen.print(
					Terminal.TERMINAL_NAME +
						" " +
						Terminal.TERMINAL_VERS +
						"\n" +
						Terminal.TERMINAL_COPY +
						"\n" +
						Terminal.TERMINAL_COMP +
						"\n" +
						"\n",
					{ speed: 10 }
				);

				await this.screen.print("RAM................16384B", {
					speed: 15,
				});
				await this.screen.print("INPUT..............OK", { speed: 15 });
				await this.screen.print("\n", { speed: 15 });
			}

			const prg = await UserProgram.createFromScreenRead(
				this,
				programInput
			);

			try {
				await this._runProgram(prg);
			} catch (error) {
				console.debug("Caught program execution error", error);
				// Unmute here so we can properly continue with the error message.
				this.screen.setMuted(false);
				this.screen.clear();

				if (error instanceof InterruptError) {
					await this.screen.print(
						"^C PROGRAM TERMINATED BY USER.\n\n"
					);
				} else if (error instanceof UnknownInstructionError) {
					await this._printError("UNKNOWN INSTR ERROR", {
						instr: "`" + error.instr + "`",
					});
				} else if (error instanceof InvokeError) {
					await this._printError("SYSTEM INVOKE ERROR", {
						type: error.prevName,
						msg: error.prevMessage,
						data: JSON.stringify(error.data),
					});
				} else if (error instanceof UserSyntaxError) {
					await this._printError("SYNTAX ERROR", {
						msg: error.message,
						line: (error.lineNum * 10).toString(),
						code: "`" + error.line + "`",
					});
				}
			}

			programInput = await this._programCleanup(prg.lines);
		}
	}

	/**
	 * Prints a user program error to the screen.
	 * @param {string} title
	 * @param {Object.<string,string>} details
	 */
	async _printError(title, details = {}) {
		// Print error title in box-like design
		const titleTop = "╭" + "─".repeat(title.length) + "╮\n";
		await this.screen.print(titleTop);
		const titleText = " " + title + " \n";
		await this.screen.print(titleText, { color: "red" });
		const titleBottom = "╰" + "─".repeat(title.length) + "╯\n";
		await this.screen.print(titleBottom);

		// Print error details below (if given).
		const detailKeys = Object.keys(details);
		if (detailKeys.length > 0) {
			// Get longest length of detail keys to pad others.
			const len = Math.max(...detailKeys.map((i) => i.length));

			for (const detailKey of detailKeys) {
				const detailKeyText = detailKey.padEnd(len, " ").toUpperCase();
				await this.screen.print(
					detailKeyText + ": " + details[detailKey] + "\n"
				);
			}

			await this.screen.print("\n");
		}
	}

	/**
	 * Executes a user program in this terminal.
	 * @param {UserProgram} prg
	 */
	async _runProgram(prg) {
		this.screen.clear();

		await this.screen.print("EXECUTING PROGRAM...\n\n", { speed: 10 });

		await prg.run();

		await this.screen.print("\nPROGRAM EXECUTION COMPLETED\n\n", {
			speed: 10,
		});
	}

	/**
	 * Prompts the user after the user program execution finished.
	 *
	 * @param {string[]} lines
	 * @return {Promise<string[]>}
	 */
	async _programCleanup(lines) {
		const result = await this.screen.prompt(["EXIT", "CONTINUE"]);
		let programInput = [];
		if (result == "CONTINUE") {
			programInput = lines;
		}

		return programInput;
	}

	/**
	 * Instructs the terminal to load an instruction.
	 * @param {string} instruction The instruction name.
	 * @return {Promise<function(UserProgram,any[]):any>} The instruction function.
	 */
	async loadInstruction(instruction) {
		// If the requested instruction is not yet loaded, try to load it now.
		if (!Terminal.LOADED_INSTRUCTIONS[instruction]) {
			await new Promise((resolve, reject) => {
				// Create new script element to append to the doc, which will load in its source.
				const scriptEl = document.createElement("script");
				// Handle successful append and load.
				scriptEl.onload = () => {
					console.debug("Loaded instruction", instruction);
					scriptEl.remove();
					resolve();
				};
				// Handle failure (instruction does not exist or cannot be accessed.)
				scriptEl.onerror = () => {
					console.debug("Failed to load instruction", instruction);
					scriptEl.remove();
					reject(new UnknownInstructionError(instruction));
				};

				// Add src and append.
				// Find the source path to the instructions list from the current program location.
				// Step backwards until SRC is reached, from there walk into the instr dir.
				let src =
					"components/terminal/instr/" +
					instruction.toLowerCase() +
					".js";

				let locPath = location.pathname.split("/");
				locPath.pop(); // Removes "index.html"/file entry.

				while (
					locPath[locPath.length - 1] !== "programs" &&
					locPath.length > 0
				) {
					locPath.pop();
					src = "../" + src;
				}

				// Walk up once more.
				locPath.pop();
				src = "../" + src;

				scriptEl.src = src;
				document.body.appendChild(scriptEl);
			});
		}

		// Return the instruction function after it loaded.
		if (Terminal.LOADED_INSTRUCTIONS[instruction]) {
			return Terminal.LOADED_INSTRUCTIONS[instruction];
		}

		// Failsafe (this should never happen as the failure to load throws as well).
		throw new UnknownInstructionError(instruction);
	}
}

/**
 * Program written by a user that can be executed in a terminal.
 */
class UserProgram {
	/**
	 * This program's name (`"INLINE"` for programs directly written in the terminal).
	 * @type {string}
	 */
	name;
	/**
	 * Parent terminal this program was created in.
	 * @type {Terminal}
	 */
	terminal;
	/**
	 * Lines of program code of this program.
	 * @type {string[]}
	 */
	lines;

	/**
	 * Gets set when the user interrupts the execution of this program.
	 */
	_interruptFlag = false;

	/**
	 * @param {Terminal} terminal
	 * @param {string[]} lines
	 */
	constructor(terminal, lines) {
		this.terminal = terminal;
		this.lines = lines;
	}

	/**
	 * Creates a user program by prompting the user for input, then creates a program from it.
	 * @param {Terminal} terminal
	 * @param {string[]} input Previous input the read should start with.
	 */
	static async createFromScreenRead(terminal, input = []) {
		const lines = await terminal.screen.read(input);
		const prg = new this(terminal, lines);
		prg.name = "INLINE";
		return prg;
	}

	/**
	 * Executes this program.
	 * @return {Promise<any>} Returns the result of the last instruction of this program.
	 * @throws Throws various errors when failures during execution arise.
	 */
	async run() {
		// Set up interruption handler.
		const interruptCallback = this._checkInterrupt.bind(this);
		document.addEventListener("keydown", interruptCallback);

		try {
			return await this._runCode();
		} catch (error) {
			// Rethrow any errors that arise during code execution.
			// This try...catch is here so we can finally the event listener removal.
			throw error;
		} finally {
			// Remove interruption handler.
			document.removeEventListener("keydown", interruptCallback);
		}
	}

	/**
	 * Runs this program's code.
	 * @return {Promise<any>} Returns the result of the last instruction of this program.
	 */
	async _runCode() {
		let cursor = 0;
		let lastReturn = null;

		while (cursor < this.lines.length) {
			const line = this.lines[cursor];
			// Advance cursor to next line.
			cursor++;

			// Skip empty line.
			if (line == "") {
				continue;
			}

			const chain = this._parseLine(line, cursor);
			let lastChainReturn = null;

			for (let i = 0; i < chain.length; i++) {
				const link = chain[i];

				// When it's not the last part of the chain, mute the screen.
				this.terminal.screen.setMuted(i < chain.length - 1);

				const instrName = link.instr;
				const instrArgs = link.args;

				// When we are in the chain and have received a return from a previous
				// instr, append it to the next instr's args.
				if (lastChainReturn !== null) {
					instrArgs.push(lastChainReturn);
				}

				// Run the instr.
				lastChainReturn = await this.runInstruction(
					instrName,
					instrArgs
				);
			}

			lastReturn = lastChainReturn;
		}

		return lastReturn;
	}

	/**
	 * Parses a line into a chain of instructions with args.
	 * @param {string} line
	 * @param {number} lineNum
	 * @return {{instr:string,args:string[]}[]}
	 */
	_parseLine(line, lineNum) {
		line = line.trim();

		// Cannot have these characters at start/end.
		if (
			line.startsWith(">") ||
			line.startsWith('"') ||
			line.endsWith(">")
		) {
			throw new UserSyntaxError("INVALID CONTROL CHAR", line, lineNum);
		}

		const chain = [];

		let cursor = 0;

		let isQuoted = false;

		let current = "";
		let isInstr = true;
		let instrName = "";
		let instrArgs = [];
		let acceptEmptyArg = false;

		const pushCurrentLink = () => {
			// When still parsing instr, finish it now.
			if (isInstr) {
				finishInstr();
			}
			// Otherwise, push the current arg.
			else {
				pushArg();
			}

			// Push when at least an instr was parsed.
			instrName = instrName.trim();
			if (instrName) {
				chain.push({
					instr: instrName,
					args: instrArgs,
				});
			}

			// Reset state.
			instrName = "";
			instrArgs = [];
			current = "";
			isInstr = true;
			acceptEmptyArg = false;
		};

		const pushArg = () => {
			if (current.length > 0 || acceptEmptyArg) {
				instrArgs.push(current);
				current = "";
			}

			acceptEmptyArg = false;
		};

		const finishInstr = () => {
			isInstr = false;
			instrName = current.trim();
			current = "";

			instrArgs = [];

			// Special handling for files.
			// The "write" command can be omitted, for any consecutive links in a chain,
			// and a file target is identified as starting with "/".
			if (instrName.startsWith("/")) {
				// This is a syntax error when done as the first link in a chain.
				if (chain.length == 0) {
					throw new UserSyntaxError(
						"INVALID FILENAME AT POS 0",
						line,
						lineNum
					);
				}

				instrArgs.push(instrName);
				instrName = "WRITE";
			}

			// Make sure the instr name is valid.
			if (!/^[a-zA-Z0-9]{2,16}$/.test(instrName)) {
				throw new UserSyntaxError("INVALID INSTR NAME", line, lineNum);
			}
		};

		while (cursor < line.length) {
			const c = line[cursor];

			cursor++;

			if (isQuoted) {
				// At the end of a quote, the arg ends. Push it.
				if (c == '"') {
					isQuoted = false;
					acceptEmptyArg = true; // An arg like `""` can be accepted here.
					pushArg();
				}
				// While quoted, keep concatenating any chars.
				else {
					current += c;
				}
				// Ignore any other logic.
				continue;
			}

			switch (c) {
				case '"':
					// Quotes during instr name is a syntax error.
					if (isInstr) {
						throw new UserSyntaxError(
							"QUOTES IN INSTR NAME",
							line,
							lineNum
						);
					}
					isQuoted = true;
					break;

				case " ":
					// Ignore any spaces before the first real char.
					if (current == "") {
						break;
					}

					// First space in chain link finishes instruction.
					if (isInstr) {
						finishInstr();
						break;
					}

					// End of arg.
					pushArg();
					break;

				case ">":
					pushCurrentLink();
					break;

				default:
					current += c;
					break;
			}
		}

		// Throw syntax error when last quote was not closed.
		if (isQuoted) {
			throw new UserSyntaxError("NO END QUOTE", line, lineNum);
		}

		pushCurrentLink();

		return chain;
	}

	/**
	 * Runs an instruction within the program.
	 * @param {string} instruction The instruction name.
	 * @param {any[]} args Arguments to be passed to the instruction.
	 * @return {Promise<any>} The result of the run instruction.
	 */
	async runInstruction(instruction, args) {
		// When the user interrupted the program during the last instruction, throw now.
		if (this._interruptFlag) {
			throw new InterruptError();
		}

		// Load instruction and execute.
		const instr = await this.terminal.loadInstruction(instruction);
		return instr(this, args);
	}

	/**
	 * Interrupt check that reacts on keyboard input.
	 * Interrupts the program when user presses CTRL+C.
	 * @param {KeyboardEvent} e
	 */
	_checkInterrupt(e) {
		if (!this._interruptFlag && e.key == "c" && e.ctrlKey) {
			console.debug("User program interrupt", this.name);
			this._interruptFlag = true;
		}
	}
}

class InterruptError extends Error {
	constructor() {
		super("User interrupt received");

		this.name = "InterruptError";
	}
}

class UnknownInstructionError extends Error {
	instr;

	constructor(instr) {
		super("Instr '" + instr + "' unknown");

		this.name = "UnknownInstructionError";
		this.instr = instr;
	}
}

class UserSyntaxError extends Error {
	/** @type {string} */
	line;
	/** @type {number} */
	lineNum;

	/**
	 * @param {string} message
	 * @param {string} line
	 * @param {number} lineNum
	 */
	constructor(message, line, lineNum) {
		super(message);

		this.name = "SyntaxError";
		this.line = line;
		this.lineNum = lineNum;
	}
}
