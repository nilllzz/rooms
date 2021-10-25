/**
 * Allows interactions with the SCREEN.
 */
const __instr__screen__name = "SCREEN";

Terminal.LOADED_INSTRUCTIONS[__instr__screen__name] = async function (
	prg,
	args
) {
	if (args.length === 0) {
		return await prg.runInstruction("ECHO", [
			"SCREEN EXPECTS AT LEAST 1 ARG.\n",
		]);
	}

	const command = args[0];
	switch (command) {
		case "CLEAR":
			prg.terminal.screen.clear();
			return "";
		case "COLOR":
			let color = "reset";
			if (args.length >= 2) {
				color = args[1].toLowerCase();
			}
			if (color === "reset") {
				color = prg.terminal.screen.supportedColors[0];
			} else if (!prg.terminal.screen.supportedColors.includes(color)) {
				color = prg.terminal.screen.defaultColor;
			}

			prg.terminal.screen.defaultColor = color;
			return color;
	}

	return "";
};
