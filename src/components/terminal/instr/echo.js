/**
 * The ECHO program can be used by other programs to echo contents to the screen,
 * or to the next link in a chain.
 */
const __instr__echo__name = "ECHO";

Terminal.LOADED_INSTRUCTIONS[__instr__echo__name] = async function (prg, args) {
	// The echo instruction either prints to the screen when it's not muted,
	// or returns the input when it is (so it can be processed by the next instr).

	// Make sure we do have text.
	if (args.length < 0) {
		args.push("");
	}

	// Default speed is 10, but the 2nd arg can set it.
	let speed = 10;
	if (args.length >= 2) {
		speed = parseInt(args[1]);
	}

	let text = args[0];
	if (text === null || text === undefined) {
		text = "";
	} else {
		text = text.toString();
	}

	if (!prg.terminal.screen.isMuted) {
		await prg.terminal.screen.print(text, { speed });
	}

	return text.trim();
};
