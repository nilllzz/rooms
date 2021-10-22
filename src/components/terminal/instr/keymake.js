/**
 * Creates keys that can be used to open rooms using the DOOR program.
 */
const __instr__keymake__name = "KEYMAKE";

Terminal.LOADED_INSTRUCTIONS[__instr__keymake__name] = async function (
	prg,
	args
) {
	// An empty input produces an empty output.
	if (args.length < 1) {
		return "";
	}
	const input = args[0];
	if (input == "") {
		return "";
	}

	let key = await Common.getHash(input);
	key = key.toUpperCase();

	// Echo the key.
	return await prg.runInstruction("ECHO", [key]);
};
