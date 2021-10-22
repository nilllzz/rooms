const sscreen = new SScreen(document.getElementById("screen"));

async function init() {
	await sscreen.print("ENCOUNTERED FATAL ERROR!\n\n", {
		speed: 50,
		color: "red",
	});

	await sscreen.print(
		"YOU CAN TRY TO RESET THE MACHINE,\nOR POWER IT DOWN.\n\n",
		{ speed: 10 }
	);

	const result = await sscreen.prompt(["RESET", "POWER OFF"]);
	if (result == "POWER OFF") {
		Messaging.post({ instruction: "halt" }, false);
	} else {
		Messaging.post({ instruction: "reset" }, false);
	}
}
