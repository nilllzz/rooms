class NetClass {
	async runCommand(command, args) {
		switch (command) {
			// Downloads IO from current GJ user.
			case "sync-io-down":
				return this.syncIODown();
			// Uploads IO to the current GJ user.
			case "sync-io-up":
				return this.syncIOUp();
		}
	}

	async syncIODown() {
		const userId = await GJCreds.getUserId();
		const response = await GJApi.runCommand("data-store/get", {
			key: userId + "-chronos-io",
		});

		if (response.data.success === "true") {
			const ioData = response.data.data;
			IO.overwriteLS(JSON.parse(ioData));

			console.log("Synced CHRONOS IO data from GJ", response.data);

			return true;
		}

		return false;
	}

	async syncIOUp() {
		const userId = await GJCreds.getUserId();
		const response = await GJApi.runCommand("data-store/set", {
			key: userId + "-chronos-io",
			data: JSON.stringify(IO.data),
		});

		console.log("Synced CHRONOS IO data to GJ", response.data);

		return true;
	}
}

const Net = new NetClass();
