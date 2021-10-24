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
			const result = await this.screen.prompt([
				"LOGIN",
				"REDO",
				"RESET",
				"SHUTDOWN",
			]);

			if (result === "RESET") {
				await Messaging.post({ instruction: "reset" }, false);
				return;
			} else if (result === "SHUTDOWN") {
				await Messaging.post({ instruction: "shutdown" }, false);
				return;
			}

			redo = result === "REDO";
		} while (redo);

		let hasAccess = false;
		let hasGJAccess = await this.doGJAuth(user, pass);
		if (!hasGJAccess) {
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
			this.screen.clear();
			await this.screen.print("CONNECTING TO REMOTE ORIGIN\n" + user);

			const didSync = await this.screen.wait(
				Messaging.post({
					instruction: "net",
					command: "sync-io-down",
					args: {},
				}),
				{
					inline: true,
				}
			);

			await this.screen.print(
				"----------------------------------------",
				{ speed: 5 }
			);
			await this.screen.print("CONNECTED.");

			// If no down sync could be down, there is probably no data
			// on GJ for the current user. Sync up now.
			if (!didSync) {
				await this.screen.print(
					"----------------------------------------",
					{ speed: 5 }
				);
				await this.screen.print("SETTING UP ENVIRONMENT");
				await this.screen.wait(
					Messaging.post({
						instruction: "net",
						command: "sync-io-up",
						args: {},
					})
				);
			}

			await this.screen.print(
				"----------------------------------------",
				{ speed: 5 }
			);
			await this.screen.print("IMPORTANT:", {
				color: "white",
				speed: 50,
			});
			await this.screen.print(
				'TO SAVE DATA TO THE REMOTE ORIGIN,\nRUN "NET SYNC UP".',
				{
					color: "white",
					speed: 50,
				}
			);

			await this.screen.print(
				"----------------------------------------",
				{ speed: 5 }
			);
			await this.screen.print("\nPRESS ENTER TO CONTINUE");

			await this.screen.readLine();
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
		const keyInput = user + ":" + pass;
		const keyOutput = await Common.getHash(keyInput);

		// Check against passwd.
		const passwdContent = await Messaging.post({
			instruction: "io",
			command: "read",
			args: { path: ["SECRET", "PASSWD"] },
		});

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
