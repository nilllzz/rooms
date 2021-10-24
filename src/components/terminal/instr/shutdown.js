/**
 * Shuts down the machine.
 */
const __instr__shutdown__name = "SHUTDOWN";

Terminal.LOADED_INSTRUCTIONS[__instr__shutdown__name] = async function (
	prg,
	args
) {
	// TODO: check for unsaved IO changes to sync.
	await Messaging.post({
		instruction: "shutdown",
	});
};
