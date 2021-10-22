/**
 * The MKDIR program creates a new directory.
 */
const __instr__mkdir__name = "MKDIR";

Terminal.LOADED_INSTRUCTIONS[__instr__mkdir__name] = async function (
	prg,
	args
) {
	let pathStr = "/";
	if (args.length > 0) {
		pathStr = args[0];
	}

	const path = Common.IO.parsePath(pathStr);

	await Messaging.post({
		instruction: "io",
		command: "mk-dir",
		args: { path },
	});

	return Common.IO.unparsePath(path);
};
