/**
 * Allows executing programs.
 */
const __instr__run__name = "RUN";

Terminal.LOADED_INSTRUCTIONS[__instr__run__name] = async function (prg, args) {
	// No arguments provided means there is nothing to run.
	if (args.length === 0) {
		return null;
	}

	const inputArg = args[0].trim();
	if (inputArg === "") {
		return null;
	}

	let programContent = inputArg;

	// Read program content from path instead of direct input.
	if (inputArg.startsWith("/")) {
		const path = Common.IO.parsePath(inputArg);
		programContent = await Messaging.post({
			instruction: "io",
			command: "read",
			args: { path },
		});
	}

	const programLines = programContent.split("\n");

	// Append additional args to this instruction to the end of the first line
	// of the new program.
	if (programLines.length > 0 && args.length > 1) {
		for (let i = 1; i < args.length; i++) {
			programLines[0] += " " + args[i];
		}
	}

	console.log(programLines);

	const newPrg = new UserProgram(prg.terminal, programLines);
	return newPrg.run();
};
