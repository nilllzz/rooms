class PrgAuth {
	screen;

	constructor() {
		this.screen = new SScreen(document.getElementById("screen"));
	}

	async run() {
		let user = "";
		let pass = "";
		let redo = true;

		do {
			this.screen.clear();

			// prettier-ignore
			await this.screen.print(
                "                _____  _____ _______   __\n" +
                "          /\\   |  __ \\|  __ \\_   _\\ \\ / /\n" +
                "         /  \\  | |__) | |__) || |  \\ V / \n" +
                "        / /\\ \\ |  ___/|  ___/ | |   > <  \n" +
                "       / ____ \\| |    | |    _| |_ / . \\ \n" +
                "      /_/    \\_\\_|    |_|   |_____/_/ \\_\\\n" +            
                "\n"
            , { instant: true });

			await this.screen.print("                      AUTH\n\n\n");

			user = await this.screen.readLine({
				prompt: " USER",
				length: 20,
			});
			pass = await this.screen.readLine({
				prompt: " PASS",
				password: true,
				length: 20,
			});

			await this.screen.print("\n");
			const result = await this.screen.prompt(["LOGIN", "REDO", "RESET"]);

			redo = result === "REDO";
		} while (redo);

		// Create key from input.
		const keyInput = user + ":" + pass;
		const keyOutput = await Common.getHash(keyInput);

		// Check against passwd.
		const passwdContent = await Messaging.post({
			instruction: "io",
			command: "read",
			args: { path: ["SECRET", "PASSWD"] },
		});

		if (keyOutput.toUpperCase() !== passwdContent.toUpperCase()) {
			await this.screen.print(
				"INCORRECT CREDENTIALS\nPRESS ENTER TO RESET\n"
			);
			await this.screen.readLine();
			await Messaging.post({ instruction: "reset" }, false);
			return;
		}

		await Messaging.post(
			{
				instruction: "load",
				target: "chronos",
			},
			false
		);
	}
}

const __prg__auth = new PrgAuth();
__prg__auth.run();
