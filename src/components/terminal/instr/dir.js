/**
 * The DIR program allows the user to pick a directory or file,
 * which is returned to the next program.
 */
const __instr__dir__name = "DIR";

Terminal.LOADED_INSTRUCTIONS[__instr__dir__name] = async function (prg, args) {
	let pathStr = "/";
	if (args.length > 0) {
		pathStr = args[0];
	}

	const path = Common.IO.parsePath(pathStr);

	// The DIR program has to output to the screen, even if we are currently muted.
	// Unmute the screen during the execution of DIR, and then mute it again before returning.
	const enteredHeadless = prg.terminal.screen.isMuted;
	if (enteredHeadless) {
		prg.terminal.screen.setMuted(false);
	}

	prg.terminal.screen.clear();
	await prg.terminal.screen.print(
		"CURRENT DIRECTORY: " + Common.IO.unparsePath(path) + "\n"
	);

	const response = await Messaging.post({
		instruction: "io",
		command: "list",
		args: { path },
	});
	const list = response;

	const listTextItems = list.map((i) => (i.t === "d" ? "/" + i.n : i.n));
	listTextItems.unshift(".", "..");

	const initial = Math.min(2, listTextItems.length - 1);
	const result = await prg.terminal.screen.prompt(listTextItems, {
		initial,
		"with-index": true,
	});

	// . means "exit DIR with this directory selected".
	if (result.option == ".") {
		if (enteredHeadless) {
			prg.terminal.screen.setMuted(true);
		}
		return Common.IO.unparsePath(path);
	}
	// .. means "go up one level and run DIR again with that new path".
	else if (result.option == "..") {
		path.pop();
		const newPathStr = Common.IO.unparsePath(path);
		if (enteredHeadless) {
			prg.terminal.screen.setMuted(true);
		}
		return await prg.runInstruction("DIR", [newPathStr]);
	}
	// Any other item means the user select a file/directory.
	// For a file, return it.
	// For a directory, open it in DIR.
	else {
		const selected = list[result.index - 2];

		const newPathStr = Common.IO.unparsePath(path) + "/" + selected.n;

		// Return for selected file.
		if (selected.t == "f") {
			if (enteredHeadless) {
				prg.terminal.screen.setMuted(true);
			}
			return newPathStr;
		}

		// Open DIR for selected directory.
		if (enteredHeadless) {
			prg.terminal.screen.setMuted(true);
		}
		return await prg.runInstruction("DIR", [newPathStr]);
	}
};
