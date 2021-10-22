/**
 * The RM program removes an existing file or directory.
 */
const __instr__rm__name = "RM";

Terminal.LOADED_INSTRUCTIONS[__instr__rm__name] = async function (prg, args) {
	let pathStr = "/";
	if (args.length > 0) {
		pathStr = args[0];
	}

	const path = Common.IO.parsePath(pathStr);

	await Messaging.post({
		instruction: "io",
		command: "remove",
		args: { path },
	});

	return Common.IO.unparsePath(path);
};
