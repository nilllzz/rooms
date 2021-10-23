const API_id = 630471;
const API_key = "";
const API_url = "https://api.gamejolt.com/api/game/v1_2/";

class GJIntegrationClass {
	_username;
	_token;

	init() {
		const params = new URLSearchParams(window.location.search);

		this._username = params.get("gjapi_username");
		this._token = params.get("gjapi_token");
	}

	async runCommand(command, args) {
		switch (command) {
			case "read":
				return {
					user: this._username,
					pass: this._token,
				};
			case "sync-down":
				return await this.syncDown();
		}
	}

	async gjRequest(endpoint, args) {
		let url = API_url + endpoint;
		url += "?game_id=" + API_id;
		args.game_id = API_id;

		// Generate signature:
		let sigUrl = url;
		const sigArgs = [];
		for (const argName in args) {
			const argValue = args[argName];
			sigArgs.push(argName + argValue);
		}
		sigArgs.sort();
		const sigArgsStr = sigArgs.join("");
		sigUrl += sigArgsStr;
		sigUrl += API_key;

		const signature = await Common.getHash(sigUrl, "SHA-1");
		console.log(sigUrl, signature);

		// Get final POST url:
		url += "&signature=" + signature;

		// Get POST body:
		const xhrArgs = [];
		for (const argName in args) {
			const argValue = args[argName];
			xhrArgs.push(
				encodeURIComponent(argName) + "=" + encodeURIComponent(argValue)
			);
		}
		const xhrBody = xhrArgs.join("&");

		const xhr = new XMLHttpRequest();
		xhr.open("POST", url, false);
		xhr.send(xhrBody);

		console.log(xhrBody, xhr.status, xhr.response);
	}

	async syncDown() {
		// await this.gjRequest("data-store/set", { key: "test", data: "test" });
		await this.gjRequest("data-store/fetch/", { key: "test" });
	}
}

const GJIntegration = new GJIntegrationClass();
