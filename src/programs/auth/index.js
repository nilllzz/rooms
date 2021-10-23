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

		let hasAccess = false;
		let hasGJAccess = await this.doGJAuth(user, pass);
		if (hasGJAccess === null) {
			hasAccess = await this.doPasswdAuth(user, pass);
		} else {
			hasAccess = hasGJAccess;
		}

		if (!hasAccess) {
			await this.screen.print(
				"INCORRECT CREDENTIALS\nPRESS ENTER TO RESET\n"
			);
			await this.screen.readLine();
			await Messaging.post({ instruction: "reset" }, false);
			return;
		}

		if (hasGJAccess) {
			await Messaging.post({
				instruction: "gjcreds",
				command: "sync-down",
				args: {},
			});
		}

		await Messaging.post(
			{
				instruction: "load",
				target: "chronos",
			},
			false
		);
	}

	async doPasswdAuth(user, pass) {
		console.log("do password auth");
		const keyInput = user + ":" + pass;
		const keyOutput = await Common.getHash(keyInput);

		// Check against passwd.
		const passwdContent = await Messaging.post({
			instruction: "io",
			command: "read",
			args: { path: ["SECRET", "PASSWD"] },
		});

		console.log(passwdContent, keyOutput);

		return keyOutput.toUpperCase() === passwdContent.toUpperCase();
	}

	async doGJAuth(user, pass) {
		const gjCreds = await Messaging.post({
			instruction: "gjcreds",
			command: "read",
			args: {},
		});

		if (!gjCreds.user || !gjCreds.pass) {
			return null;
		}
		return (
			gjCreds.user.toUpperCase() === user.toUpperCase() &&
			gjCreds.pass.toUpperCase() === pass.toUpperCase()
		);
	}
}

const __prg__auth = new PrgAuth();
__prg__auth.run();
