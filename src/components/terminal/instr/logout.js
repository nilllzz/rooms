/**
 * Destroys the current CHRONOS session and returns to the AUTH program.
 */
const __instr__logout__name = "LOGOUT";

Terminal.LOADED_INSTRUCTIONS[__instr__logout__name] = async function (
	prg,
	args
) {
	await prg.runInstruction("ECHO", ["GOODBYE!\n"]);
	await prg.terminal.screen.readLine({
		prompt: "PRESS ENTER TO LOG OUT",
	});

	await Messaging.post({
		instruction: "load",
		target: "auth",
	});
};
