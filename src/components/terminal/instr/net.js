/**
 * The NET program gives access to basic network resources.
 */
const __instr__net__name = "NET";

Terminal.LOADED_INSTRUCTIONS[__instr__net__name] = async function (prg, args) {
	// 0 -> command, one of [scon,status,sync]

	if (args.length === 0) {
		return await prg.runInstruction("ECHO", ["NET EXPECTS A COMMAND.\n"]);
	}

	const command = args[0];
	const commandArgs = args.slice(1);

	switch (command) {
		case "DISCONNECT":
			return await __instr__net__command__disconnect(prg, commandArgs);
		case "SCON":
			return await __instr__net__command__scon(prg, commandArgs);
		case "STATUS":
			return await __instr__net__command__status(prg, commandArgs);
		case "SYNC":
			return await __instr__net__command__sync(prg, commandArgs);
		default:
			return await prg.runInstruction("ECHO", [
				command + "\nIS NOT A VALID COMMAND\n",
			]);
	}
};

async function __instr__net__command__disconnect(prg, args) {
	const creds = await Messaging.post({
		instruction: "gjcreds",
		command: "read",
		args: {},
	});
	if (!creds.id) {
		return await prg.runInstruction("ECHO", [
			"NOT CONNECTED TO REMOTE NETWORK\n",
		]);
	}

	await prg.runInstruction("ECHO", ["DISCONNECTING...\n"]);

	// Set user.
	await Messaging.post({
		instruction: "gjcreds",
		command: "write",
		args: { user: null, pass: null, id: null },
	});
	// Reload IO.
	await Messaging.post({
		instruction: "io",
		command: "load",
		args: {},
	});

	await prg.runInstruction("ECHO", ["DISCONNECTED.\n"]);
}

async function __instr__net__command__scon(prg, args) {
	if (args.length < 1) {
		return await prg.runInstruction("ECHO", [
			"THE SCON COMMAND REQUIRES ONE OR TWO ARGUMENTS:\n USER [AND PASS]\n",
		]);
	}

	await prg.runInstruction("ECHO", ["SECURE CONNECT (SCON)\n"]);

	let isLocal = true;

	let user = args[0];
	if (user.startsWith("REMOTE@")) {
		user = user.substr(7);
		isLocal = false;
	} else if (user.startsWith("LOCAL@")) {
		user = user.substr(6);
		isLocal = true;
	} else {
		return await prg.runInstruction("ECHO", [
			"PREFIX USER WITH NETWORK DESTINATION:\n" +
				" - LOCAL@<USER>  FOR LOCALNET\n" +
				" - REMOTE@<USER> FOR REMOTE ORIGIN",
		]);
	}

	await prg.runInstruction("ECHO", [
		"NET : " + (isLocal ? "LOCAL" : "REMOTE"),
	]);
	await prg.runInstruction("ECHO", ["USER: " + user]);

	let pass = null;
	if (args.length > 1) {
		pass = args[1];
		await prg.runInstruction("ECHO", ["PASS: " + "*".repeat(pass.length)]);
	} else {
		pass = await prg.terminal.screen.readLine({
			prompt: "PASS",
			password: true,
			length: 20,
		});
	}

	if (isLocal) {
		await prg.runInstruction("ECHO", ["CONNECTING TO LOCALNET: " + user]);

		await prg.runInstruction("ECHO", ["-AUTHENTICATING\n"]);

		const keyInput = user + ":" + pass;
		const keyOutput = await Common.getHash(keyInput);

		// Check against passwd.
		const passwdContent = await Messaging.post({
			instruction: "io",
			command: "read",
			args: { path: ["SECRET", "PASSWD"] },
		});

		const authed = keyOutput.toUpperCase() === passwdContent.toUpperCase();

		if (!authed) {
			return await prg.runInstruction("ECHO", [
				"FAILED AUTHENTICATION\n",
			]);
		}

		await prg.runInstruction("ECHO", ["-SWITCHING USER\n"]);

		// Disconnect.
		await Messaging.post({
			instruction: "gjcreds",
			command: "write",
			args: { user: null, pass: null, id: null },
		});
		// Reload IO.
		await Messaging.post({
			instruction: "io",
			command: "load",
			args: {},
		});

		return await prg.runInstruction("ECHO", ["CONNECTED TO LOCALNET\n"]);
	} else {
		await prg.runInstruction("ECHO", [
			"CONNECTING TO REMOTE ORIGIN: " + user,
		]);

		// Step 1: Check the passed in username/token for validity.
		await prg.runInstruction("ECHO", ["-AUTHENTICATING\n"]);
		const authed = await prg.terminal.screen.wait(
			Messaging.post({
				instruction: "gjapi",
				command: "check-auth",
				args: { user, pass },
			})
		);

		if (!authed) {
			return await prg.runInstruction("ECHO", [
				"FAILED AUTHENTICATION\n",
			]);
		}

		// Switch logged in user to the new one.
		await prg.runInstruction("ECHO", ["-SWITCHING USER\n"]);

		// First, get the user id for the new user.
		const userId = await prg.terminal.screen.wait(
			Messaging.post({
				instruction: "gjapi",
				command: "get-user-id",
				args: { username: user },
			})
		);
		// Check that we aren't already connected.
		const currentUserId = await Messaging.post({
			instruction: "gjcreds",
			command: "current-user-id",
		});
		if (userId === currentUserId) {
			await prg.runInstruction("ECHO", ["ERROR"]);
			return await prg.runInstruction("ECHO", [
				"ALREADY CONNECTED TO NETWORK WITH ID\n - " + userId,
			]);
		}

		// Then, set that id with the username and token to be the active user.
		await Messaging.post({
			instruction: "gjcreds",
			command: "write",
			args: { user, pass, id: userId },
		});

		// Now sync the chronos IO.
		await prg.runInstruction("ECHO", ["-SETTING UP ENVIRONMENT\n"]);

		const didSync = await prg.terminal.screen.wait(
			Messaging.post({
				instruction: "net",
				command: "sync-io-down",
				args: {},
			})
		);
		if (!didSync) {
			await prg.terminal.screen.wait(
				Messaging.post({
					instruction: "net",
					command: "sync-io-up",
					args: {},
				})
			);
			await prg.terminal.screen.wait(
				Messaging.post({
					instruction: "net",
					command: "sync-io-down",
					args: {},
				})
			);
		}

		return await prg.runInstruction("ECHO", [
			"CONNECTED TO NETWORK " + userId + "\n",
		]);
	}
}

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
