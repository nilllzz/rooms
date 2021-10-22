/**
 * The WRITE program writes contents to a file.
 */
const __instr__write__name = "WRITE";

Terminal.LOADED_INSTRUCTIONS[__instr__write__name] = async function (
	prg,
	args
) {
	let pathStr = "/";
	if (args.length > 0) {
		pathStr = args[0];
	}
	let contents = "";
	if (args.length > 1) {
		contents = args[1];
	}

	const path = Common.IO.parsePath(pathStr);

	await Messaging.post({
		instruction: "io",
		command: "write",
		args: { path, contents },
	});

	return contents;
};
