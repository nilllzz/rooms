/**
 * The CAT program reads and returns the contents of a file.
 */
const __instr__cat__name = "CAT";

Terminal.LOADED_INSTRUCTIONS[__instr__cat__name] = async function (prg, args) {
	let pathStr = "/";
	if (args.length > 0) {
		pathStr = args[0];
	}

	const path = Common.IO.parsePath(pathStr);

	const response = await Messaging.post({
		instruction: "io",
		command: "read",
		args: { path },
	});

	const contents = response;

	// ECHO the contents.
	return await prg.runInstruction("ECHO", [contents]);
};
