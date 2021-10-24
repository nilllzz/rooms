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

	async runCommand(command, args) {
		switch (command) {
			case "write":
				this.username = args.user;
				this.token = args.token;
				this.userId = args.id ?? null;
			// No break, return same as "read".
			case "read":
				return {
					user: this.username,
					pass: this.token,
					id: this.userId,
				};
			case "current-user-id":
				return this.userId;
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
