/**
 * Loads the EDIT program to allow advanced multiline text file editing.
 */
const __instr__edit__name = "EDIT";

Terminal.LOADED_INSTRUCTIONS[__instr__edit__name] = async function (prg, args) {
	let file = "";
	if (args.length > 0) {
		file = args[0];
	}

	await Messaging.post({
		instruction: "load",
		target: "edit",
		access: { file },
	});
};
