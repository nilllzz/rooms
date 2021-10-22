/**
 * The TOUCH program creates new empty files.
 */
const __instr__touch__name = "TOUCH";

Terminal.LOADED_INSTRUCTIONS[__instr__touch__name] = async function (
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
		command: "mk-file",
		args: { path },
	});

	return Common.IO.unparsePath(path);
};
