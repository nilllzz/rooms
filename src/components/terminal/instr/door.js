/**
 * The DOOR program allows access to ROOMs using a key.
 */
const __instr__door__name = "DOOR";

Terminal.LOADED_INSTRUCTIONS[__instr__door__name] = async function (prg, args) {
	// 0 -> "room"
	// 1 -> room name
	// [2 -> key contents]

	if (args.length < 2) {
		return await prg.runInstruction("ECHO", ["DOOR EXPECTS 2-3 ARGS.\n"]);
	}

	const targetType = args[0];
	if (targetType != "ROOM") {
		return await prg.runInstruction("ECHO", ["CANNOT OPEN TARGET.\n"]);
	}

	const roomName = args[1].substr(0, 12);
	const keyContents = args[2] ?? "";

	let roomNameText = roomName;
	while (roomNameText.length < 12) {
		if (roomNameText.length % 2 == 0) {
			roomNameText = " " + roomNameText;
		} else {
			roomNameText += " ";
		}
	}

	// prettier-ignore
	await prg.terminal.screen.print(
        "   ┌────────────┐\n" + 
        "   │            │\n" + 
        "   │" + roomNameText + "│\n" + 
        "   │            │\n" + 
        "   │            │\n" + 
        "   │            │\n" + 
        "   │ ╠═         │\n" + 
        "   │            │\n" + 
        "   │            │\n" + 
        "   │            │\n" + 
        "   │            │\n" + 
        "   └────────────┘\n\n",
    { speed: 1 });

	if (keyContents) {
		let keyText = keyContents;
		if (keyText.length > 24) {
			keyText = keyText.substr(0, 24) + "...";
		}
		await prg.terminal.screen.print("KEY: " + keyText + "\n");
	}

	await prg.terminal.screen.print("OPEN THIS DOOR?");
	const result = await prg.terminal.screen.prompt(["YES", "NO"]);

	if (result == "NO") {
		return null;
	}

	await Messaging.post({
		instruction: "load",
		target: "rooms/" + roomName,
		access: { key: keyContents },
	});

	return roomName;
};
