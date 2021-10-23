const API_id = 630471;
const API_key = "";
const API_url = "https://api.gamejolt.com/api/game/v1_2/";

class GJApiClass {
	async runCommand(command, args) {
		switch (command) {
			case "request":
				return this.executeRequest(args.endpoint, args.args);
			case "get-user-id":
				return this.getUserId(args.username);
			case "data-store/set":
				return this.executeRequest("data-store/set", {
					key: args.key,
					data: args.data,
				});
			case "data-store/get":
				return this.executeRequest("data-store", { key: args.key });
		}
	}

	async getUserId(username) {
		const response = await this.executeRequest("users", { username });

		const users = response.data.users;
		if (!users) {
			return 0;
		}

		const user = users[0];
		if (!user) {
			return 0;
		}

		return user.id;
	}

	async executeRequest(endpoint, args) {
		let url = API_url + endpoint;
		url += "?game_id=" + API_id;

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

		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open("POST", url);
			xhr.onload = () => {
				if (xhr.status !== 200) {
					reject({ status: xhr.status, data: null });
					return;
				}

				const responseJsonStr = xhr.response;
				const responseObj = JSON.parse(responseJsonStr);

				resolve({ status: xhr.status, data: responseObj.response });
			};
			xhr.setRequestHeader(
				"Content-type",
				"application/x-www-form-urlencoded"
			);
			xhr.send(xhrBody);
		});
	}
}

const GJApi = new GJApiClass();
