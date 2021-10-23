class GJCredsClass {
	username;
	token;
	userId;

	init() {
		const params = new URLSearchParams(window.location.search);

		this.username = params.get("gjapi_username");
		this.token = params.get("gjapi_token");
		this.userId = null;
	}

	async runCommand(command, _args) {
		switch (command) {
			case "read":
				return {
					user: this.username,
					pass: this.token,
				};
		}
	}

	async getUserId() {
		if (this.userId === null) {
			this.userId = await GJApi.getUserId(this.username);
		}

		return this.userId;
	}
}

const GJCreds = new GJCredsClass();
