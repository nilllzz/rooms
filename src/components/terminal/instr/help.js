const __instr__help__glossary = {
	RUN: "EXECUTES A PROGRAM.\nWITHOUT PARAMETERS EXECUTES THE\nCURRENT PROGRAM.",
	DOOR: "THE DOOR INSTRUCTION PROVIDES ACCESS TO A ROOM.\nROOMS MAY REQUIRE ACCESS KEYS.\nONLY ACCESS ROOMS YOU KNOW THE PURPOSE OF.\nEXAMPLE: `DOOR ROOM <ID>`",
	ROOM: "A ROOM IS A DYNAMICALLY LINKED ROGUE PROGRAM.\nIT IS ADVISED TO ONLY ACCESS ROOMS\nYOU KNOW THE PURPOSE OF.\nROOMS CAN BE ENTERED WITH THE 'DOOR' PROGRAM.",
	CLEAR: "DURING INPUT ALLOWS CLEARING THE SCREEN.",
};

const __instr__help__name = "HELP";

Terminal.LOADED_INSTRUCTIONS[__instr__help__name] = async function (prg, args) {
	let returnValue = null;

	// If no arguments were provided, echo the contents of the glossary instead.
	if (args.length < 1) {
		const helpSubjects = Object.keys(__instr__help__glossary);

		const text =
			"THE FOLLOWING HELP PAGES ARE AVAILABLE:\n\n" +
			helpSubjects.join(",") +
			"\n";

		returnValue = await prg.runInstruction("ECHO", [text]);
	}
	// Otherwise, echo the contents of the help glossary for the term (if exists).
	else {
		const term = args[0];

		await prg.terminal.screen.print(
			"SEARCHING HELP PAGES FOR TERM\n" + "'" + term + "'\n",
			{ speed: 10 }
		);

		await prg.terminal.screen.wait(7);

		const helpText = __instr__help__glossary[term] ?? null;
		if (helpText) {
			returnValue = await prg.runInstruction("ECHO", [
				"\n" + helpText + "\n",
			]);
		} else {
			returnValue = await prg.runInstruction("ECHO", [
				"NO HELP AVAILABLE FOR TERM\n",
			]);
		}
	}

	// Return directly if in headless mode.
	if (prg.terminal.screen.isMuted) {
		return returnValue;
	}

	const line = await prg.terminal.screen.readLine({
		cleanup: true,
		prompt: "?",
	});
	if (line == "" || line == "Q") {
		return returnValue;
	} else if (line == __instr__help__name) {
		return await prg.runInstruction(__instr__help__name, []);
	} else {
		return await prg.runInstruction(__instr__help__name, [line]);
	}
};
