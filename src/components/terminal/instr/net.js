/**
 * The NET program gives access to basic network resources.
 */
const __instr__net__name = "NET";

Terminal.LOADED_INSTRUCTIONS[__instr__net__name] = async function (prg, args) {
	// 0 -> command, one of [sync]

	if (args.length === 0) {
		return await prg.runInstruction("ECHO", ["NET EXPECTS A COMMAND.\n"]);
	}

	const validCommands = ["STATUS", "SYNC"];
	const command = args[0];

	if (!validCommands.includes(command)) {
		return await prg.runInstruction("ECHO", [
			command + "\nIS NOT A VALID COMMAND\n",
		]);
	}

	const commandArgs = args.slice(1);
	switch (command) {
		case "STATUS":
			return __instr__net__command__status(prg, commandArgs);
		case "SYNC":
			return __instr__net__command__sync(prg, commandArgs);
	}
};

async function __instr__net__command__status(prg, _args) {
	const creds = await Messaging.post({
		instruction: "gjcreds",
		command: "read",
		args: {},
	});

	let connection = "ROOT:LOCALNET";
	if (creds.id) {
		connection = creds.user + ":" + creds.id;
	}

	await prg.runInstruction("ECHO", ["CONNECTED TO\n" + connection + "\n"]);

	return connection;
}

async function __instr__net__command__sync(prg, args) {
	const creds = await Messaging.post({
		instruction: "gjcreds",
		command: "read",
		args: {},
	});
	if (!creds.id) {
		await prg.runInstruction("ECHO", [
			"CANNOT SYNC WHILE CONNECTED TO LOCALNET.\n",
		]);
		return null;
	}

	const directionArg = args[0];

	switch (directionArg) {
		case "UP":
		case "DOWN":
			await prg.terminal.screen.wait(
				Messaging.post({
					instruction: "net",
					command: "sync-io-" + directionArg.toLowerCase(),
					args: {},
				})
			);
			return await prg.runInstruction("ECHO", ["SYNC COMPLETE."]);
		default:
			return await prg.runInstruction("ECHO", [
				"INVALID SYNC DIRECTION\n" + directionArg,
			]);
			break;
	}
}
